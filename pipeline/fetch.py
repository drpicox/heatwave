"""Descarrega les dades diaries de la XEMA i les deixa al cache local.

El cache esta indexat per (variable, any): `cache/daily/tn-2024.parquet`. Aixo
vol dir que afegir una variable nova despres no obliga a tornar a baixar les que
ja tenim, i que el refresc setmanal nomes toca els anys oberts.
"""

from __future__ import annotations

import datetime as dt

import pandas as pd

from . import config
from .socrata import Client, EmptyResponse

# `estat` es baixa i es guarda al cache encara que ocupi, perque la decisio de
# que es descarta ha de ser auditable sense tornar a demanar res a l'API.
SELECT = "codi_estacio,data_lectura,valor,estat"

REPRESENTATIVE = "Representatiu"
NOT_REPRESENTATIVE = "No representatiu"
# Valors del camp `estat` que sabem interpretar. Qualsevol altre atura el
# pipeline: si el Meteocat n'introdueix un de nou, volem decidir-ho nosaltres i
# no que una grafica canvii sola.
KNOWN_ESTAT = {REPRESENTATIVE, NOT_REPRESENTATIVE, ""}


def _path(short: str, year: int):
    return config.DAILY_CACHE / f"{short}-{year}.parquet"


def _where(variable: int, year: int) -> str:
    return (
        f"codi_variable={variable} and "
        f"data_lectura between '{year}-01-01T00:00:00' and '{year}-12-31T23:59:59'"
    )


def check_estat(client: Client, year: int, allow_unknown: bool = False) -> dict:
    """Vigila que el camp `estat` no guanyi valors nous sense que ens n'assabentem.

    El que s'ha observat a la font, i com es tracta cada cas:

    * `Representatiu` -- el gruix. Es fa servir.
    * `No representatiu` -- dies en que l'extrem diari s'ha calculat sobre un dia
      incomplet. Porten valor, i el valor es dolent: hi ha minimes diaries
      registrades a les 11:29 del mati a estacions d'alta muntanya a l'hivern.
      Es descarten.
    * buit -- entre el 27 i el 29 de juny de 2025 gairebe tota la xarxa te el
      camp sense omplir. Els valors d'aquells tres dies son continus amb els dels
      dies del voltant, aixi que es un forat administratiu i no de dades:
      descartar-los obriria un buit de tres dies a mitja onada de calor. Es fan
      servir, pero es compten a meta.json.

    Qualsevol altre valor atura el pipeline.
    """
    variables = ",".join(str(v) for v in config.VARIABLES)
    where = (
        f"codi_variable in ({variables}) and "
        f"data_lectura between '{year}-01-01T00:00:00' and '{year}-12-31T23:59:59'"
    )
    try:
        rows = client.json_rows(
            config.DS_DAILY, **{"$select": "estat,count(*) as n", "$where": where, "$group": "estat"}
        )
    except EmptyResponse:
        return {"year": year, "checked": False}

    counts = {(r.get("estat") or ""): int(r["n"]) for r in rows}
    unknown = {k: v for k, v in counts.items() if k not in KNOWN_ESTAT}
    if unknown and not allow_unknown:
        raise RuntimeError(
            f"{year}: el camp `estat` conte valors que el pipeline no sap "
            f"interpretar: {unknown}. Mira que signifiquen i decideix si es fan "
            "servir o es descarten abans de tornar-hi amb --allow-unknown-estat."
        )
    return {
        "year": year,
        "checked": True,
        "counts": {k or "(buit)": v for k, v in counts.items()},
    }


def fetch_year(client: Client, variable: int, year: int, force: bool = False) -> pd.DataFrame:
    short = config.VARIABLES[variable]
    path = _path(short, year)
    if path.exists() and not force:
        return pd.read_parquet(path)

    where = _where(variable, year)
    expected = client.count(config.DS_DAILY, where)
    frames = []
    for page in client.csv_pages(config.DS_DAILY, SELECT, where, expected):
        frames.append(pd.DataFrame(page))

    if not frames:
        df = pd.DataFrame(columns=["codi_estacio", "data", "valor", "estat"])
    else:
        df = pd.concat(frames, ignore_index=True)
        df["data"] = pd.to_datetime(df["data_lectura"].str[:10])
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        df["estat"] = df["estat"].fillna("").astype("category")
        df = df[["codi_estacio", "data", "valor", "estat"]]
        # Un mateix dia i estacio no hauria d'apareixer dues vegades.
        dups = df.duplicated(["codi_estacio", "data"]).sum()
        if dups:
            raise RuntimeError(f"{short} {year}: {dups} files duplicades (estacio, dia)")

    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(path, index=False)
    return df


def open_years(refresh: int = 2) -> set[int]:
    """Anys que sempre es tornen a baixar: l'actual i els `refresh-1` anteriors.

    El Meteocat corregeix dades enrere, i el cache no ho sabria mai altrament.
    """
    now = dt.date.today().year
    return {now - i for i in range(refresh)}


def fetch_all(
    client: Client,
    years: range | list[int],
    full: bool = False,
    refresh: int = 2,
    allow_unknown: bool = False,
    log=print,
) -> dict:
    """Assegura que el cache te totes les (variable, any) demanades."""
    config.DAILY_CACHE.mkdir(parents=True, exist_ok=True)
    reopen = open_years(refresh)
    estat_report = []
    downloaded = 0

    for year in years:
        force = full or year in reopen
        pending = [
            v for v in config.VARIABLES
            if force or not _path(config.VARIABLES[v], year).exists()
        ]
        if not pending:
            continue

        estat_report.append(check_estat(client, year, allow_unknown))
        for variable in pending:
            short = config.VARIABLES[variable]
            df = fetch_year(client, variable, year, force=True)
            downloaded += 1
            log(f"  {short} {year}: {len(df):>7,} files")

    return {"downloaded": downloaded, "estat": estat_report}


def load(years: list[int] | None = None) -> tuple[pd.DataFrame, dict]:
    """Llegeix el cache i el torna com una taula ampla: estacio, dia, tn, tx.

    Aqui es on s'aplica el filtre de `estat`, i es fa per variable abans de
    creuar-les: si la maxima d'un dia no es representativa pero la minima si,
    nomes es perd la maxima.
    """
    frames = {}
    dropped = {}
    blank = {}
    curtes = list(config.VARIABLES.values()) + sorted(config.DERIVADES)
    for short in curtes:
        arrel = config.DERIVED_DIR if short in config.DERIVADES else config.DAILY_CACHE
        paths = sorted(arrel.glob(f"{short}-*.parquet"))
        # Una derivada pot no estar calculada encara: no es motiu per aturar-ho tot.
        if not paths and short in config.DERIVADES:
            continue
        if years is not None:
            keep = {str(y) for y in years}
            paths = [p for p in paths if p.stem.split("-")[-1] in keep]
        if not paths:
            raise FileNotFoundError(f"no hi ha cache per a {short}; corre ./dothething.sh")
        df = pd.concat((pd.read_parquet(p) for p in paths), ignore_index=True)

        bad = df["estat"].astype(str) == NOT_REPRESENTATIVE
        dropped[short] = int(bad.sum())
        blank[short] = int((df["estat"].astype(str) == "").sum())
        df = df[~bad]

        frames[short] = df.drop(columns=["estat"]).rename(columns={"valor": short})

    out = None
    for short, df in frames.items():
        out = df if out is None else out.merge(df, on=["codi_estacio", "data"], how="outer")
    out = out.sort_values(["codi_estacio", "data"], ignore_index=True)
    out["year"] = out["data"].dt.year
    report = {
        "dropped_not_representative": dropped,
        "kept_with_blank_estat": blank,
    }
    return out, report


def fetch_stations(client: Client) -> pd.DataFrame:
    rows = client.json_rows(config.DS_STATIONS, **{"$limit": 2000})
    df = pd.DataFrame(rows)
    for col in ("latitud", "longitud", "altitud"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df
