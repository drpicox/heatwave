/* Estat compartit, format i primitives d'SVG.
 *
 * Tot el que necessiten dos moduls o mes viu aqui. Els fitxers de dades es
 * guarden en variables exportades: els moduls que les importen en veuen sempre
 * l'ultim valor, perque els vincles d'un modul son vius.
 */

import { I18N } from "./i18n.js";

export const NS = "http://www.w3.org/2000/svg";

export const DATASET = "https://analisi.transparenciacatalunya.cat/d/7bvh-jvq2";

export const LEGAL = "https://www.meteo.cat/wpweb/avis-legal/";

export const REPO = "https://github.com/drpicox/heatwave";

export const state = {
  lang: "ca",
  st: null,      // codi d'estació
  v: "tn",
  op: "ge",      // "ge" = >= llindar, "lt" = < llindar
  thr: 20,
  season: "any",
  y0: null, y1: null,
  split: null,   // null = automàtic (la meitat de la sèrie)
  mapa: "m",     // mida del mapa: "s" | "m" | "l"
};

/* Dades carregades. S'assignen des de dades.js i tothom qui les importi veu
 * l'ultim valor sense haver-les de passar per parametre a cada crida. */
export let META = null, INDEX = null, ST = null, COMPLETESA = 0.95;

export function setCatalog(meta, index) {
  META = meta;
  INDEX = index;
  COMPLETESA = meta.qc?.rules?.year_completeness ?? 0.95;
}
export function setEstacio(st) { ST = st; }

export const L = () => I18N[state.lang];

export const nf = (x, d = 0) =>
  new Intl.NumberFormat(state.lang === "ca" ? "ca-ES" : "en-GB",
    { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);

export const signed = (x, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "±") + nf(Math.abs(x), d);

export const opSym = () => (state.op === "ge" ? "≥" : "<");

/** Informació de la variable seleccionada: unitat, agregació, si és esbiaixada. */
export const varInfo = () => (META?.variables?.[state.v]) ?? { unitat: "°C", agg: "mean", decimals: 1 };
export const unitatVar = () => varInfo().unitat;
export const thrText = () => `${opSym()} ${nf(state.thr, varInfo().decimals)} ${unitatVar()}`;

export const diesMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export const unitat = () => (L().vars[state.v].nit ? L().nit : L().dia);

export function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

export const buida = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

export function ticks(lo, hi, n = 4) {
  const cru = (hi - lo) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(cru))));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= cru) || mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / pas) * pas; v <= hi + 1e-9; v += pas) out.push(+v.toFixed(6));
  return out;
}

/* --- histogrames ---------------------------------------------------------- */

export const majuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function escapa(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function dataLlarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(state.lang === "ca" ? "ca-ES" : "en-GB", { dateStyle: "long" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}
