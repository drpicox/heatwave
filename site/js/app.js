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

import { state, setCatalog, setEstacio, INDEX, L } from "./nucli.js";
import { model } from "./model.js";
import { dibuixaHist, dibuixaCount, dibuixaMean, dibuixaHeat } from "./grafics.js";
import { dibuixaText, dibuixaTaula, peu } from "./panells.js";
import {
  omplirEstacions, textosFixos, sincronitza, llegeixHash, escriuHash, initControls,
} from "./controls.js";

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

  document.getElementById("split-val").textContent =
    `${m.tall ?? "—"}${state.split == null ? " · " + L().auto : ""}`;
  peu();
  escriuHash();
}

(async function () {
  const [meta, index] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetch("data/index.json").then((r) => r.json()),
  ]);
  setCatalog(meta, index);

  llegeixHash();
  // Badalona-Museu per defecte: és l'estació que va originar el projecte.
  if (!state.st || !INDEX.some((s) => s.codi === state.st)) state.st = "WU";

  omplirEstacions();
  initControls(render, carregaEstacio);
  textosFixos();
  await carregaEstacio(state.st);
  render();
})();
