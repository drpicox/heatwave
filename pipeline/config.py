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
PREC = 1300   # precipitacio acumulada diaria
PINT = 1303   # precipitacio maxima en 1 h del dia

VARIABLES = {
    TMIN: "tn",
    TMAX: "tx",
    PREC: "pp",
    PINT: "pi",
}

# Cada variable s'agrega diferent, i aquesta es la part que no es pot copiar de
# la temperatura:
#
#   mean  la mitjana d'un mes de minimes te sentit.
#   sum   la mitjana de mil.limetres diaris no vol dir res; el que vols es el
#         total caigut al mes.
#   max   d'una intensitat, el resum d'un mes es la punta, no la suma ni la
#         mitjana: el que importa es com de fort va ploure el pitjor dia.
#
# `skewed` marca les variables on la majoria de dies valen zero. A Badalona
# nomes plou el 21% dels dies, aixi que l'histograma del llindar es una barra
# gegant al zero i res mes si no es tracta a part.

VAR_INFO = {
    "tn": {"codi": TMIN, "unitat": "°C", "agg": "mean", "bin": 0.5,
           "range": (-30, 35), "decimals": 1, "skewed": False},
    "tx": {"codi": TMAX, "unitat": "°C", "agg": "mean", "bin": 0.5,
           "range": (-25, 50), "decimals": 1, "skewed": False},
    "pp": {"codi": PREC, "unitat": "mm", "agg": "sum", "bin": 0.5,
           "range": (0, 250), "decimals": 1, "skewed": True},
    "pi": {"codi": PINT, "unitat": "mm/h", "agg": "max", "bin": 0.5,
           "range": (0, 100), "decimals": 1, "skewed": True},
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
    # `<` i no `<=`: amb bins semioberts [k, k+1) nomes "per damunt o igual" i
    # "per sota estricte" es poden respondre exactament. Vegeu METODOLOGIA.md.
    {"id": "glacada", "var": "tn", "op": "<", "value": 0},
    {"id": "dia_pluja", "var": "pp", "op": ">=", "value": 1},
    {"id": "pluja_forta", "var": "pp", "op": ">=", "value": 20},
    {"id": "pluja_torrencial", "var": "pp", "op": ">=", "value": 50},
    # El senyal climatic de la pluja es mes a la intensitat que al total: no
    # tant quanta aigua cau com de fort cau.
    {"id": "intensa", "var": "pi", "op": ">=", "value": 10},
    {"id": "molt_intensa", "var": "pi", "op": ">=", "value": 20},
]

# --- Quines estacions arriben al web -------------------------------------------
#
# Una estacio que va deixar d'emetre fa anys te valor d'arxiu, pero no serveix
# per a la pregunta d'aquest projecte: no pot dir res del que passa ara. Al web
# nomes hi arriben les que segueixen reportant i tenen prou historic recent.
#
# Les excloses NO es perden: segueixen a stations.json i als histogrames de totes
# les estacions, que es on viu el registre complet.

WEB_LAST_YEAR_MIN = 1     # anys enrere com a maxim que pot fer que no reporti
WEB_RECENT_YEAR = 2018    # ha de tenir algun any complet a partir d'aqui


# --- Estacions destacades ------------------------------------------------------
#
# El pipeline baixa les 241 estacions amb dades; aquesta llista nomes decideix
# quines surten proposades per defecte al comparador. Les desmantellades
# segueixen sent consultables: el que no fan es sortir per defecte.
#
# Nomes hi entren estacions OPERATIVES, i el motiu es concret: una comparacio
# honesta retalla totes les series a la finestra que tenen en comu, aixi que
# incloure una estacio que es va desmantellar el 2023 retallaria totes les
# altres fins al 2023 i ens menjariem els dos anys mes calorosos de la serie.
#
# Compte amb el que NO hi ha. La XEMA no te estacio a Montcada i Reixac, Sant
# Adria de Besos, Santa Coloma de Gramenet, Cornella, Sant Celoni, Reus, Santa
# Pau ni Begur, i a Barcelona no hi ha ni Gracia/Sant Gervasi ni el Poblenou.
# Aquests noms son estacions de la XVPCA, la xarxa de vigilancia de la
# contaminacio atmosferica, que es una altra xarxa i que **no mesura
# temperatura**: nomes NO2, NO, O3, SO2, NOX, CO, PM10, PM2.5 i companyia. No
# serveix per omplir aquest buit.
#
# I el buit es precisament l'area metropolitana densa, que es el mateix motiu
# pel qual aquest projecte va comencar: a Tiana tampoc no hi ha estacio XEMA.

FEATURED = [
    ("WU", "Badalona - Museu: urbà litoral"),
    ("UP", "Cabrils: vessant marítim semirural"),
    ("D5", "Observatori Fabra: bosc d'alçada"),
    ("X4", "Barcelona - el Raval: urbà dens"),
    ("X8", "Barcelona - Zona Universitària"),
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
FEATURED_STATE = "Operativa"

# Histogrames publicats: rang en graus i amplada de bin.
#
# 0,5 graus i no 1: l'histograma es dibuixa darrere del control de llindar, i a
# 1 grau el perfil surt massa dentat per llegir-hi la forma de la distribucio.
# Tambe fa que el llindar es pugui moure de mig en mig grau, que es la resolucio
# a la qual la font publica els valors arrodonits.
#
# Les temperatures fora del rang s'acumulen als bins extrems, de manera que cap
# dia es perd del recompte total. Cap llindar d'interes climatic hi cau a prop.
HIST_BIN = 0.5
HIST_RANGE = {k: v["range"] for k, v in VAR_INFO.items()}

# --- Atribucio ---------------------------------------------------------------
#
# L'avis legal de meteo.cat (llei 18/2015) exigeix literalment quatre coses:
# no alterar el contingut, no desnaturalitzar-lo, citar la font i indicar la
# data de la darrera actualitzacio. Les dues ultimes es rendreitzen al web a
# partir de meta.json; les dues primeres son la rao per publicar la serie
# diaria tal com ve, sense arrodonir.

ATTRIBUTION = "Servei Meteorològic de Catalunya (XEMA). Dades obertes de la Generalitat de Catalunya."
LEGAL_URL = "https://www.meteo.cat/wpweb/avis-legal/"
