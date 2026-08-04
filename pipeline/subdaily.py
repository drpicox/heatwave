"""Temperatura de bulb humit, a partir de les dades semihoràries.

Per què cal baixar el semihorari havent-hi dades diàries: el bulb humit depèn de
la temperatura i la humitat **al mateix instant**, i el que interessa és la punta
del dia. Estimar-lo des dels resums diaris s'ha mesurat contra la veritat d'un
estiu sencer de Badalona, i el millor dels tres mètodes possibles subestima
0,8 °C de mitjana i falla fins a 4,1 °C. Per a una mètrica que existeix per
comptar dies per damunt de 26, 28 o 31 °C, això desplaça el recompte sencer.

El cost és la descàrrega: unes 54 milions de files. Per això va **per trossos**,
un fitxer per (variable, any, mes), i cada tros que ja hi és no es torna a
baixar. Es pot aturar i reprendre les vegades que calgui, es pot esborrar
`cache/subdaily/` sencer, i afegir anys més endavant només afegeix fitxers.

Només maig–octubre: s'ha comprovat que en tot l'històric i totes les estacions no
hi ha ni un sol dia amb bulb humit estimat >= 24 °C fora d'aquests mesos, i que
el percentil 99,9 de l'abril es queda a 19,2 °C. No és una retallada, és el
període on el fenomen existeix.
"""

from __future__ import annotations

import calendar
import datetime as dt

import numpy as np
import pandas as pd

from . import config

DS = config.DS_SUBDAILY
V_TEMP = "32"   # a nzvn-apee el codi de variable es TEXT, no numeric
V_HUM = "33"
MESOS = (5, 6, 7, 8, 9, 10)
PRIMER_ANY = 2009     # el semihorari no va mes enrere
SELECT = "codi_estacio,data_lectura,valor_lectura,codi_estat"

# `codi_estat` es la mateixa trampa que el camp `estat` de les dades diaries,
# i hi vaig tornar a caure: filtrant per codi_estat='V' dins la consulta, el
# 2024 tornava UNA fila. Aquell any el camp no esta omplert (273.145 lectures
# amb el camp buit i una sola amb 'V'), i el filtre les llencava totes en
# silenci -- amb el comptador de verificacio dient que tot anava be, perque el
# count() portava el mateix filtre.
#
# Ara es baixa tot i es filtra aqui, de manera que els numeros son auditables i
# un canvi de codificacio a la font no pot buidar un any sense que es noti.
ESTAT_BO = {"V", ""}

CACHE = config.CACHE / "subdaily"


def _path(var: str, year: int, month: int):
    return CACHE / f"{var}-{year}-{month:02d}.parquet"


def _where(var: str, year: int, month: int) -> str:
    ultim = calendar.monthrange(year, month)[1]
    return (
        f"codi_variable='{var}' and "
        f"data_lectura between '{year}-{month:02d}-01T00:00:00' "
        f"and '{year}-{month:02d}-{ultim}T23:59:59'"
    )


def stull(t, rh):
    """Temperatura de bulb humit (Stull 2011), en graus.

    Aproximacio empirica valida per a HR entre 5 i 99% i T entre -20 i 50 °C a
    pressio estandard. Es la que fan servir servei i literatura per a aquest
    tipus d'index; l'alternativa exacta demana resoldre una equacio implicita i
    no aporta res a aquesta escala.
    """
    rh = np.clip(rh, 5.0, 99.0)
    return (
        t * np.arctan(0.151977 * np.sqrt(rh + 8.313659))
        + np.arctan(t + rh)
        - np.arctan(rh - 1.676331)
        + 0.00391838 * rh ** 1.5 * np.arctan(0.023101 * rh)
        - 4.686035
    )


def fetch_chunk(client, var: str, year: int, month: int, force: bool = False) -> int:
    """Baixa un tros i el deixa al cache. Si ja hi es, no fa res."""
    path = _path(var, year, month)
    if path.exists() and not force:
        return -1

    where = _where(var, year, month)
    expected = client.count(DS, where)
    frames = []
    for page in client.csv_pages(DS, SELECT, where, expected):
        frames.append(pd.DataFrame(page))

    if frames:
        df = pd.concat(frames, ignore_index=True)
        df["ts"] = pd.to_datetime(df["data_lectura"])
        df["valor"] = pd.to_numeric(df["valor_lectura"], errors="coerce").astype("float64")
        estat = df["codi_estat"].fillna("").astype(str)
        bo = estat.isin(ESTAT_BO)
        # Si el filtre s'emporta mes d'una lectura de cada cinc, la codificacio
        # ha canviat i cal mirar-s'ho, no continuar com si res.
        if len(df) and (~bo).mean() > 0.2:
            dolents = estat[~bo].value_counts().head(5).to_dict()
            raise RuntimeError(
                f"{var} {year}-{month:02d}: el filtre de `codi_estat` descartaria "
                f"{(~bo).mean():.0%} de les lectures ({dolents}). Mira que signifiquen "
                "aquests codis abans de continuar."
            )
        df = df[bo]
        df = df[["codi_estacio", "ts", "valor"]].dropna(subset=["valor"])
    else:
        # Amb tipus explicits. Un tros buit sense tipus contamina el
        # concat: la columna d'instants passa a ser d'objectes i despres
        # `.dt` no existeix. Es el que buidava el 2026, on el setembre i
        # l'octubre encara no han arribat.
        df = pd.DataFrame({
            "codi_estacio": pd.Series(dtype="object"),
            "ts": pd.Series(dtype="datetime64[us]"),
            "valor": pd.Series(dtype="float64"),
        })

    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
    return len(df)


def plan(years) -> list[tuple[str, int, int]]:
    """Trossos que falten, en ordre. Serveix per saber que queda per fer."""
    out = []
    for year in years:
        for month in MESOS:
            for var in (V_TEMP, V_HUM):
                if not _path(var, year, month).exists():
                    out.append((var, year, month))
    return out


def download(client, years, log=print, force: bool = False) -> dict:
    total = 0
    pendents = plan(years) if not force else [
        (v, y, m) for y in years for m in MESOS for v in (V_TEMP, V_HUM)
    ]
    log(f"  {len(pendents)} trossos per baixar "
        f"(cada tros = una variable, un mes, totes les estacions)")
    for k, (var, year, month) in enumerate(pendents, 1):
        n = fetch_chunk(client, var, year, month, force=force)
        total += max(0, n)
        log(f"  [{k:>4}/{len(pendents)}] {var} {year}-{month:02d}: {max(0, n):>7,} files")
    return {"chunks": len(pendents), "rows": total}


def build_daily(years, log=print) -> int:
    """Creua T i HR del mateix instant i en treu el bulb humit maxim de cada dia.

    El resultat es guarda amb el mateix format que qualsevol altra variable
    diaria, de manera que la resta del pipeline no s'ha d'assabentar de res.
    """
    escrits = 0
    for year in years:
        t_parts, h_parts = [], []
        for month in MESOS:
            pt, ph = _path(V_TEMP, year, month), _path(V_HUM, year, month)
            if pt.exists():
                t_parts.append(pd.read_parquet(pt))
            if ph.exists():
                h_parts.append(pd.read_parquet(ph))
        if not t_parts or not h_parts:
            continue

        t = pd.concat(t_parts, ignore_index=True).rename(columns={"valor": "t"})
        h = pd.concat(h_parts, ignore_index=True).rename(columns={"valor": "rh"})
        # Cinturo i tirants: encara que un tros antic del cache vingui sense
        # tipus, aqui els instants tornen a ser instants.
        for df in (t, h):
            df["ts"] = pd.to_datetime(df["ts"])
        # La clau es (estacio, instant): nomes serveixen les parelles simultanies.
        j = t.merge(h, on=["codi_estacio", "ts"], how="inner")
        if j.empty:
            continue
        # astype explicit: si un tros ha arribat buit, la columna es d'objectes
        # i numpy no hi sap fer l'arrel quadrada.
        j["wb"] = stull(j["t"].to_numpy(dtype="float64"),
                        j["rh"].to_numpy(dtype="float64"))
        j["data"] = j["ts"].dt.normalize()

        diari = (j.groupby(["codi_estacio", "data"], as_index=False)
                   .agg(valor=("wb", "max"), lectures=("wb", "size")))
        # Un dia amb quatre lectures no dona la punta del dia. Amb base
        # semihoraria n'hi hauria d'haver 48; se n'exigeixen 36.
        diari = diari[diari["lectures"] >= 36].drop(columns=["lectures"])
        diari["estat"] = pd.Series(["Representatiu"] * len(diari), dtype="category")

        out = config.DAILY_CACHE / f"wb-{year}.parquet"
        out.parent.mkdir(parents=True, exist_ok=True)
        diari[["codi_estacio", "data", "valor", "estat"]].to_parquet(out, index=False)
        escrits += 1
        log(f"  {year}: {len(diari):>7,} dies-estacio amb bulb humit")
    return escrits


def anys_disponibles() -> list[int]:
    ara = dt.date.today().year
    return list(range(PRIMER_ANY, ara + 1))
