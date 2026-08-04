/* Del que publica el pipeline al que dibuixen els grafics.
 *
 * Cap funcio d'aqui toca el DOM: entren histogrames i surten numeros. Es el
 * modul que es pot provar sense navegador.
 */

import { SEASONS } from "./i18n.js";
import { state, ST, COMPLETESA, diesMes } from "./nucli.js";

/** Dies que compleixen la condició, a partir d'un histograma dispers.
 *
 *  L'histograma és `[inici, c0, c1, ...]` i el bin i cobreix
 *  [inici + i·w, inici + (i+1)·w). Amb aquesta graella només dues preguntes
 *  tenen resposta exacta, i són justament les dues que ofereix el control:
 *  "≥ T" i "< T". Per això no hi ha "≤".
 */
export function compta(h, thr, op, w) {
  if (!h) return 0;
  let n = 0;
  for (let i = 1; i < h.length; i++) {
    const b = h[0] + (i - 1) * w;
    if (op === "ge" ? b >= thr - 1e-9 : b < thr - 1e-9) n += h[i];
  }
  return n;
}

export const totalHist = (h) => (h ? h.slice(1).reduce((a, b) => a + b, 0) : 0);

/* --- model ---------------------------------------------------------------- */

export function model() {
  const w = ST.bin;
  const mesos = SEASONS[state.season];
  const dins = new Set(mesos);
  const hVar = ST.h[state.v] || {};
  const mVar = ST.m[state.v] || {};

  const files = [];
  for (const any of Object.keys(hVar).map(Number).sort((a, b) => a - b)) {
    if (any < state.y0 || any > state.y1) continue;
    const perMes = hVar[String(any)] || {};
    const mitjanes = mVar[String(any)] || {};

    let hit = 0, hitTot = 0, obs = 0, obsTot = 0, suma = 0, esperats = 0;
    const cel = {};
    for (let m = 1; m <= 12; m++) {
      const h = perMes[String(m)];
      const n = totalHist(h);
      const c = compta(h, state.thr, state.op, w);
      obsTot += n; hitTot += c;
      if (dins.has(m)) {
        obs += n; hit += c;
        esperats += diesMes(any, m);
        const mm = mitjanes[String(m)];
        if (mm != null) suma += mm * n;
      }
      cel[m] = { n, c };
    }

    const cobertura = esperats ? obs / esperats : 0;
    files.push({
      any, hit, obs, cobertura, cel,
      resta: Math.max(0, hitTot - hit),
      mitjana: obs ? suma / obs : null,
      // Un any en curs no és incomplet per manca de dades: és que no s'ha acabat.
      encurs: !!(ST.anys[String(any)] || {}).og,
      complet: cobertura >= COMPLETESA && !(ST.anys[String(any)] || {}).og,
    });
  }

  const plens = files.filter((f) => f.complet);
  let periodes = null, tall = null;
  if (plens.length >= 4) {
    tall = plens[Math.round(plens.length / 2)].any;
    if (state.split != null) {
      tall = Math.max(plens[0].any + 1, Math.min(plens[plens.length - 1].any, state.split));
    }
    const A = plens.filter((f) => f.any < tall);
    const B = plens.filter((f) => f.any >= tall);
    if (A.length && B.length) periodes = [periode(A), periode(B)];
  }

  // Rècords de l'any sencer dins el rang triat. L'histograma no guarda dates,
  // així que aquests quatre números venen precalculats del pipeline.
  let rec = null;
  const perAny = (ST.rec || {})[state.v] || {};
  for (const [any, r] of Object.entries(perAny)) {
    const y = +any;
    if (y < state.y0 || y > state.y1) continue;
    if (!rec || r[0] > rec.alt) rec = { ...(rec || {}), alt: r[0], altData: r[1] };
    if (!rec || r[2] < rec.baix || rec.baix == null) rec = { ...rec, baix: r[2], baixData: r[3] };
  }

  return { files, plens, periodes, tall, rec, mesos, apilat: state.season !== "any", w };
}

export function periode(llista) {
  const n = llista.length;
  const hits = llista.reduce((a, f) => a + f.hit, 0);
  const mitjanes = llista.filter((f) => f.mitjana != null);
  return {
    y0: llista[0].any, y1: llista[n - 1].any, n, anys: llista,
    total: hits, perAny: hits / n,
    mitjana: mitjanes.length ? mitjanes.reduce((a, f) => a + f.mitjana, 0) / mitjanes.length : null,
    etiqueta: `${llista[0].any}–${llista[n - 1].any}`,
  };
}

/* --- indicador ------------------------------------------------------------- */
