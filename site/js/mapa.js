/* Vista de mapa: totes les estacions alhora, acolorides per la consulta actual.
 *
 * Els fitxers que fan falta aquí (el contorn i els histogrames de totes les
 * estacions) pesen molt més que la resta de la pàgina, així que només es baixen
 * quan s'obre el mapa per primera vegada. L'explorador d'estació no els toca.
 *
 * Cap biblioteca ni tessel·les: una projecció equirectangular amb correcció de
 * latitud n'hi ha de sobres per a 350 km, i el contorn ve simplificat del
 * pipeline.
 */

import { state, INDEX, L, nf, el, buida, unitat, thrText, varInfo } from "./nucli.js";
import { compta, totalHist } from "./model.js";
import { SEASONS } from "./i18n.js";
import { mostraTip, amagaTip, linia, titolTip } from "./grafics.js";

let GEO = null, MAPA = {};
const fora = new Set();

export function dadesCarregades() {
  return GEO && MAPA[state.v];
}

/** Baixa el que falti per pintar el mapa amb la variable actual. */
export async function carrega(onProgres) {
  const feines = [];
  if (!GEO) {
    onProgres?.();
    feines.push(fetch("data/comarques.json").then((r) => r.json()).then((g) => { GEO = g; }));
  }
  if (!MAPA[state.v]) {
    onProgres?.();
    const v = state.v;
    feines.push(fetch(`data/map-${v}.json`).then((r) => r.json()).then((d) => { MAPA[v] = d; }));
  }
  await Promise.all(feines);
}

const MIN_ANYS = 5;

/** Mitjana anual de dies que compleixen la condició, per estació. */
function valors() {
  fora.clear();
  const font = MAPA[state.v];
  const w = font.bin;
  const propis = varInfo().mesos;
  const mesos = propis
    ? SEASONS[state.season].filter((m) => propis.includes(m))
    : SEASONS[state.season];
  const out = new Map();

  for (const [codi, anys] of Object.entries(font.stations)) {
    let hits = 0, nAnys = 0;
    for (const [any, perMes] of Object.entries(anys)) {
      const y = +any;
      if (y < state.y0 || y > state.y1) continue;
      let h = 0, obs = 0, esperats = 0;
      for (const mes of mesos) {
        const hist = perMes[String(mes)];
        if (!hist) continue;
        h += compta(hist, state.thr, state.op, w);
        obs += totalHist(hist);
        esperats += new Date(Date.UTC(y, mes, 0)).getUTCDate();
      }
      // El mateix llistó que a la fitxa: un any a mitges no entra a la mitjana.
      if (esperats && obs / esperats >= 0.95) { hits += h; nAnys++; }
    }
    // Una estació amb dos anys complets dona una mitjana molt més sorollosa que
    // una amb vint, i al mapa totes dues surten com un punt igual de rodó. Per
    // sota d'aquest mínim no hi entra.
    if (nAnys >= MIN_ANYS) out.set(codi, { valor: hits / nAnys, anys: nAnys });
    else if (nAnys) fora.add(codi);
  }
  return out;
}

export function dibuixa(onTria) {
  const host = document.getElementById("c-mapa");
  const svg = host.querySelector("svg");
  buida(svg);
  if (!GEO || !MAPA[state.v]) return;

  const vals = valors();
  const max = Math.max(1, ...[...vals.values()].map((v) => v.valor));

  // Projecció equirectangular amb correcció de latitud: a aquesta escala la
  // diferència amb una projecció de debò és de pocs píxels.
  let lo0 = 9, lo1 = -9, la0 = 90, la1 = -90;
  for (const c of GEO.comarques) {
    const scan = (n) => {
      if (typeof n[0] === "number") {
        lo0 = Math.min(lo0, n[0]); lo1 = Math.max(lo1, n[0]);
        la0 = Math.min(la0, n[1]); la1 = Math.max(la1, n[1]);
      } else n.forEach(scan);
    };
    scan(c.c);
  }
  const k = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
  const W = 900, mg = 12;
  const ampGeo = (lo1 - lo0) * k, altGeo = la1 - la0;
  const esc = (W - mg * 2) / ampGeo;
  const H = altGeo * esc + mg * 2;
  const X = (lon) => mg + (lon - lo0) * k * esc;
  const Y = (lat) => mg + (la1 - lat) * esc;

  svg.setAttribute("viewBox", `0 0 ${W} ${Math.round(H)}`);

  for (const c of GEO.comarques) {
    const parts = [];
    const anell = (n) => {
      if (typeof n[0][0] === "number") {
        parts.push(n.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("") + "Z");
      } else n.forEach(anell);
    };
    anell(c.c);
    svg.append(el("path", {
      d: parts.join(""), fill: "var(--surface-2)",
      stroke: "var(--grid)", "stroke-width": 1, "stroke-linejoin": "round",
    }));
  }

  const meta = new Map(INDEX.map((s) => [s.codi, s]));
  const punts = [...vals.entries()]
    .map(([codi, v]) => ({ codi, ...v, s: meta.get(codi) }))
    .filter((p) => p.s && p.s.lat != null && p.s.lon != null)
    .sort((a, b) => a.valor - b.valor);   // els valors alts, a sobre

  for (const p of punts) {
    const x = X(p.s.lon), y = Y(p.s.lat);
    const t = Math.sqrt(p.valor / max);
    // Una sola tinta, més fosca com més dies. El contorn fa que una estació amb
    // valor zero segueixi sent visible: si no, desapareixeria del mapa i el
    // lector no sabria que hi ha.
    svg.append(el("circle", {
      cx: x, cy: y, r: 5,
      fill: `color-mix(in srgb, var(--accent) ${Math.round(10 + 90 * t)}%, var(--surface))`,
      stroke: p.codi === state.st ? "var(--ink)" : "var(--axis)",
      "stroke-width": p.codi === state.st ? 2.5 : 1,
    }));

    const hit = el("circle", { cx: x, cy: y, r: 13, fill: "transparent", class: "hit" });
    hit.setAttribute("tabindex", "0");
    hit.setAttribute("role", "button");
    hit.setAttribute("aria-label", `${p.s.nom}: ${nf(p.valor, 1)} ${unitat()}/${L().any}`);
    const mostra = () => mostraTip(host, x, y - 6, [
      titolTip(p.s.nom),
      linia(`${nf(p.valor, 1)} ${unitat()}/${L().any}`, true),
      document.createElement("br"),
      linia(`${p.s.altitud != null ? nf(p.s.altitud) + " m · " : ""}${p.anys} anys`),
    ]);
    hit.addEventListener("pointerenter", mostra);
    hit.addEventListener("focus", mostra);
    hit.addEventListener("pointerleave", () => amagaTip(host));
    hit.addEventListener("blur", () => amagaTip(host));
    hit.addEventListener("click", () => onTria(p.codi));
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTria(p.codi); }
    });
    svg.append(hit);
  }

  document.getElementById("t-mapa").textContent = L().pMapa(unitat(), thrText());
  document.getElementById("s-mapa").textContent =
    L().sMapa(punts.length) + (fora.size ? " " + L().sMapaFora(fora.size, MIN_ANYS) : "");

  const leg = document.getElementById("l-mapa");
  buida(leg);
  const bar = document.createElement("div");
  bar.className = "scale-bar";
  bar.style.background =
    "linear-gradient(to right, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--accent))";
  leg.append(document.createTextNode("0"), bar,
    document.createTextNode(`${nf(max, 1)} ${unitat()}/${L().any}`));
}
