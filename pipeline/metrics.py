"""Calcul de metriques.

Decisio de disseny important: el pipeline **no** decideix els llindars. Publica
histogrames diaris per estacio i any, i el navegador en deriva el recompte de
qualsevol llindar que l'usuari trii amb el slider. Aixi la mateixa dada serveix
per a "nits tropicals" (tn>=20), "dies torrids" (tx>=35) i per a qualsevol cosa
que se'ns acudeixi despres, sense refer res.

Els bins son de 1 graus i **semioberts per l'esquerra**: el bin k conte els
valors de [k, k+1). D'aqui surten dues operacions exactes, i nomes dues:

    dies amb valor >= T  =  suma dels bins k >= T
    dies amb valor  < T  =  suma dels bins k <  T

Totes les metriques del web s'expressen amb una d'aquestes dues formes. Per aixo
"dia de glacada" es defineix aqui com tn < 0 i no com tn <= 0: la segona no es
pot respondre exactament amb aquesta graella, i preferim una definicio explicita
a un numero aproximat que sembli exacte.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import config


def histogram(values: pd.Series, lo: float, hi: float, w: float = config.HIST_BIN):
    """Histograma dispers d'una serie de temperatures.

    Torna `[inici, c0, c1, ...]`, on `inici` es la temperatura del primer bin no
    buit i cada bin cobreix [inici + i*w, inici + (i+1)*w). Els valors fora de
    [lo, hi) s'acumulen als bins extrems perque no es perdi cap dia.
    """
    v = values.dropna().to_numpy()
    if v.size == 0:
        return None
    nbins = int(round((hi - lo) / w))
    # +1e-9 abans d'arrodonir a la baixa: els valors venen amb un decimal i la
    # divisio en coma flotant deixa coses com 20.0/0.5 = 39.99999999999999.
    idx = np.clip(np.floor((v - lo) / w + 1e-9).astype(int), 0, nbins - 1)
    counts = np.bincount(idx, minlength=nbins)
    nz = np.nonzero(counts)[0]
    first, last = int(nz[0]), int(nz[-1])
    inici = round(lo + first * w, 3)
    return [inici, *(int(c) for c in counts[first : last + 1])]


def count_at_or_above(hist, threshold: float, w: float = config.HIST_BIN) -> int:
    """Mateixa aritmetica que fara el navegador. Serveix per als tests."""
    if not hist:
        return 0
    inici, counts = hist[0], hist[1:]
    return sum(c for i, c in enumerate(counts) if inici + i * w >= threshold - 1e-9)


def count_below(hist, threshold: float, w: float = config.HIST_BIN) -> int:
    if not hist:
        return 0
    inici, counts = hist[0], hist[1:]
    return sum(c for i, c in enumerate(counts) if inici + i * w < threshold - 1e-9)


def histograms(daily: pd.DataFrame) -> dict[str, dict[str, dict[int, list[int]]]]:
    """Histogrames anuals: {variable: {estacio: {any: histograma}}}

    Es el que carrega la portada, que necessita totes les estacions alhora per
    dibuixar la tendencia contra l'altitud.
    """
    out: dict[str, dict[str, dict[int, list[int]]]] = {}
    for short, (lo, hi) in config.HIST_RANGE.items():
        per_station: dict[str, dict[int, list[int]]] = {}
        for (code, year), grp in daily.groupby(["codi_estacio", "year"], sort=True):
            h = histogram(grp[short], lo, hi)
            if h is not None:
                per_station.setdefault(code, {})[int(year)] = h
        out[short] = per_station
    return out


def monthly_detail(grp: pd.DataFrame) -> tuple[dict, dict]:
    """Histogrames i mitjanes mes a mes d'una sola estacio.

    Es el que carrega la fitxa d'una estacio. Amb resolucio mensual, el web pot
    fer qualsevol finestra de mesos (any sencer, JJA, maig-octubre) i qualsevol
    llindar, sense haver de publicar la serie diaria.

    La mitjana d'una finestra es reconstrueix exactament ponderant les mitjanes
    mensuals pel nombre de dies, i el nombre de dies surt de sumar el propi
    histograma. Per aixo no cal publicar-lo a part.
    """
    hists: dict = {}
    means: dict = {}
    for short, (lo, hi) in config.HIST_RANGE.items():
        for (year, month), sub in grp.groupby([grp["year"], grp["data"].dt.month]):
            h = histogram(sub[short], lo, hi)
            if h is None:
                continue
            hists.setdefault(short, {}).setdefault(str(int(year)), {})[str(int(month))] = h
            means.setdefault(short, {}).setdefault(str(int(year)), {})[str(int(month))] = round(
                float(sub[short].mean()), 2
            )
    return hists, means


def records(grp: pd.DataFrame) -> dict:
    """Valor mes alt i mes baix de cada any, amb la seva data.

    Es l'unica cosa de la fitxa que un histograma no pot reconstruir: no guarda
    dates. Son quatre numeros per any i variable, aixi que surt molt mes barat
    precalcular-los que publicar la serie diaria per poder-los trobar.
    """
    out: dict = {}
    for short in config.VARIABLES.values():
        per_year: dict = {}
        sub = grp[["data", "year", short]].dropna(subset=[short])
        for year, g in sub.groupby("year"):
            hi = g.loc[g[short].idxmax()]
            lo = g.loc[g[short].idxmin()]
            per_year[str(int(year))] = [
                round(float(hi[short]), 1), hi["data"].strftime("%Y-%m-%d"),
                round(float(lo[short]), 1), lo["data"].strftime("%Y-%m-%d"),
            ]
        if per_year:
            out[short] = per_year
    return out


def jja_means(daily: pd.DataFrame) -> pd.DataFrame:
    """Mitjana de juny-juliol-agost per estacio i any.

    Es la metrica menys sorollosa de les tres i la millor per estimar
    tendencies: un any pot tenir moltes o poques nits per damunt d'un llindar
    per pura sort, pero la mitjana estival es mou poc.
    """
    month = daily["data"].dt.month
    jja = daily[(month >= 6) & (month <= 8)]
    g = jja.groupby(["codi_estacio", "year"])
    return pd.DataFrame({"jja_tn": g["tn"].mean(), "jja_tx": g["tx"].mean()}).reset_index()


def preset_counts(daily: pd.DataFrame) -> pd.DataFrame:
    """Recomptes dels llindars de drecera, amb primer i ultim dia de l'any.

    Els recomptes tambe els sap fer el navegador des dels histogrames; aqui es
    calculen per als tests de regressio i per poder dir a la fitxa d'estacio
    quan va ser la primera i l'ultima nit tropical de cada any, que es una cosa
    que l'histograma no sap (no guarda dates).
    """
    rows = []
    for (code, year), grp in daily.groupby(["codi_estacio", "year"], sort=True):
        row = {"codi_estacio": code, "year": int(year)}
        for preset in config.PRESETS:
            var, op, value = preset["var"], preset["op"], preset["value"]
            series = grp[var]
            hit = series >= value if op == ">=" else series < value
            days = grp.loc[hit.fillna(False), "data"]
            pid = preset["id"]
            row[f"{pid}_n"] = int(len(days))
            # Fora de la temporada canonica (juny-setembre). Una nit tropical el
            # maig o l'octubre no compta igual que una del juliol, i el web ho
            # ha de poder dir.
            if len(days):
                row[f"{pid}_first"] = days.min().strftime("%m-%d")
                row[f"{pid}_last"] = days.max().strftime("%m-%d")
                outside = days.dt.month.isin([6, 7, 8, 9])
                row[f"{pid}_outside"] = int((~outside).sum())
            else:
                row[f"{pid}_first"] = None
                row[f"{pid}_last"] = None
                row[f"{pid}_outside"] = 0
        rows.append(row)
    return pd.DataFrame(rows)


def theil_sen(years: np.ndarray, values: np.ndarray) -> float | None:
    """Pendent de Theil-Sen: la mediana de tots els pendents entre parells.

    No parametrica i robusta a valors extrems, que es el que toca amb series
    curtes i sorolloses. El web en calcula la seva propia versio en viu quan
    mous el slider; aquesta serveix per als valors precalculats i els tests.
    """
    if len(years) < 5:
        return None
    slopes = []
    for i in range(len(years)):
        for j in range(i + 1, len(years)):
            dx = years[j] - years[i]
            if dx:
                slopes.append((values[j] - values[i]) / dx)
    return float(np.median(slopes)) if slopes else None
