/* Controls, textos fixos i sincronitzacio amb l'ancoratge de la URL.
 *
 * initControls rep la funcio de redibuixar: els controls no saben res de com es
 * pinta, nomes que alguna cosa ha canviat.
 */

import { I18N, SEASONS } from "./i18n.js";
import { state, META, INDEX, ST, L, nf, thrText, buida } from "./nucli.js";

/* Els controls no coneixen el render: el reben a initControls i el guarden aquí.
 * Sense això, els gestors que es creen fora d'initControls -- els xips de
 * dreceres es construeixen a textosFixos, perquè canvien amb l'idioma -- es
 * quedaven sense la funció i petaven en silenci després d'haver mogut l'estat. */
let redibuixa = () => {};

export function omplirEstacions() {
  const sel = document.getElementById("f-station");
  buida(sel);
  const perComarca = new Map();
  for (const s of INDEX) {
    const c = s.comarca || "—";
    if (!perComarca.has(c)) perComarca.set(c, []);
    perComarca.get(c).push(s);
  }
  for (const c of [...perComarca.keys()].sort((a, b) => a.localeCompare(b, "ca"))) {
    const g = document.createElement("optgroup");
    g.label = c;
    for (const s of perComarca.get(c)) {
      const o = document.createElement("option");
      o.value = s.codi;
      o.textContent = `${s.nom}${s.altitud != null ? ` (${s.altitud} m)` : ""}` +
        (s.estat === "Operativa" ? "" : " ·");
      g.append(o);
    }
    sel.append(g);
  }
}

export function textosFixos() {
  const t = L();
  document.documentElement.lang = t.codi;
  const anys = INDEX.reduce((a, s) => [Math.min(a[0], s.y0), Math.max(a[1], s.y1)], [9999, 0]);
  document.getElementById("x-eyebrow").textContent = t.eyebrow(anys[0], anys[1]);
  document.getElementById("x-h1").textContent = t.h1;
  document.getElementById("x-lede").textContent = t.lede(nf(INDEX.length));
  const set = (id, v) => { document.getElementById(id).textContent = v; };
  set("x-l-station", t.lStation); set("x-l-var", t.lVar); set("x-l-op", t.lOp);
  set("x-l-thr", t.lThr); set("x-l-season", t.lSeason); set("x-l-years", t.lYears);
  set("x-l-split", t.lSplit); set("x-l-presets", t.lPresets);
  set("thr-help", t.hThr); set("x-h-years", t.hYears); set("x-h-split", t.hSplit);
  set("op-ge", t.opGe); set("op-le", t.opLt);
  set("x-table-summary", t.tableSummary);

  const fv = document.getElementById("f-var");
  buida(fv);
  for (const k of ["tn", "tx"]) {
    const o = document.createElement("option");
    o.value = k; o.textContent = t.vars[k].nom;
    fv.append(o);
  }
  const fs = document.getElementById("f-season");
  buida(fs);
  for (const k of Object.keys(SEASONS)) {
    const o = document.createElement("option");
    o.value = k; o.textContent = t.seasons[k];
    fs.append(o);
  }

  const pl = document.getElementById("preset-list");
  buida(pl);
  for (const p of META.presets) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = `${nomPreset(p)} ${p.op === ">=" ? "≥" : "<"} ${nf(p.value, 0)} °C`;
    b.addEventListener("click", () => {
      state.v = p.var;
      state.op = p.op === ">=" ? "ge" : "lt";
      state.thr = p.value;
      redibuixa();
    });
    pl.append(b);
  }
}

export function nomPreset(p) {
  const noms = {
    ca: { nit_tropical: "Nit tropical", nit_torrida: "Nit tòrrida", dia_estiu: "Dia d'estiu",
          dia_caloros: "Dia calorós", dia_torrid: "Dia tòrrid", glacada: "Glaçada" },
    en: { nit_tropical: "Tropical night", nit_torrida: "Torrid night", dia_estiu: "Summer day",
          dia_caloros: "Hot day", dia_torrid: "Scorching day", glacada: "Frost day" },
  };
  return noms[state.lang][p.id] || p.id;
}

export function sincronitza() {
  const t = L();
  document.documentElement.setAttribute("data-var", state.v);
  document.getElementById("f-station").value = state.st;
  document.getElementById("f-var").value = state.v;
  document.getElementById("f-season").value = state.season;
  document.getElementById("op-ge").setAttribute("aria-pressed", String(state.op === "ge"));
  document.getElementById("op-le").setAttribute("aria-pressed", String(state.op === "lt"));
  document.getElementById("f-thr").value = state.thr;
  document.getElementById("thr-val").textContent = thrText();
  document.getElementById("yr-val").textContent = `${state.y0}–${state.y1}`;

  for (const b of document.querySelectorAll("#preset-list .chip")) {
    const p = META.presets[[...b.parentNode.children].indexOf(b)];
    b.setAttribute("aria-pressed", String(
      p.var === state.v && (p.op === ">=" ? "ge" : "lt") === state.op && p.value === state.thr));
  }
  for (const b of document.querySelectorAll("#view-group button")) {
    b.textContent = b.dataset.view === "mapa" ? t.vistaMapa : t.vistaEstacio;
    b.setAttribute("aria-pressed", String(b.dataset.view === state.view));
  }
  for (const b of document.querySelectorAll("#lang-group button")) {
    b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
  }

  const anys = Object.keys(ST.anys).map(Number);
  const lo = Math.min(...anys), hi = Math.max(...anys);
  const a = document.getElementById("yr-a"), b = document.getElementById("yr-b");
  a.min = b.min = lo; a.max = b.max = hi;
  a.value = state.y0; b.value = state.y1;
  // La pista va encaixada 7 px a cada costat perquè els polzes hi càpiguen;
  // el rebliment ha de viure dins d'aquest mateix tram, no de l'amplada total.
  const f = document.getElementById("yr-fill");
  const frac = (v) => (v - lo) / Math.max(1, hi - lo);
  f.style.left = `calc(7px + (100% - 14px) * ${frac(state.y0).toFixed(4)})`;
  f.style.width = `calc((100% - 14px) * ${Math.max(0, frac(state.y1) - frac(state.y0)).toFixed(4)})`;

  const sp = document.getElementById("f-split");
  sp.min = state.y0 + 1; sp.max = state.y1;
  sp.value = state.split ?? Math.round((state.y0 + state.y1) / 2);
}

export function llegeixHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get("lang") && I18N[p.get("lang")]) state.lang = p.get("lang");
  if (p.get("st")) state.st = p.get("st");
  if (p.get("v")) state.v = p.get("v") === "tx" ? "tx" : "tn";
  if (p.get("op")) state.op = p.get("op") === "lt" ? "lt" : "ge";
  if (p.get("thr")) state.thr = +p.get("thr");
  if (p.get("season") && SEASONS[p.get("season")]) state.season = p.get("season");
  if (p.get("y")) {
    const [a, b] = p.get("y").split("-").map(Number);
    if (a && b) { state.y0 = a; state.y1 = b; }
  }
  if (p.get("split")) state.split = +p.get("split");
  if (p.get("view") === "mapa") state.view = "mapa";
}

export function escriuHash() {
  const p = new URLSearchParams({
    st: state.st, v: state.v, op: state.op, thr: String(state.thr),
    season: state.season, y: `${state.y0}-${state.y1}`, lang: state.lang,
  });
  if (state.split != null) p.set("split", String(state.split));
  if (state.view !== "estacio") p.set("view", state.view);
  history.replaceState(null, "", "#" + p.toString());
}

/* --- render ------------------------------------------------------------------ */

export function initControls(render, carregaEstacio) {
  redibuixa = render;
  document.getElementById("f-station").addEventListener("change", async (e) => {
    state.st = e.target.value;
    state.y0 = state.y1 = null;
    await carregaEstacio(state.st);
    render();
  });
  document.getElementById("f-var").addEventListener("change", (e) => {
    state.v = e.target.value; render();
  });
  document.getElementById("f-season").addEventListener("change", (e) => {
    state.season = e.target.value; render();
  });
  document.getElementById("op-ge").addEventListener("click", () => { state.op = "ge"; render(); });
  document.getElementById("op-le").addEventListener("click", () => { state.op = "lt"; render(); });
  document.getElementById("f-thr").addEventListener("input", (e) => {
    state.thr = +e.target.value; render();
  });
  document.getElementById("f-split").addEventListener("input", (e) => {
    state.split = +e.target.value; render();
  });

  const a = document.getElementById("yr-a"), b = document.getElementById("yr-b");
  const rang = () => {
    let x = +a.value, y = +b.value;
    if (x > y) { const s = x; x = y; y = s; }
    state.y0 = x; state.y1 = y;
    state.split = null;
    render();
  };
  a.addEventListener("input", rang);
  b.addEventListener("input", rang);

  // Canviar nomes l'ancoratge no recarrega la pagina. Sense aixo, un enllac
  // compartit funcionava en obrir-lo de nou pero no si ja tenies la pagina
  // oberta, que es justament el cas de clicar-lo des d'un article.
  window.addEventListener("hashchange", async () => {
    const abans = state.st;
    llegeixHash();
    if (state.st !== abans) {
      state.y0 = state.y1 = null;
      await carregaEstacio(state.st);
    }
    textosFixos();
    render();
  });

  const vg = document.getElementById("view-group");
  for (const v of ["estacio", "mapa"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.view = v;
    b.addEventListener("click", () => { state.view = v; render(); });
    vg.append(b);
  }

  const lg = document.getElementById("lang-group");
  for (const [k, v] of Object.entries(I18N)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.lang = k;
    btn.textContent = v.nom;
    btn.addEventListener("click", () => { state.lang = k; textosFixos(); render(); });
    lg.append(btn);
  }
}

/* --- arrencada ---------------------------------------------------------------- */
