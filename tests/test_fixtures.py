"""Tests de regressio contra numeros verificats a ma sobre l'API.

Si un canvi al pipeline mou qualsevol d'aquests valors, o be el canvi es dolent
o be la font ha canviat i cal entendre per que. En cap dels dos casos volem
publicar-ho sense mirar-ho.

Els tests llegeixen el cache local (`cache/daily/`), no l'API: han de poder
correr sense xarxa i sense dependre de si el portal esta amunt.
"""

from __future__ import annotations

import json

import pytest

from pipeline import config, fetch, metrics, quality

# Badalona-Museu (WU, 42 m, urba litoral). Nits tropicals = dies amb Tmin >= 20.
TROPICAL_WU = {
    2006: 89, 2007: 69, 2008: 76, 2009: 81, 2010: 73,
    2011: 74, 2012: 82, 2013: 62, 2014: 73, 2015: 72,
    2016: 80, 2017: 75, 2018: 90, 2019: 79, 2020: 75,
    2021: 91, 2022: 102, 2023: 99, 2024: 76, 2025: 94,
}

# Nits torrides = dies amb Tmin >= 25.
TORRID_WU = {
    2006: 4, 2007: 0, 2008: 0, 2009: 1, 2010: 0, 2011: 0, 2012: 5, 2013: 1,
    2014: 0, 2015: 2, 2016: 0, 2017: 2, 2018: 7, 2019: 1, 2020: 4, 2021: 0,
    2022: 14, 2023: 14, 2024: 6, 2025: 16,
}

# Mitjana de la minima de juny-juliol-agost, per decades.
# (estacio, altitud, 2006-2015, 2016-2025)
#
# Cabrils 2006-2015 val 19.20 i no 19.21, que es el que deia el document de
# partida. Verificat directament contra l'API, sense aquest pipeline pel mig:
#
#   $select=avg(valor) &$where=codi_estacio='UP' and codi_variable=1002
#     and data_lectura between '2006-01-01' and '2015-12-31'
#     and date_extract_m(data_lectura) between 6 and 8
#   -> 19.2039130434782609 sobre 920 dies
#
# La diferencia entre decades no es mou (+0.51), aixi que la conclusio de la
# taula es la mateixa.
DECADES = [
    ("WU", 42, 20.87, 21.79),
    ("UP", 81, 19.20, 19.72),
    ("D5", 410, 18.59, 19.85),
]

# Dies amb minima publicada a WU. El document de partida deia "365-366 dies/any
# de 2006 a 2025"; no es exacte. Hi ha tres anys amb forats a la font, tots tres
# molt per damunt del llindar del 95% i per tant utilitzables.
WU_DAYS = {
    2006: 365, 2007: 360, 2008: 365, 2009: 365, 2010: 365,
    2011: 365, 2012: 366, 2013: 365, 2014: 365, 2015: 364,
    2016: 366, 2017: 365, 2018: 365, 2019: 365, 2020: 366,
    2021: 365, 2022: 365, 2023: 365, 2024: 366, 2025: 365,
}


@pytest.fixture(scope="module")
def daily():
    try:
        df, _ = fetch.load()
    except FileNotFoundError:
        pytest.skip("no hi ha cache; corre ./dothething primer")
    return df


@pytest.fixture(scope="module")
def coverage(daily):
    return quality.year_coverage(daily)


def _annual_counts(daily, code, var, threshold):
    sub = daily[daily["codi_estacio"] == code]
    hit = sub[var] >= threshold
    return sub.loc[hit.fillna(False)].groupby("year").size().to_dict()


@pytest.mark.parametrize("year,expected", sorted(TROPICAL_WU.items()))
def test_nits_tropicals_badalona(daily, year, expected):
    counts = _annual_counts(daily, "WU", "tn", 20)
    assert counts.get(year, 0) == expected


@pytest.mark.parametrize("year,expected", sorted(TORRID_WU.items()))
def test_nits_torrides_badalona(daily, year, expected):
    counts = _annual_counts(daily, "WU", "tn", 25)
    assert counts.get(year, 0) == expected


@pytest.mark.parametrize("code,altitud,d1,d2", DECADES)
def test_mitjana_estival_per_decades(daily, code, altitud, d1, d2):
    """La taula que motiva el projecte: la tendencia no es uniforme.

    Es la mitjana dels dies de JJA agrupats per decada, no la mitjana de les
    mitjanes anuals. Amb anys complets les dues coincideixen a la centesima,
    pero convé fixar quina es.
    """
    sub = daily[daily["codi_estacio"] == code]
    month = sub["data"].dt.month
    jja = sub[(month >= 6) & (month <= 8)]
    for lo, hi, expected in ((2006, 2015, d1), (2016, 2025, d2)):
        window = jja[(jja["year"] >= lo) & (jja["year"] <= hi)]
        assert round(float(window["tn"].mean()), 2) == pytest.approx(expected, abs=0.01)


def test_histograma_reprodueix_els_recomptes(daily):
    """El navegador comptara des dels histogrames, no des de la serie diaria.

    Aquest test comprova que les dues vies donen el mateix, que es tota la
    premissa de deixar moure el llindar amb un slider.
    """
    lo, hi = config.HIST_RANGE["tn"]
    sub = daily[daily["codi_estacio"] == "WU"]
    for year, expected in TROPICAL_WU.items():
        values = sub.loc[sub["year"] == year, "tn"]
        hist = metrics.histogram(values, lo, hi)
        assert metrics.count_at_or_above(hist, 20) == expected
    for year, expected in TORRID_WU.items():
        values = sub.loc[sub["year"] == year, "tn"]
        hist = metrics.histogram(values, lo, hi)
        assert metrics.count_at_or_above(hist, 25) == expected


def test_completesa_badalona(coverage):
    """De 2006 a 2025 WU passa el filtre de completesa tots els anys.

    Que el passi no vol dir que tingui tots els dies: el 2007 en te 360 perque
    la font no publica minima del 7 a l'11 de desembre (l'11 hi ha maxima pero
    no minima). El `count(*)` de l'API tambe dona 360, aixi que es un buit de
    l'origen i no del pipeline. 360/365 = 98.6%, per damunt del llindar del 95%,
    i per tant l'any es utilitzable.
    """
    wu = coverage[coverage["codi_estacio"] == "WU"].set_index("year")
    for year in range(2006, 2026):
        assert bool(wu.loc[year, "complete"]) is True, year
        assert wu.loc[year, "coverage"] >= config.YEAR_COMPLETENESS, year

    # Dies amb minima publicada, any per any. Els tres anys que no son sencers
    # ho son a la font: 2007 (-5 dies), 2008 (-1) i 2015 (-1).
    for year, expected in WU_DAYS.items():
        assert wu.loc[year, "n_tn"] == expected, year

    # 2005 es l'any d'obertura i esta incomplet: no pot entrar en cap tendencia.
    assert bool(wu.loc[2005, "complete"]) is False
    assert wu.loc[2005, "n_tn"] == 102


def test_any_en_curs_marcat_com_a_parcial(coverage):
    """Cap any en curs pot passar per complet, per moltes dades que tingui."""
    ongoing = coverage[coverage["ongoing"]]
    assert len(ongoing) > 0
    assert not ongoing["complete"].any()


def _published(name):
    path = config.SITE_DATA / name
    if not path.exists():
        pytest.skip("no hi ha site/data; corre ./dothething primer")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


@pytest.mark.parametrize("code,altitud,d1,d2", DECADES)
def test_les_decades_es_reconstrueixen_des_del_que_es_publica(code, altitud, d1, d2):
    """La prova de foc del disseny: publiquem agregats i no la serie diaria.

    Si les mitjanes de decada no es poden refer exactament des dels fitxers
    publicats, l'agregat ha perdut informacio que necessitem i el disseny es
    dolent. Es reconstrueixen ponderant les mitjanes mensuals pel nombre de dies
    de cada mes, i el nombre de dies surt de sumar el propi histograma.
    """
    detail = _published(f"st/{code}.json")
    means, hists = detail["m"]["tn"], detail["h"]["tn"]

    for lo, hi, expected in ((2006, 2015, d1), (2016, 2025, d2)):
        total = days = 0
        for year in range(lo, hi + 1):
            for month in ("6", "7", "8"):
                mean = means.get(str(year), {}).get(month)
                hist = hists.get(str(year), {}).get(month)
                if mean is None or hist is None:
                    continue
                n = sum(hist[1:])
                total += mean * n
                days += n
        # 920 dies serien els 92 de JJA per deu anys. D5 en te 918: la font no
        # publica dos dies d'aquella decada. Es un buit real i petit, i el que
        # ha de quadrar es la mitjana.
        assert 910 <= days <= 920, (code, lo, days)
        assert round(total / days, 2) == pytest.approx(expected, abs=0.01)


def test_histograma_anual_igual_a_la_suma_dels_mensuals():
    """El fitxer de la portada i el de la fitxa han de dir el mateix.

    Son dos agregats diferents de la mateixa dada, i es fan servir a pantalles
    diferents. Si divergissin, el numero canviaria en obrir una estacio.
    """
    anual = _published("hist-tn.json")["stations"]
    for code in ("WU", "UP", "D5"):
        mensual = _published(f"st/{code}.json")["h"]["tn"]
        for year, months in mensual.items():
            total_mes = sum(sum(h[1:]) for h in months.values())
            total_any = sum(anual[code][year][1:])
            assert total_mes == total_any, (code, year)
            # I el recompte per damunt d'un llindar tambe ha de coincidir.
            for threshold in (20, 25):
                a = metrics.count_at_or_above(anual[code][year], threshold)
                m = sum(metrics.count_at_or_above(h, threshold) for h in months.values())
                assert a == m, (code, year, threshold)


def test_no_publiquem_la_serie_diaria():
    """Decisio explicita: publiquem agregats i enllacem la font per al cru.

    Si algu torna a afegir la serie diaria al repositori, que sigui una decisio
    i no un descuit.
    """
    detail = _published("st/WU.json")
    assert set(detail) == {"codi", "h", "m", "p", "source_url"}
    assert detail["source_url"].startswith(config.DOMAIN)
    assert "codi_estacio='WU'" in detail["source_url"]


def test_estacions_no_encadenades(daily):
    """DH i WU son dues estacions de Badalona, i han de continuar sent-ho.

    DH (Mas Ram) es va desmantellar el 2005 i WU (Museu) es va donar d'alta el
    mateix any, a una altitud i un emplacament diferents. Concatenar-les
    fabricaria una serie llarga que no ha existit mai.
    """
    codes = set(daily["codi_estacio"].unique())
    if "DH" not in codes:
        pytest.skip("DH no es al cache (rang d'anys limitat)")
    dh = daily[daily["codi_estacio"] == "DH"]["year"]
    wu = daily[daily["codi_estacio"] == "WU"]["year"]
    assert dh.max() <= 2005 and wu.min() >= 2005
    # Cada codi te la seva propia serie i ningu les ha unit.
    assert daily.groupby("codi_estacio").size().get("DH") != daily.groupby(
        "codi_estacio"
    ).size().get("WU")
