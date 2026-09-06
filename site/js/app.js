/* Nits de calor a Catalunya — explorador d'estació.
 *
 * Aquest fitxer només orquestra: carrega les dades, decideix l'ordre en què es
 * redibuixa tot i arrenca. El càlcul és a model.js, el dibuix a grafics.js i
 * panells.js, i els controls a controls.js.
 *
 * Tot es calcula al navegador des dels histogrames mensuals que publica el
 * pipeline. Moure el llindar o canviar d'època de l'any no torna a demanar res:
 * es tornen a sumar uns quants milers d'enters.
 *
 * SVG a mà i cap dependència externa. La pàgina ha de seguir funcionant d'aquí
 * a deu anys i des d'una còpia local.
 */

import { state, setCatalog, setEstacio, setContext, INDEX, L } from "./nucli.js";
import { model } from "./model.js";
import { dibuixaHist, dibuixaCount, dibuixaMean, dibuixaHeat } from "./grafics.js";
import { dibuixaText, dibuixaTaula, peu } from "./panells.js";
import {
  omplirEstacions, textosFixos, sincronitza, llegeixHash, escriuHash, initControls,
} from "./controls.js";
import * as mapa from "./mapa.js";

/** Baixa la fitxa d'una estació i encaixa el rang d'anys al que realment té. */
async function carregaEstacio(codi) {
  const r = await fetch(`data/st/${encodeURIComponent(codi)}.json`);
  const st = await r.json();
  setEstacio(st);
  const anys = Object.keys(st.anys).map(Number);
  const lo = Math.min(...anys), hi = Math.max(...anys);
  if (state.y0 == null || state.y0 < lo || state.y0 > hi) state.y0 = lo;
  if (state.y1 == null || state.y1 > hi || state.y1 < lo) state.y1 = hi;
  state.split = null;
}

function render() {
  sincronitza();
  const m = model();

  // L'ordre importa: els panells escriuen els subtítols i els gràfics hi
  // afegeixen després el salt i els mesos excepcionals que han trobat pintant.
  dibuixaText(m);
  dibuixaHist(m);

  dibuixaCount(m);
  dibuixaMean(m);
  dibuixaHeat(m);
  dibuixaTaula(m);

  // El mapa i els panells son la mateixa vista, pero el mapa pesa molt mes.
  // Es dibuixa quan te les dades i mentrestant la resta de la pagina ja
  // funciona: no te sentit fer esperar ningu per un fitxer que potser ni mira.
  if (mapa.dadesCarregades()) mapa.dibuixa(triaDelMapa);
  else carregaMapa();

  document.getElementById("split-val").textContent =
    `${m.tall ?? "—"}${state.split == null ? " · " + L().auto : ""}`;
  peu();
  escriuHash();
}

/** Clicar una estació al mapa canvia els panells. El mapa no es mou: el lector
 *  acaba de triar allà i perdre-li el lloc seria hostil. */
async function triaDelMapa(codi) {
  state.st = codi;
  state.vista = "estacio";
  state.y0 = state.y1 = null;
  await carregaEstacio(codi);
  render();
}

let carregant = false;
async function carregaMapa() {
  if (carregant) return;
  carregant = true;
  const host = document.getElementById("c-mapa");
  const avis = document.createElement("div");
  avis.className = "carregant";
  avis.textContent = L().carregant;
  host.querySelector("svg").replaceChildren();
  host.append(avis);
  try {
    await mapa.carrega();
    mapa.dibuixa(triaDelMapa);
  } finally {
    avis.remove();
    carregant = false;
  }
}

(async function () {
  const [meta, index, context] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetch("data/index.json").then((r) => r.json()),
    // 2 KB, i si falta no passa res: la franja de context simplement no surt.
    fetch("data/context.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  setCatalog(meta, index);
  setContext(context);

  llegeixHash();
  // Badalona-Museu per defecte: és l'estació que va originar el projecte.
  if (!state.st || !INDEX.some((s) => s.codi === state.st)) state.st = "WU";

  omplirEstacions();
  initControls(render, carregaEstacio);
  textosFixos();
  await carregaEstacio(state.st);
  render();
})();
