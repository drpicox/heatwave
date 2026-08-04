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


def stations_for_web(cov: pd.DataFrame, today: dt.date | None = None) -> set[str]:
    """Estacions que arriben al web: les que encara diuen alguna cosa d'ara.

    Cal que segueixin reportant i que tinguin com a minim un any complet recent.
    Una serie que es va acabar el 2009 es historia, i te el seu valor, pero no
    respon la pregunta del projecte i embruta el selector.
    """
    today = today or dt.date.today()
    limit = today.year - config.WEB_LAST_YEAR_MIN
    viu = cov.groupby("codi_estacio")["year"].max()
    recents = cov[(cov["complete"]) & (cov["year"] >= config.WEB_RECENT_YEAR)]
    return set(viu[viu >= limit].index) & set(recents["codi_estacio"].unique())


def amb_metadades(stations: pd.DataFrame) -> set[str]:
    """Estacions que la font descriu.

    N'hi ha alguna (UG) amb anys de dades i cap fila de metadades: ni nom, ni
    altitud, ni coordenades. Al selector surt com un codi solt i al mapa no s'hi
    pot dibuixar. Es queda a l'arxiu, pero no al web.
    """
    ok = stations.dropna(subset=["latitud", "longitud"])
    return set(ok["codi_estacio"])


def build_index(stations: pd.DataFrame, cov: pd.DataFrame, keep: set[str]) -> list[dict]:
    """Index compacte: el minim per omplir el selector i situar l'estacio.

    Es l'unic fitxer que la pagina carrega sencer. Tot el detall viu a la fitxa
    de cada estacio i nomes es baixa quan se'n tria una.
    """
    meta = stations.set_index("codi_estacio").to_dict("index")
    out = []
    for code, grp in cov.groupby("codi_estacio"):
        if code not in keep:
            continue
        m = meta.get(code, {})
        out.append({
            "codi": code,
            "nom": m.get("nom_estacio") or code,
            "municipi": m.get("nom_municipi"),
            "comarca": m.get("nom_comarca"),
            "altitud": m.get("altitud"),
            # Les coordenades son al index perque la vista de mapa les necessita
            # totes alhora, i no val la pena obrir 182 fitxes per tenir-les.
            "lat": m.get("latitud"),
            "lon": m.get("longitud"),
            "estat": m.get("nom_estat_ema"),
            "y0": int(grp["year"].min()),
            "y1": int(grp["year"].max()),
            "dies": int(grp["n_tn"].sum()),
            "complets": int(grp["complete"].sum()),
        })
    out.sort(key=lambda s: (s["nom"] or "").lower())
    return out


def build_details(daily: pd.DataFrame, cov: pd.DataFrame, presets: pd.DataFrame,
                  stations: pd.DataFrame, keep: set[str] | None = None) -> dict[str, dict]:
    """Fitxa autocontinguda de cada estacio.

    Hi ha tot el que la pagina necessita per a una estacio: metadades, cobertura
    any a any, histogrames i mitjanes mes a mes, i els records amb la seva data.
    Amb aixo el navegador pot triar qualsevol llindar, qualsevol conjunt de
    mesos i qualsevol rang d'anys sense tornar a demanar res.
    """
    meta = stations.set_index("codi_estacio").to_dict("index")

    dates = {}
    for code, grp in presets.groupby("codi_estacio"):
        p = {}
        for _, r in grp.iterrows():
            for preset in config.PRESETS:
                pid = preset["id"]
                if r.get(f"{pid}_first"):
                    p.setdefault(pid, {})[str(int(r["year"]))] = [
                        r[f"{pid}_first"], r[f"{pid}_last"],
                    ]
        dates[code] = p

    cobertura = {}
    for code, grp in cov.groupby("codi_estacio"):
        cobertura[code] = {
            str(int(r["year"])): {
                "n": int(r["n_tn"]), "nx": int(r["n_tx"]),
                "c": bool(r["complete"]), "jc": bool(r["jja_complete"]),
                "og": bool(r["ongoing"]),
            }
            for _, r in grp.sort_values("year").iterrows()
        }

    out = {}
    for code, grp in daily.groupby("codi_estacio", sort=True):
        if keep is not None and code not in keep:
            continue
        hists, means = metrics.monthly_detail(grp)
        m = meta.get(code, {})
        out[code] = {
            "codi": code,
            "nom": m.get("nom_estacio") or code,
            "municipi": m.get("nom_municipi"),
            "comarca": m.get("nom_comarca"),
            "altitud": m.get("altitud"),
            "lat": m.get("latitud"),
            "lon": m.get("longitud"),
            "emplacament": m.get("emplacament"),
            "estat": m.get("nom_estat_ema"),
            "bin": config.HIST_BINS,
            "anys": cobertura.get(code, {}),
            "h": hists,
            "m": means,
            "rec": metrics.records(grp),
            "p": dates.get(code, {}),
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

    keep = stations_for_web(cov) & amb_metadades(stations)
    log(f"  {len(keep)} estacions al web, "
        f"{cov['codi_estacio'].nunique() - len(keep)} excloses per no tenir dades recents")

    sizes = {}
    sizes["index.json"] = _write(config.SITE_DATA / "index.json", build_index(stations, cov, keep))
    sizes["stations.json"] = _write(
        config.SITE_DATA / "stations.json",
        build_stations(stations, cov, jja),
    )

    for short, per_station in hists.items():
        lo, hi = config.HIST_RANGE[short]
        sizes[f"hist-{short}.json"] = _write(
            config.SITE_DATA / f"hist-{short}.json",
            {"var": short, "bin": config.HIST_BINS[short], "range": [lo, hi],
             "stations": per_station},
        )

    # Agregat de totes les estacions alhora, per a la vista de mapa. Es un fitxer
    # gros i la pagina nomes el baixa quan obres el mapa; l'explorador d'estacio
    # no el toca. Per variable, perque nomes se'n mira una a la vegada.
    details = build_details(daily, cov, presets, stations, keep)
    for short in config.VARIABLES.values():
        lo, hi = config.HIST_RANGE[short]
        sizes[f"map-{short}.json"] = _write(
            config.SITE_DATA / f"map-{short}.json",
            {"var": short, "bin": config.HIST_BIN, "range": [lo, hi],
             "stations": {c: d["h"].get(short, {}) for c, d in details.items()}},
        )
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
        # Nomes la data, sense hora, i a proposit: aixi dues execucions del
        # mateix dia sobre les mateixes dades donen fitxers identics. Amb l'hora,
        # cada execucio local xocava amb la del cron encara que el contingut fos
        # el mateix, i tots els merges acabaven en conflicte.
        "generated_at": dt.date.today().isoformat(),
        "source_last_updated": source_updated,
        "attribution": config.ATTRIBUTION,
        "legal_url": config.LEGAL_URL,
        "datasets": {
            "diaries": f"{config.DOMAIN}/d/{config.DS_DAILY}",
            "estacions": f"{config.DOMAIN}/d/{config.DS_STATIONS}",
            "variables": f"{config.DOMAIN}/d/{config.DS_VARIABLES}",
        },
        # El web llegeix d'aquí la unitat, com s'agrega cada variable i si la
        # seva distribució està esbiaixada cap al zero: així afegir-ne una no
        # obliga a tocar el codi del navegador.
        "variables": {
            k: {**v, "range": list(v["range"])} for k, v in config.VAR_INFO.items()
        },
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
