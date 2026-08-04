"""Escriu site/data/ a partir del cache.

Aqui es publica un **agregat**, no una copia de les dades del Meteocat. La serie
diaria crua no es versiona: qui la vulgui te un enllac directe a la font, per
estacio, a `source_url` de cada fitxa. Aixo estalvia el 80% del pes i deixa la
font original com l'unic lloc on viuen les dades brutes.

Que es publica i per que:

* `meta.json`      -- data de generacio, data de la darrera actualitzacio de la
                      font (exigida per l'avis legal), atribucio i comptadors de
                      control de qualitat.
* `stations.json`  -- metadades, cobertura any a any i mitjanes estivals de
                      totes les estacions. Es l'unic fitxer que la portada
                      necessita sencer.
* `hist-tn.json`   -- histogrames **anuals** de temperatura minima, i
* `hist-tx.json`      de maxima, de totes les estacions. Son el que permet moure
                      el llindar amb un slider sense tornar al servidor. Es
                      carrega un fitxer o l'altre segons la variable
                      seleccionada, no els dos.
* `st/<CODI>.json` -- histogrames i mitjanes **mensuals** d'una estacio.
                      ~23 KB (6 KB comprimits), nomes quan obres l'estacio. La
                      resolucio mensual deixa triar qualsevol finestra de mesos
                      i qualsevol llindar; el que no permet, i s'assumeix, son
                      les ratxes de nits consecutives i les dates exactes fora
                      dels llindars de drecera.
"""

from __future__ import annotations

import datetime as dt
import json

import numpy as np
import pandas as pd

from . import config, metrics, quality


def _clean(obj):
    """NaN -> None, tipus de numpy -> tipus de Python. json no els sap escriure."""
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, float) and np.isnan(obj):
        return None
    if isinstance(obj, (pd.Timestamp, dt.date)):
        return obj.strftime("%Y-%m-%d")
    if obj is pd.NaT:
        return None
    return obj


def _write(path, payload, compact=True):
    path.parent.mkdir(parents=True, exist_ok=True)
    separators = (",", ":") if compact else None
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(_clean(payload), fh, ensure_ascii=False, separators=separators)
    return path.stat().st_size


def source_url(code: str) -> str:
    """Enllac a les dades crues d'aquesta estacio, a la font.

    Es el que substitueix el fet de republicar-les nosaltres.
    """
    variables = ",".join(str(v) for v in config.VARIABLES)
    return (
        f"{config.DOMAIN}/resource/{config.DS_DAILY}.csv"
        f"?$where=codi_estacio='{code}' and codi_variable in ({variables})"
        f"&$order=data_lectura"
    )


def build_stations(stations: pd.DataFrame, cov: pd.DataFrame, jja: pd.DataFrame) -> list[dict]:
    """Metadades i cobertura de totes les estacions.

    Aquest fitxer el carrega la portada sencer, aixi que nomes hi ha d'haver el
    que la portada necessita. Tot el que sigui de detall d'una estacio va al seu
    propi fitxer.
    """
    meta = stations.set_index("codi_estacio").to_dict("index")
    cov = cov.merge(jja, on=["codi_estacio", "year"], how="left")

    out = []
    for code, grp in cov.groupby("codi_estacio", sort=True):
        m = meta.get(code, {})
        years = []
        for _, r in grp.sort_values("year").iterrows():
            years.append(
                {
                    "y": int(r["year"]),
                    "n": int(r["n_tn"]),
                    "c": bool(r["complete"]),
                    "jc": bool(r["jja_complete"]),
                    "og": bool(r["ongoing"]),
                    "jja_tn": None if pd.isna(r["jja_tn"]) else round(float(r["jja_tn"]), 2),
                    "jja_tx": None if pd.isna(r["jja_tx"]) else round(float(r["jja_tx"]), 2),
                }
            )

        out.append(
            {
                "codi": code,
                "nom": m.get("nom_estacio"),
                "municipi": m.get("nom_municipi"),
                "comarca": m.get("nom_comarca"),
                "altitud": m.get("altitud"),
                "lat": m.get("latitud"),
                "lon": m.get("longitud"),
                "emplacament": m.get("emplacament"),
                "estat": m.get("nom_estat_ema"),
                "inici": m.get("data_inici"),
                "fi": m.get("data_fi"),
                # UG te dades diaries pero cap fila de metadades a la font.
                "sense_metadades": code not in meta,
                "years": years,
            }
        )
    return out


def build_details(daily: pd.DataFrame, presets: pd.DataFrame) -> dict[str, dict]:
    """Fitxa de detall de cada estacio: histogrames i mitjanes mes a mes.

    Les dates de primera i ultima aparicio dels llindars de drecera si que hi
    van, perque son l'unica cosa que un histograma no pot reconstruir i son el
    que permet dir si la temporada de nits tropicals s'allarga.
    """
    by_station = {}
    for code, grp in presets.groupby("codi_estacio"):
        p = {}
        for _, r in grp.iterrows():
            for preset in config.PRESETS:
                pid = preset["id"]
                if r.get(f"{pid}_first"):
                    p.setdefault(pid, {})[str(int(r["year"]))] = [
                        r[f"{pid}_first"],
                        r[f"{pid}_last"],
                    ]
        by_station[code] = p

    out = {}
    for code, grp in daily.groupby("codi_estacio", sort=True):
        hists, means = metrics.monthly_detail(grp)
        out[code] = {
            "codi": code,
            "h": hists,
            "m": means,
            "p": by_station.get(code, {}),
            "source_url": source_url(code),
        }
    return out


def build_featured(stations: pd.DataFrame, cov: pd.DataFrame) -> list[dict]:
    """Comprova les estacions destacades i les resol a metadades.

    Es una llista escrita a ma, i les llistes escrites a ma envelleixen: una
    estacio es desmantella, una altra deixa de passar el control de qualitat.
    Aixi que aqui es verifica, i si alguna cosa no quadra el pipeline s'atura en
    comptes de publicar un comparador amb una estacio buida.
    """
    meta = stations.set_index("codi_estacio").to_dict("index")
    complete = cov[cov["complete"]].groupby("codi_estacio")["year"]
    counts = complete.size().to_dict()
    first, last = complete.min().to_dict(), complete.max().to_dict()

    out, problems = [], []
    for code, why in config.FEATURED:
        n = counts.get(code, 0)
        estat = (meta.get(code) or {}).get("nom_estat_ema")
        if code not in meta:
            problems.append(f"{code}: no surt a les metadades d'estacions")
        elif n < config.FEATURED_MIN_YEARS:
            problems.append(f"{code}: només {n} anys complets, en calen {config.FEATURED_MIN_YEARS}")
        elif estat != config.FEATURED_STATE:
            # Una estacio desmantellada retalla la finestra comuna de tota la
            # comparacio. Segueix sent consultable, pero no per defecte.
            problems.append(f"{code}: està {estat}, i les destacades han de ser {config.FEATURED_STATE}")
        else:
            m = meta[code]
            out.append(
                {
                    "codi": code,
                    "nom": m.get("nom_estacio"),
                    "altitud": m.get("altitud"),
                    "emplacament": m.get("emplacament"),
                    "estat": m.get("nom_estat_ema"),
                    "anys_complets": int(n),
                    "des_de": int(first[code]),
                    "fins_a": int(last[code]),
                    "per_que": why,
                }
            )

    if problems:
        raise RuntimeError(
            "Estacions destacades que ja no serveixen:\n  "
            + "\n  ".join(problems)
            + "\nRevisa config.FEATURED."
        )
    return out


def build_all(daily, stations, cov, estat_report, filter_report, source_updated,
              log=print) -> dict:
    config.SITE_DATA.mkdir(parents=True, exist_ok=True)

    jja = metrics.jja_means(daily)
    presets = metrics.preset_counts(daily)
    hists = metrics.histograms(daily)

    sizes = {}
    sizes["stations.json"] = _write(
        config.SITE_DATA / "stations.json",
        build_stations(stations, cov, jja),
    )

    for short, per_station in hists.items():
        lo, hi = config.HIST_RANGE[short]
        sizes[f"hist-{short}.json"] = _write(
            config.SITE_DATA / f"hist-{short}.json",
            {"var": short, "bin": 1, "range": [lo, hi], "stations": per_station},
        )

    details = build_details(daily, presets)
    config.STATION_DATA.mkdir(parents=True, exist_ok=True)
    # Neteja les estacions que hagin desaparegut de la font, perque no quedin
    # fitxers orfes al repo dient coses que ja no diem.
    for stale in config.STATION_DATA.glob("*.json"):
        if stale.stem not in details:
            stale.unlink()
    total = 0
    for code, payload in details.items():
        total += _write(config.STATION_DATA / f"{code}.json", payload)
    sizes["st/*.json"] = total

    meta = {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_last_updated": source_updated,
        "attribution": config.ATTRIBUTION,
        "legal_url": config.LEGAL_URL,
        "datasets": {
            "diaries": f"{config.DOMAIN}/d/{config.DS_DAILY}",
            "estacions": f"{config.DOMAIN}/d/{config.DS_STATIONS}",
            "variables": f"{config.DOMAIN}/d/{config.DS_VARIABLES}",
        },
        "variables": {"tn": "Temperatura mínima diària", "tx": "Temperatura màxima diària"},
        "raw_data": {
            "policy": (
                "Aquest lloc publica agregats derivats (histogrames i mitjanes), no una còpia "
                "de les dades diàries. Les dades brutes es descarreguen de la font original, "
                "que és qui les manté i les corregeix."
            ),
            "per_station_url": source_url("<CODI>"),
        },
        "presets": config.PRESETS,
        "featured": build_featured(stations, cov),
        "hist_range": config.HIST_RANGE,
        "qc": quality.summary(cov),
        "estat_check": estat_report,
        "estat_filter": filter_report,
        "sizes_bytes": sizes,
    }
    _write(config.SITE_DATA / "meta.json", meta, compact=False)

    for name, size in sizes.items():
        log(f"  {name:<20} {size/1024:>9,.0f} KB")
    return meta
