/* Tots els textos de la interficie en un sol lloc.
 *
 * Afegir angles mes endavant es afegir un strings.en.js al costat i triar-lo
 * segons la ruta o la preferencia del navegador. Res del codi ha de portar
 * text escrit a dins.
 */

export const T = {
  variables: {
    tn: { curt: "Mínima", llarg: "temperatura mínima diària", nit: true },
    tx: { curt: "Màxima", llarg: "temperatura màxima diària", nit: false },
  },

  presets: {
    nit_tropical: { nom: "Nit tropical", plural: "nits tropicals" },
    nit_torrida: { nom: "Nit tòrrida", plural: "nits tòrrides" },
    dia_estiu: { nom: "Dia d'estiu", plural: "dies d'estiu" },
    dia_caloros: { nom: "Dia calorós", plural: "dies calorosos" },
    dia_torrid: { nom: "Dia tòrrid", plural: "dies tòrrids" },
    glacada: { nom: "Glaçada", plural: "dies de glaçada" },
  },

  /* Dues maneres de mirar la mateixa cosa, i no diuen el mateix.
   *
   * El recompte per damunt d'un llindar mesura IMPACTE: quantes nits mes hi ha.
   * Té un límit que cal conèixer: una estació que no arriba mai al llindar té
   * tendència zero per construcció, i això no vol dir que no s'escalfi.
   *
   * La mitjana d'estiu mesura RITME, i val a qualsevol altitud. És la mètrica
   * menys sorollosa i l'única honesta per comparar muntanya i litoral. */
  metriques: {
    jja: { nom: "Mitjana d'estiu", unitat: "°C/dècada", decimals: 2 },
    llindar: { nom: "Dies per damunt d'un llindar", unitat: "dies/dècada", decimals: 1 },
  },

  ui: {
    variable: "Variable",
    llindar: "Llindar",
    periode: "Període",
    dreceres: "Dreceres",
    veureTaula: "Veure les dades en una taula",
    estacio: "Estació",
    altitud: "Altitud",
    tendencia: "Tendència",
    anys: "Anys",
    mitjana: "Mitjana",
    total: "Total",
    cap: "Cap estació compleix el filtre en aquest període.",
    metrica: "Què es mesura",
    avisZero: "Compte amb la fila d'estacions clavades al zero: no és que no s'escalfin, és que mai no arriben al llindar i el comptador no es pot moure. Per comparar altituds, la mitjana d'estiu és la mètrica honesta.",
    mitjanaEstiu: "mitjana de la temperatura mínima de juny, juliol i agost",
    clica: "Clica un punt per veure la sèrie completa d'aquella estació.",
    tancar: "Tornar a totes les estacions",
    desmantellada: "Desmantellada",
    anyParcial: "any incomplet, no entra a la tendència",
    dadesCrues: "Dades brutes d'aquesta estació a la font",
  },

  unitats: {
    diesDecada: "dies/dècada",
    dies: "dies",
    metres: "m",
    graus: "°C",
  },
};

/** Nom llegible de la metrica seleccionada. */
export function nomMetrica(metrica, variable, op, llindar) {
  const v = T.variables[variable];
  if (metrica === "jja") {
    return `${T.ui.mitjanaEstiu.replace("mínima", v.curt.toLowerCase())}`;
  }
  const unitat = v.nit ? "nits" : "dies";
  const signe = op === ">=" ? "≥" : "<";
  return `${unitat} amb ${v.llarg.replace(" diària", "")} ${signe} ${llindar} °C`;
}

/** Si el llindar coincideix amb una drecera, en torna els noms. */
export function nomDrecera(presets, variable, op, llindar) {
  const p = presets.find(
    (x) => x.var === variable && x.op === op && x.value === llindar
  );
  return p ? T.presets[p.id] : null;
}
