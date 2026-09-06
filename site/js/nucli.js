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
  vista: "mapa", // "mapa" | "estacio"
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

/** L'etiqueta d'idioma per a Intl. La pagina en te tres i el castella tambe
 *  vol la seva: escriu "6 sept", no "6 Sept". */
export const locale = () =>
  ({ ca: "ca-ES", es: "es-ES", en: "en-GB" })[state.lang] ?? "en-GB";

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

/** Marques d'eix rodones.
 *
 *  `enters` obliga el pas a ser com a mínim 1: un eix que compta dies no pot
 *  tenir marques a 0,25, perquè en arrodonir-les a zero decimals sortien
 *  etiquetes repetides (0, 0, 1, 1, 1) en una sèrie que arriba a 1.
 */
export function ticks(lo, hi, n = 4, enters = false) {
  const cru = (hi - lo) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(cru))));
  let pas = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= cru) || mag * 10;
  if (enters) pas = Math.max(1, Math.round(pas));
  const out = [];
  for (let v = Math.ceil(lo / pas) * pas; v <= hi + 1e-9; v += pas) out.push(+v.toFixed(6));
  return out;
}

/** Decimals que calen perquè dues marques consecutives no surtin iguals. */
export function decimalsDe(valors) {
  if (valors.length < 2) return 1;
  const pas = Math.abs(valors[1] - valors[0]);
  if (!pas) return 1;
  return Math.min(3, Math.max(0, Math.ceil(-Math.log10(pas))));
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

/** Dia i mes, per a la cinta de dalt: "6 de set.". Rep una data, no una cadena
 *  ISO de dia, perque la marca de la font porta hora. */
export const dataCurta = (d) =>
  new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short" }).format(d);

/** La mateixa marca, sencera, per al titol emergent de la cinta. */
export const dataHora = (d) =>
  new Intl.DateTimeFormat(locale(), { dateStyle: "long", timeStyle: "short" }).format(d);
