"""Constants del projecte. Tot el que es podria voler tocar viu aqui."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "cache"
DAILY_CACHE = CACHE / "daily"
SITE_DATA = ROOT / "site" / "data"
STATION_DATA = SITE_DATA / "st"

# --- Socrata -----------------------------------------------------------------

DOMAIN = "https://analisi.transparenciacatalunya.cat"

DS_DAILY = "7bvh-jvq2"  # Dades meteorologiques diaries de la XEMA
DS_STATIONS = "yqwd-vj5e"  # Metadades estacions
DS_VARIABLES = "4fb2-n3yi"  # Metadades variables
DS_SUBDAILY = "nzvn-apee"  # Dades semihoraries (fase 2)

PAGE_SIZE = 50_000

# --- Variables ---------------------------------------------------------------
#
# A 7bvh-jvq2 el codi_variable es NUMERIC (codi_variable=1002, sense cometes).
# A nzvn-apee es TEXT (codi_variable='32'). No es el mateix dataset.
#
# 1004 (amplitud termica) no es baixa: s'ha verificat que es exactament
# 1001 - 1002, i es calcula al navegador.

TMAX = 1001
TMIN = 1002
TMEAN = 1000

VARIABLES = {
    TMIN: "tn",
    TMAX: "tx",
}

# Primer dia amb dada a tot el dataset (verificat: min(data_lectura) = 1988-09-01).
FIRST_YEAR = 1988

# --- Control de qualitat -----------------------------------------------------

# Un any no es considera complet si li falta mes del 5% de dies.
YEAR_COMPLETENESS = 0.95
# Juny+juliol+agost son 92 dies; n'exigim 87.
JJA_DAYS = 92
JJA_MIN_DAYS = 87

# --- Metriques amb llindar ---------------------------------------------------
#
# El web deixa moure el llindar amb un slider; aixo nomes son les dreceres.
# Els noms segueixen la nomenclatura habitual (AEMET / Meteocat).

PRESETS = [
    {"id": "nit_tropical", "var": "tn", "op": ">=", "value": 20},
    {"id": "nit_torrida", "var": "tn", "op": ">=", "value": 25},
    {"id": "dia_estiu", "var": "tx", "op": ">=", "value": 25},
    {"id": "dia_caloros", "var": "tx", "op": ">=", "value": 30},
    {"id": "dia_torrid", "var": "tx", "op": ">=", "value": 35},
    {"id": "glacada", "var": "tn", "op": "<=", "value": 0},
]

# --- Estacions destacades ------------------------------------------------------
#
# El pipeline baixa les 241 estacions amb dades; aquesta llista nomes decideix
# quines surten proposades per defecte al comparador. El criteri es cobrir
# l'eix que motiva el projecte -- litoral urba, vessant, alcada, interior -- amb
# series prou llargues.
#
# Compte amb el que NO hi ha: la XEMA no te estacio a Montcada i Reixac, Sant
# Adria de Besos, Santa Coloma de Gramenet, Cornella, Sant Celoni, Reus, Santa
# Pau ni Begur, i a Barcelona no hi ha ni Gracia/Sant Gervasi ni el Poblenou.
# Es el mateix buit que va originar el projecte a Tiana: la xarxa es prima
# precisament a l'area metropolitana densa.

FEATURED = [
    ("WU", "Badalona - Museu: urbà litoral"),
    ("UP", "Cabrils: vessant marítim semirural"),
    ("D5", "Observatori Fabra: bosc d'alçada"),
    ("X4", "Barcelona - el Raval: urbà dens"),
    ("X8", "Barcelona - Zona Universitària"),
    ("X2", "Barcelona - Zoo: la més propera al Poblenou, desmantellada el 2023"),
    ("XV", "Sant Cugat del Vallès - CAR"),
    ("XF", "Sabadell - Parc Agrari"),
    ("YM", "Granollers: sèrie curta, des del 2020"),
    ("XE", "Tarragona - Complex Educatiu: l'antiga Universitat Laboral"),
    ("XJ", "Girona: als Horts de Santa Eugènia, no al parc de la Devesa"),
    ("VK", "Raimat: la sèrie llarga del pla de Lleida"),
]

# Anys complets minims perque una estacio destacada tingui sentit. Coincideix
# amb el minim que demana Theil-Sen.
FEATURED_MIN_YEARS = 5

# Rang de bins (en graus enters) dels histogrames publicats per estacio i any.
# Les temperatures fora d'aquest rang s'acumulen als extrems; cap llindar
# d'interes climatic hi cau a prop.
HIST_RANGE = {"tn": (-30, 35), "tx": (-25, 50)}

# --- Atribucio ---------------------------------------------------------------
#
# L'avis legal de meteo.cat (llei 18/2015) exigeix literalment quatre coses:
# no alterar el contingut, no desnaturalitzar-lo, citar la font i indicar la
# data de la darrera actualitzacio. Les dues ultimes es rendreitzen al web a
# partir de meta.json; les dues primeres son la rao per publicar la serie
# diaria tal com ve, sense arrodonir.

ATTRIBUTION = "Servei Meteorològic de Catalunya (XEMA). Dades obertes de la Generalitat de Catalunya."
LEGAL_URL = "https://www.meteo.cat/wpweb/avis-legal/"
