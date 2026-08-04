/* Textos de la interficie.
 *
 * Afegir un idioma es afegir una clau aqui: la pagina no porta text escrit
 * enlloc mes, ni a l'HTML. Les funcions reben dades i tornen text ja compost,
 * perque l'ordre de les paraules no es el mateix a totes les llengues.
 */

const MESOS_CA = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
const MESOS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const I18N = {
  ca: {
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

    vistaEstacio: "Estació", vistaMapa: "Mapa",
    carregant: "Carregant el mapa…",
    pMapa: (u, cond) => `${u.charAt(0).toUpperCase() + u.slice(1)} amb ${cond} a tot Catalunya`,
    sMapa: (n) =>
      `Cada punt és una de les ${n} estacions, acolorida per la mitjana anual del ` +
      `període i l'època que tens triats. Clica'n una per obrir-la. Els punts són ` +
      `estacions, no un mapa continu: entre dos punts no hi ha dada, i cada estació ` +
      `té la seva altitud i el seu entorn.`,
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

  en: {
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

    vistaEstacio: "Station", vistaMapa: "Map",
    carregant: "Loading the map…",
    pMapa: (u, cond) => `${u.charAt(0).toUpperCase() + u.slice(1)} with ${cond} across Catalonia`,
    sMapa: (n) =>
      `Each dot is one of the ${n} stations, coloured by the yearly average for the ` +
      `period and season you have selected. Click one to open it. These are stations, ` +
      `not a continuous map: between two dots there is no data, and each station has ` +
      `its own elevation and surroundings.`,
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
