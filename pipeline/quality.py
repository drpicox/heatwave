"""Control de qualitat.

Aquest es el modul on es decideix que NO es publica. Una grafica de barres amb
un any a mitges al final es desinformacio involuntaria, i es la manera mes facil
de publicar una falsedat sense haver-se equivocat en cap calcul.

Tres regles:

* Un any nomes compta com a complet si te dada per a >=95% dels dies del any
  natural. Els anys d'obertura i tancament d'estacio son els sospitosos de
  sempre.
* Per a metriques estivals cal >=87 dels 92 dies de juny-juliol-agost.
* Cada `codi_estacio` es una serie independent i no s'encadena mai amb cap
  altra, encara que el nom s'assembli i el poble sigui el mateix. El cas
  canonic: DH (Badalona-Mas Ram, fins al 2005) i WU (Badalona-Museu, des del
  2005) tenen altituds i emplacaments diferents. Unir-les inventaria una
  tendencia.
"""

from __future__ import annotations

import calendar
import datetime as dt

import pandas as pd

from . import config


def days_in_year(year: int) -> int:
    return 366 if calendar.isleap(year) else 365


def year_coverage(daily: pd.DataFrame, today: dt.date | None = None) -> pd.DataFrame:
    """Una fila per (estacio, any) amb els comptadors i les banderes de qualitat."""
    today = today or dt.date.today()
    df = daily.copy()
    month = df["data"].dt.month
    jja = df[(month >= 6) & (month <= 8)]

    g = df.groupby(["codi_estacio", "year"])
    cov = pd.DataFrame(
        {
            "n_tn": g["tn"].count(),
            "n_tx": g["tx"].count(),
            "first_day": g["data"].min(),
            "last_day": g["data"].max(),
        }
    )
    cov["n_jja_tn"] = jja.groupby(["codi_estacio", "year"])["tn"].count()
    cov["n_jja_tn"] = cov["n_jja_tn"].fillna(0).astype(int)
    cov = cov.reset_index()

    cov["days_expected"] = cov["year"].map(days_in_year)
    cov["coverage"] = cov["n_tn"] / cov["days_expected"]

    # Un any encara en curs no es "incomplet per manca de dades": es incomplet
    # perque no s'ha acabat. Es una distincio que el web ha de saber fer.
    cov["ongoing"] = cov["year"] >= today.year
    cov["complete"] = (cov["coverage"] >= config.YEAR_COMPLETENESS) & ~cov["ongoing"]
    cov["jja_complete"] = (cov["n_jja_tn"] >= config.JJA_MIN_DAYS) & ~cov["ongoing"]
    cov["partial"] = ~cov["complete"]

    return cov


def usable_years(cov: pd.DataFrame) -> pd.DataFrame:
    """Nomes els anys que poden entrar en un calcul de tendencia."""
    return cov[cov["complete"]]


def summary(cov: pd.DataFrame) -> dict:
    """Numeros per posar a meta.json i poder auditar el que s'ha descartat."""
    return {
        "station_years_total": int(len(cov)),
        "station_years_complete": int(cov["complete"].sum()),
        "station_years_partial": int(cov["partial"].sum()),
        "station_years_ongoing": int(cov["ongoing"].sum()),
        "station_years_jja_complete": int(cov["jja_complete"].sum()),
        "stations": int(cov["codi_estacio"].nunique()),
        "year_min": int(cov["year"].min()),
        "year_max": int(cov["year"].max()),
        "rules": {
            "year_completeness": config.YEAR_COMPLETENESS,
            "jja_min_days": config.JJA_MIN_DAYS,
            "jja_days": config.JJA_DAYS,
        },
    }
