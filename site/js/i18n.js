/* Textos de la interficie.
 *
 * Afegir un idioma es afegir una clau aqui: la pagina no porta text escrit
 * enlloc mes, ni a l'HTML. Les funcions reben dades i tornen text ja compost,
 * perque l'ordre de les paraules no es el mateix a totes les llengues.
 */

const MESOS_CA = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
const MESOS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESOS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const BANDERES = {
  ca: '<svg viewBox="0 0 27 18" width="19" height="12.7"><rect width="27" height="18" fill="#fcdd09"/>' +
      '<g fill="#da121a"><rect y="2" width="27" height="2"/><rect y="6" width="27" height="2"/>' +
      '<rect y="10" width="27" height="2"/><rect y="14" width="27" height="2"/></g></svg>',
  es: '<svg viewBox="0 0 27 18" width="19" height="12.7"><rect width="27" height="18" fill="#aa151b"/>' +
      '<rect y="4.5" width="27" height="9" fill="#f1bf00"/></svg>',
  en: '<svg viewBox="0 0 27 18" width="19" height="12.7"><rect width="27" height="18" fill="#012169"/>' +
      '<path d="M0 0l27 18M27 0L0 18" stroke="#fff" stroke-width="3.6"/>' +
      '<path d="M0 0l27 18M27 0L0 18" stroke="#c8102e" stroke-width="2.2"/>' +
      '<path d="M13.5 0v18M0 9h27" stroke="#fff" stroke-width="6"/>' +
      '<path d="M13.5 0v18M0 9h27" stroke="#c8102e" stroke-width="3.6"/></svg>',
};

export const I18N = {
  ca: {
    presets: {
      nit_tropical: "Nit tropical", nit_torrida: "Nit tòrrida", dia_estiu: "Dia d'estiu",
      dia_caloros: "Dia calorós", dia_torrid: "Dia tòrrid", glacada: "Glaçada",
      dia_pluja: "Dia de pluja", pluja_forta: "Pluja forta",
      pluja_torrencial: "Pluja torrencial", intensa: "Pluja intensa",
      molt_intensa: "Pluja molt intensa",
    },
    nom: "Català",
    codi: "ca",
    eyebrow: (y0, y1) => `XEMA · METEOCAT · ${y0}–${y1}`,
    h1: "Quantes nits l'any passa això?",
    lede: (n) =>
      `Registres diaris de ${n} estacions de Catalunya. Tria una estació, una variable i ` +
      `un llindar, i la pàgina compta els dies que el superen, any per any, i compara les ` +
      `dues meitats de la sèrie.`,

    lStation: "Estació meteorològica",
    lVar: "Variable",
    lOp: "Condició",
    lThr: "Llindar",
    lSeason: "Època de l'any",
    lYears: "Anys mostrats",
    lSplit: "Punt de tall",
    lPresets: "Indicadors",
    // "menys de" i no "o menys": amb bins de mig grau nomes son exactes
    // "per damunt o igual" i "per sota estricte". Vegeu METODOLOGIA.md.
    opGe: "≥ o més",
    opLt: "menys de",
    hThr: "La franja acolorida són els dies que compleixen la condició.",
    hYears: "Retalla la sèrie per mirar de prop un tram concret.",
    hSplit: "Mou-lo per provar on es trenca la sèrie: cada meitat recalcula la seva mitjana.",
    auto: "automàtic",

    vars: {
      tn: { nom: "Temperatura mínima", curt: "mínima", nit: true },
      tx: { nom: "Temperatura màxima", curt: "màxima", nit: false },
      pp: { nom: "Precipitació diària", curt: "pluja", nit: false },
      pi: { nom: "Intensitat de pluja (màx. en 1 h)", curt: "intensitat", nit: false },
      tm: { nom: "Temperatura mitjana", curt: "temperatura", nit: false },
      hr: { nom: "Humitat relativa", curt: "humitat", nit: false },
    },
    nit: "nits", dia: "dies", any: "any",
    // Titol del segon panell segons com s'agrega la variable.
    resum: { mean: "mitjana", sum: "total", max: "màxima" },
    secs: (pct) => `El ${pct} % dels dies no plou: l'histograma només mostra els dies amb pluja.`,

    seasons: {
      any: "Tot l'any",
      estiu: "Estiu (juny–agost)",
      cal: "Temporada càlida (maig–octubre)",
      hivern: "Hivern (desembre–febrer)",
      prim: "Primavera (març–maig)",
      tardor: "Tardor (setembre–novembre)",
    },
    seasonPhrase: {
      any: "al llarg de tot l'any",
      estiu: "de juny a agost",
      cal: "de maig a octubre",
      hivern: "de desembre a febrer",
      prim: "de març a maig",
      tardor: "de setembre a novembre",
    },

    plate: { station: "estació", muni: "municipi", alt: "altitud", serie: "sèrie", dies: "dies", estat: "estat" },
    desmantellada: "desmantellada",

    heroCap: (periode, estacio) => `mitjana ${periode} · ${estacio}`,
    heroShort: "No hi ha prou anys complets per comparar dos períodes.",
    deltaVs: "respecte de",

    sentence: (d) =>
      `A <em>${d.estacio}</em>, ${d.unitat} amb ${d.varCurt} ${d.cond} ${d.frase} han passat ` +
      `de <em>${d.a}</em> a <em>${d.b}</em> de mitjana anual: ${d.verb}. ` +
      `La ${d.varCurt} del període es mou de ${d.m0} a ${d.m1} (${d.dm}).`,
    verbUp: "ha pujat", verbDown: "ha baixat", verbFlat: "s'ha mantingut",

    tTotal: "Total al tram", tTotalSub: (n) => `de ${n} dies amb dades`,
    tPeak: (u) => `Any amb més ${u}`, tPartial: "any incomplet",
    tHigh: "Valor més alt", tLow: "Valor més baix", tAnual: "any sencer",

    pCount: (u, cond, frase) => `${u} amb ${cond}, any per any`,
    sCount: "Cada barra és un any. Les línies horitzontals són la mitjana de cada període.",
    sCountStack: "La part clara són els dies de la resta de l'any, fora de l'època seleccionada.",
    lPeriod: "mitjana del període", lRest: "resta de l'any", lPartial: "any incomplet",

    pMean: (v, frase) => `${v} ${frase}, any per any`,
    sMean: "Els anys sense prou dades s'ometen: una mitjana d'un tram a mitges no és comparable.",

    pHeat: (u, cond) => `Repartiment per mesos: ${u} amb ${cond}`,
    sHeat: "Cada cel·la és un mes. Com més fosca, més dies compleixen la condició.",
    sHeatRar: (llista) =>
      ` Amb requadre, els mesos on això gairebé no passa mai: ${llista}.`,
    saltCount: (a, b, d, u) => ` El salt: de ${a} a ${b} ${u}/any (${d}).`,
    saltMean: (a, b, d) => ` El salt: de ${a} a ${b} (${d}).`,

    lView: "Vista", vistaEstacio: "Estació", vistaMapa: "Mapa",
    carregant: "Carregant el mapa…",
    pMapa: (u, cond) => `${u.charAt(0).toUpperCase() + u.slice(1)} amb ${cond} a tot Catalunya`,
    sMapa: (n) =>
      `Cada punt és una de les ${n} estacions, acolorida per la mitjana anual del ` +
      `període i l'època que tens triats. Clica'n una per obrir-la. Els punts són ` +
      `estacions, no un mapa continu: entre dos punts no hi ha dada, i cada estació ` +
      `té la seva altitud i el seu entorn.`,
    sMapaFora: (n, m) => `S'hi han deixat fora ${n} estacions amb menys de ${m} anys complets al període: amb tan poca sèrie la mitjana és massa sorollosa per pintar-la igual que la resta.`,
    tableSummary: "Veure les dades en una taula",
    thYear: "Any", thDays: "Dies", thRest: "Resta", thMean: "Mitjana", thObs: "Obs.", thCov: "Cobertura",

    noData: "Aquesta estació no té prou dades per a aquesta selecció.",
    mesos: MESOS_CA,
    footer: (d) =>
      `Font: <b>Servei Meteorològic de Catalunya (XEMA)</b>. Dades obertes de la Generalitat ` +
      `de Catalunya. <a href="${d.dataset}">Conjunt de dades original</a> · ` +
      `<a href="${d.crues}">dades brutes d'aquesta estació</a> · ` +
      `<a href="${d.legal}">avís legal</a>.<br>` +
      `Darrera actualització de la font: <span class="m">${d.font}</span>. ` +
      `Agregats generats el <span class="m">${d.generat}</span>.<br>` +
      `Les sèries <b>no estan homogeneïtzades</b> i no són dades científiques validades: els ` +
      `canvis d'instrument o d'entorn poden produir salts que no tenen res a veure amb el clima. ` +
      `<a href="${d.metodologia}">Metodologia</a> · <a href="${d.codi}">codi</a>.`,
  },

  es: {
    presets: {
      nit_tropical: "Noche tropical", nit_torrida: "Noche tórrida", dia_estiu: "Día de verano",
      dia_caloros: "Día caluroso", dia_torrid: "Día tórrido", glacada: "Helada",
      dia_pluja: "Día de lluvia", pluja_forta: "Lluvia fuerte",
      pluja_torrencial: "Lluvia torrencial", intensa: "Lluvia intensa",
      molt_intensa: "Lluvia muy intensa",
    },
    nom: "Castellano",
    codi: "es",
    eyebrow: (y0, y1) => `XEMA · METEOCAT · ${y0}–${y1}`,
    h1: "¿Cuántas noches al año pasa esto?",
    lede: (n) =>
      `Registros diarios de ${n} estaciones de Cataluña. Elige una estación, una variable y ` +
      `un umbral, y la página cuenta los días que lo superan, año por año, y compara las ` +
      `dos mitades de la serie.`,

    lStation: "Estación meteorológica",
    lVar: "Variable",
    lOp: "Condición",
    lThr: "Umbral",
    lSeason: "Época del año",
    lYears: "Años mostrados",
    lSplit: "Punto de corte",
    lPresets: "Indicadores",
    // "menys de" i no "o menys": amb bins de mig grau nomes son exactes
    // "per damunt o igual" i "per sota estricte". Vegeu METODOLOGIA.md.
    opGe: "≥ o más",
    opLt: "menos de",
    hThr: "La franja coloreada son los días que cumplen la condición.",
    hYears: "Recorta la serie para mirar de cerca un tramo concreto.",
    hSplit: "Muévelo para probar dónde se rompe la serie: cada mitad recalcula su media.",
    auto: "automático",

    vars: {
      tn: { nom: "Temperatura mínima", curt: "mínima", nit: true },
      tx: { nom: "Temperatura máxima", curt: "máxima", nit: false },
      pp: { nom: "Precipitación diaria", curt: "lluvia", nit: false },
      pi: { nom: "Intensidad de lluvia (máx. en 1 h)", curt: "intensidad", nit: false },
      tm: { nom: "Temperatura media", curt: "temperatura", nit: false },
      hr: { nom: "Humedad relativa", curt: "humedad", nit: false },
    },
    nit: "noches", dia: "días", any: "año",
    // Titol del segon panell segons com s'agrega la variable.
    resum: { mean: "media", sum: "total", max: "máxima" },
    secs: (pct) => `El ${pct} % de los días no llueve: el histograma solo muestra los días con lluvia.`,

    seasons: {
      any: "Todo el año",
      estiu: "Verano (junio–agosto)",
      cal: "Temporada cálida (mayo–octubre)",
      hivern: "Invierno (diciembre–febrero)",
      prim: "Primavera (marzo–mayo)",
      tardor: "Otoño (septiembre–noviembre)",
    },
    seasonPhrase: {
      any: "a lo largo de todo el año",
      estiu: "de junio a agosto",
      cal: "de mayo a octubre",
      hivern: "de diciembre a febrero",
      prim: "de marzo a mayo",
      tardor: "de septiembre a noviembre",
    },

    plate: { station: "estación", muni: "municipio", alt: "altitud", serie: "serie", dies: "días", estat: "estado" },
    desmantellada: "desmantelada",

    heroCap: (periode, estacio) => `media ${periode} · ${estacio}`,
    heroShort: "No hay suficientes años completos para comparar dos períodos.",
    deltaVs: "respecto a",

    sentence: (d) =>
      `En <em>${d.estacio}</em>, ${d.unitat} con ${d.varCurt} ${d.cond} ${d.frase} han pasado ` +
      `de <em>${d.a}</em> a <em>${d.b}</em> de media anual: ${d.verb}. ` +
      `La ${d.varCurt} del período pasa de ${d.m0} a ${d.m1} (${d.dm}).`,
    verbUp: "ha subido", verbDown: "ha bajado", verbFlat: "se ha mantenido",

    tTotal: "Total en el tramo", tTotalSub: (n) => `de ${n} días con datos`,
    tPeak: (u) => `Año con más ${u}`, tPartial: "año incompleto",
    tHigh: "Valor más alto", tLow: "Valor más bajo", tAnual: "año entero",

    pCount: (u, cond, frase) => `${u} amb ${cond}, any per any`,
    sCount: "Cada barra es un año. Las líneas horizontales son la media de cada período.",
    sCountStack: "La parte clara son los días del resto del año, fuera de la época seleccionada.",
    lPeriod: "media del período", lRest: "resto del año", lPartial: "año incompleto",

    pMean: (v, frase) => `${v} ${frase}, año por año`,
    sMean: "Los años sin suficientes datos se omiten: una media de un tramo a medias no es comparable.",

    pHeat: (u, cond) => `Reparto por meses: ${u} con ${cond}`,
    sHeat: "Cada celda es un mes. Cuanto más oscura, más días cumplen la condición.",
    sHeatRar: (llista) =>
      ` Con recuadro, los meses donde esto casi nunca pasa: ${llista}.`,
    saltCount: (a, b, d, u) => ` El salto: de ${a} a ${b} ${u}/año (${d}).`,
    saltMean: (a, b, d) => ` El salto: de ${a} a ${b} (${d}).`,

    lView: "Vista", vistaEstacio: "Estación", vistaMapa: "Mapa",
    carregant: "Cargando el mapa…",
    pMapa: (u, cond) => `${u.charAt(0).toUpperCase() + u.slice(1)} con ${cond} en toda Cataluña`,
    sMapa: (n) =>
      `Cada punto es una de las ${n} estaciones, coloreada por la media anual del ` +
      `período y la época seleccionados. Haz clic en una para abrirla. Son estaciones, ` +
      `no un mapa continuo: entre dos puntos no hay dato, y cada estación tiene su ` +
      `propia altitud y su entorno.`,
    sMapaFora: (n, m) => `Se han dejado fuera ${n} estaciones con menos de ${m} años completos en el período: con tan poca serie la media es demasiado ruidosa para pintarla igual que el resto.`,
    tableSummary: "Ver los datos en una tabla",
    thYear: "Año", thDays: "Días", thRest: "Resto", thMean: "Media", thObs: "Obs.", thCov: "Cobertura",

    noData: "Esta estación no tiene suficientes datos para esta selección.",
    mesos: MESOS_ES,
    footer: (d) =>
      `Fuente: <b>Servei Meteorològic de Catalunya (XEMA)</b>. Datos abiertos de la Generalitat ` +
      `de Catalunya. <a href="${d.dataset}">Conjunto de datos original</a> · ` +
      `<a href="${d.crues}">datos brutos de esta estación</a> · ` +
      `<a href="${d.legal}">aviso legal</a>.<br>` +
      `Última actualización de la fuente: <span class="m">${d.font}</span>. ` +
      `Agregados generados el <span class="m">${d.generat}</span>.<br>` +
      `Las series <b>no están homogeneizadas</b> y no son datos científicos validados: los ` +
      `cambios de instrumento o de entorno pueden producir saltos que no tienen nada que ver con el clima. ` +
      `<a href="${d.metodologia}">Metodología</a> · <a href="${d.codi}">código</a>.`,
  },

  en: {
    presets: {
      nit_tropical: "Tropical night", nit_torrida: "Torrid night", dia_estiu: "Summer day",
      dia_caloros: "Hot day", dia_torrid: "Scorching day", glacada: "Frost day",
      dia_pluja: "Rain day", pluja_forta: "Heavy rain",
      pluja_torrencial: "Torrential rain", intensa: "Intense rain",
      molt_intensa: "Very intense rain",
    },
    nom: "English",
    codi: "en",
    eyebrow: (y0, y1) => `XEMA · METEOCAT · ${y0}–${y1}`,
    h1: "How many nights a year does this happen?",
    lede: (n) =>
      `Daily records from ${n} weather stations in Catalonia. Pick a station, a variable and ` +
      `a threshold, and the page counts the days that cross it, year by year, and compares ` +
      `the two halves of the series.`,

    lStation: "Weather station",
    lVar: "Variable",
    lOp: "Condition",
    lThr: "Threshold",
    lSeason: "Time of year",
    lYears: "Years shown",
    lSplit: "Split point",
    lPresets: "Indicators",
    opGe: "≥ or above",
    opLt: "below",
    hThr: "The shaded band is the days that meet the condition.",
    hYears: "Trim the series to look closely at one stretch.",
    hSplit: "Move it to test where the series breaks: each half recomputes its own mean.",
    auto: "automatic",

    vars: {
      tn: { nom: "Minimum temperature", curt: "minimum", nit: true },
      tx: { nom: "Maximum temperature", curt: "maximum", nit: false },
      pp: { nom: "Daily rainfall", curt: "rainfall", nit: false },
      pi: { nom: "Rain intensity (max in 1 h)", curt: "intensity", nit: false },
      tm: { nom: "Mean temperature", curt: "temperature", nit: false },
      hr: { nom: "Relative humidity", curt: "humidity", nit: false },
    },
    nit: "nights", dia: "days", any: "year",
    resum: { mean: "mean", sum: "total", max: "peak" },
    secs: (pct) => `${pct} % of days have no rain: the histogram only shows rainy days.`,

    seasons: {
      any: "Whole year",
      estiu: "Summer (June–August)",
      cal: "Warm season (May–October)",
      hivern: "Winter (December–February)",
      prim: "Spring (March–May)",
      tardor: "Autumn (September–November)",
    },
    seasonPhrase: {
      any: "across the whole year",
      estiu: "from June to August",
      cal: "from May to October",
      hivern: "from December to February",
      prim: "from March to May",
      tardor: "from September to November",
    },

    plate: { station: "station", muni: "municipality", alt: "elevation", serie: "series", dies: "days", estat: "status" },
    desmantellada: "decommissioned",

    heroCap: (periode, estacio) => `${periode} average · ${estacio}`,
    heroShort: "Not enough complete years to compare two periods.",
    deltaVs: "vs",

    sentence: (d) =>
      `At <em>${d.estacio}</em>, ${d.unitat} with a ${d.varCurt} ${d.cond} ${d.frase} went ` +
      `from <em>${d.a}</em> to <em>${d.b}</em> per year on average: it ${d.verb}. ` +
      `The ${d.varCurt} for the period moves from ${d.m0} to ${d.m1} (${d.dm}).`,
    verbUp: "rose", verbDown: "fell", verbFlat: "held steady",

    tTotal: "Total in range", tTotalSub: (n) => `out of ${n} days with data`,
    tPeak: (u) => `Year with most ${u}`, tPartial: "incomplete year",
    tHigh: "Highest value", tLow: "Lowest value", tAnual: "whole year",

    pCount: (u, cond) => `${u} with ${cond}, year by year`,
    sCount: "Each bar is one year. The horizontal lines are each period's average.",
    sCountStack: "The lighter part is days from the rest of the year, outside the selected season.",
    lPeriod: "period average", lRest: "rest of the year", lPartial: "incomplete year",

    pMean: (v, frase) => `${v} ${frase}, year by year`,
    sMean: "Years without enough data are omitted: a mean over half a season is not comparable.",

    pHeat: (u, cond) => `Spread by month: ${u} with ${cond}`,
    sHeat: "Each cell is one month. The darker it is, the more days meet the condition.",
    sHeatRar: (llista) => ` Boxed: the months where this almost never happens: ${llista}.`,
    saltCount: (a, b, d, u) => ` The change: from ${a} to ${b} ${u}/year (${d}).`,
    saltMean: (a, b, d) => ` The change: from ${a} to ${b} (${d}).`,

    lView: "View", vistaEstacio: "Station", vistaMapa: "Map",
    carregant: "Loading the map…",
    pMapa: (u, cond) => `${u.charAt(0).toUpperCase() + u.slice(1)} with ${cond} across Catalonia`,
    sMapa: (n) =>
      `Each dot is one of the ${n} stations, coloured by the yearly average for the ` +
      `period and season you have selected. Click one to open it. These are stations, ` +
      `not a continuous map: between two dots there is no data, and each station has ` +
      `its own elevation and surroundings.`,
    sMapaFora: (n, m) => `${n} stations with fewer than ${m} complete years in the period are left out: with so short a series the average is too noisy to paint like the rest.`,
    tableSummary: "See the data as a table",
    thYear: "Year", thDays: "Days", thRest: "Rest", thMean: "Mean", thObs: "Obs.", thCov: "Coverage",

    noData: "This station does not have enough data for this selection.",
    mesos: MESOS_EN,
    footer: (d) =>
      `Source: <b>Servei Meteorològic de Catalunya (XEMA)</b>. Open data from the Generalitat ` +
      `de Catalunya. <a href="${d.dataset}">Original dataset</a> · ` +
      `<a href="${d.crues}">raw data for this station</a> · ` +
      `<a href="${d.legal}">legal notice</a>.<br>` +
      `Source last updated: <span class="m">${d.font}</span>. ` +
      `Aggregates generated on <span class="m">${d.generat}</span>.<br>` +
      `The series are <b>not homogenised</b> and are not validated scientific data: changes of ` +
      `instrument or surroundings can produce steps unrelated to climate. ` +
      `<a href="${d.metodologia}">Methodology</a> · <a href="${d.codi}">source code</a>.`,
  },
};

/** Mesos de cada epoca de l'any. */
export const SEASONS = {
  any: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  estiu: [6, 7, 8],
  cal: [5, 6, 7, 8, 9, 10],
  hivern: [12, 1, 2],
  prim: [3, 4, 5],
  tardor: [9, 10, 11],
};
