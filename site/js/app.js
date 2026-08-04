/* Nits de calor a Catalunya — explorador d'estació.
 *
 * Tot es calcula al navegador des dels histogrames mensuals que publica el
 * pipeline. Moure el llindar, canviar d'època de l'any o retallar el rang no
 * torna a demanar res: es tornen a sumar uns quants milers d'enters.
 *
 * SVG a mà i cap dependència externa. La pàgina ha de seguir funcionant d'aquí
 * a deu anys i des d'una còpia local.
 */

import { I18N, SEASONS } from "./i18n.js";

const NS = "http://www.w3.org/2000/svg";
const DATASET = "https://analisi.transparenciacatalunya.cat/d/7bvh-jvq2";
const LEGAL = "https://www.meteo.cat/wpweb/avis-legal/";
const REPO = "https://github.com/drpicox/heatwave";

const state = {
  lang: "ca",
  st: null,      // codi d'estació
  v: "tn",
  op: "ge",      // "ge" = >= llindar, "lt" = < llindar
  thr: 20,
  season: "any",
  y0: null, y1: null,
  split: null,   // null = automàtic (la meitat de la sèrie)
};

let META = null, INDEX = null, ST = null, COMPLETESA = 0.95;

/* --- utilitats ------------------------------------------------------------ */

const L = () => I18N[state.lang];
const nf = (x, d = 0) =>
  new Intl.NumberFormat(state.lang === "ca" ? "ca-ES" : "en-GB",
    { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
const signed = (x, d = 1) => (x > 0 ? "+" : x < 0 ? "−" : "±") + nf(Math.abs(x), d);
const opSym = () => (state.op === "ge" ? "≥" : "<");
const thrText = () => `${opSym()} ${nf(state.thr, 1)} °C`;
const diesMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const unitat = () => (L().vars[state.v].nit ? L().nit : L().dia);

function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}
const buida = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

function ticks(lo, hi, n = 4) {
  const cru = (hi - lo) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(cru))));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= cru) || mag * 10;
  const out = [];
  for (let v = Math.ceil(lo / pas) * pas; v <= hi + 1e-9; v += pas) out.push(+v.toFixed(6));
  return out;
}

/* --- histogrames ---------------------------------------------------------- */

/** Dies que compleixen la condició, a partir d'un histograma dispers.
 *
 *  L'histograma és `[inici, c0, c1, ...]` i el bin i cobreix
 *  [inici + i·w, inici + (i+1)·w). Amb aquesta graella només dues preguntes
 *  tenen resposta exacta, i són justament les dues que ofereix el control:
 *  "≥ T" i "< T". Per això no hi ha "≤".
 */
function compta(h, thr, op, w) {
  if (!h) return 0;
  let n = 0;
  for (let i = 1; i < h.length; i++) {
    const b = h[0] + (i - 1) * w;
    if (op === "ge" ? b >= thr - 1e-9 : b < thr - 1e-9) n += h[i];
  }
  return n;
}
const totalHist = (h) => (h ? h.slice(1).reduce((a, b) => a + b, 0) : 0);

/* --- model ---------------------------------------------------------------- */

function model() {
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

function periode(llista) {
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

function mostraTip(host, x, y, nodes) {
  const t = host.querySelector(".tip");
  buida(t);
  nodes.forEach((n) => t.append(n));
  t.style.left = x + "px";
  t.style.top = y + "px";
  t.style.opacity = "1";
}
const amagaTip = (host) => { host.querySelector(".tip").style.opacity = "0"; };
function linia(text, forta) {
  const s = document.createElement(forta ? "b" : "span");
  s.textContent = text;
  return s;
}
function titolTip(text) {
  const s = document.createElement("span");
  s.className = "ty";
  s.textContent = text;
  return s;
}

/* --- histograma del llindar ------------------------------------------------ */

function dibuixaHist(m) {
  const svg = document.getElementById("hist");
  buida(svg);
  const W = 300, H = 46, w = m.w;

  // Un sol histograma amb tots els dies del rang i de l'època seleccionada:
  // és la distribució que el llindar està tallant.
  const bins = new Map();
  const hVar = ST.h[state.v] || {};
  for (const any of Object.keys(hVar)) {
    if (+any < state.y0 || +any > state.y1) continue;
    for (const mes of m.mesos) {
      const h = hVar[any][String(mes)];
      if (!h) continue;
      for (let i = 1; i < h.length; i++) {
        const b = +(h[0] + (i - 1) * w).toFixed(2);
        bins.set(b, (bins.get(b) || 0) + h[i]);
      }
    }
  }
  if (!bins.size) return;

  const claus = [...bins.keys()].sort((a, b) => a - b);
  const lo = +document.getElementById("f-thr").min;
  const hi = +document.getElementById("f-thr").max;
  const max = Math.max(...bins.values());
  const X = (v) => ((v - lo) / (hi - lo)) * W;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");

  for (const b of claus) {
    if (b < lo || b > hi) continue;
    const alt = (bins.get(b) / max) * (H - 4);
    const compleix = state.op === "ge" ? b >= state.thr - 1e-9 : b < state.thr - 1e-9;
    svg.append(el("rect", {
      x: X(b), y: H - alt, width: Math.max(1, X(lo + w) - X(lo) - 0.4), height: alt,
      fill: compleix ? "var(--accent)" : "var(--neutral)",
      "fill-opacity": compleix ? 0.85 : 0.32,
    }));
  }
  svg.append(el("line", {
    x1: X(state.thr), x2: X(state.thr), y1: 0, y2: H,
    stroke: "var(--ink)", "stroke-width": 1,
  }));
}

/* --- panell 1: dies per any ------------------------------------------------ */

function dibuixaCount(m) {
  const host = document.getElementById("c-count");
  const svg = host.querySelector("svg");
  buida(svg);
  if (!m.files.length) return;

  const W = 900, H = 340, mg = { t: 14, r: 14, b: 42, l: 46 };
  const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
  const banda = iw / m.files.length;
  const ample = Math.min(26, banda - 3);
  const max = Math.max(1, ...m.files.map((f) => f.hit + (m.apilat ? f.resta : 0)));
  const Y = (v) => mg.t + ih - (v / max) * ih;
  const X = (i) => mg.l + i * banda + banda / 2;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  for (const t of ticks(0, max, 4)) {
    svg.append(el("line", { x1: mg.l, x2: mg.l + iw, y1: Y(t), y2: Y(t), stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(el("text", { x: mg.l - 9, y: Y(t) + 4, "text-anchor": "end",
      fill: "var(--muted)", "font-size": 11 }, nf(t)));
  }

  m.files.forEach((f, i) => {
    const x = mg.l + i * banda + (banda - ample) / 2;
    const dibuixa = (base, valor, fill, opac) => {
      const h = (valor / max) * ih;
      if (h <= 0) return;
      const y = Y(base + valor);
      const r = Math.min(4, ample / 2, h);
      svg.append(el("path", {
        d: `M${x},${Y(base)} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
           `L${x + ample - r},${y} Q${x + ample},${y} ${x + ample},${y + r} L${x + ample},${Y(base)} Z`,
        fill, "fill-opacity": opac,
      }));
    };
    // La part de sota és l'època seleccionada; la de sobre, la resta de l'any.
    dibuixa(0, f.hit, f.complet ? "var(--accent)" : "var(--neutral)", 1);
    if (m.apilat && f.resta) dibuixa(f.hit, f.resta, "var(--neutral)", 0.45);

    const hit = el("rect", { x: mg.l + i * banda, y: mg.t, width: banda, height: ih, fill: "transparent" });
    hit.addEventListener("pointerenter", () => {
      const nodes = [titolTip(String(f.any) + (f.complet ? "" : ` · ${L().lPartial}`)),
                     linia(`${nf(f.hit)} ${unitat()}`, true)];
      if (m.apilat && f.resta) nodes.push(document.createElement("br"), linia(`+${nf(f.resta)} ${L().lRest}`));
      mostraTip(host, X(i), Y(f.hit + (m.apilat ? f.resta : 0)) - 8, nodes);
    });
    hit.addEventListener("pointerleave", () => amagaTip(host));
    svg.append(hit);
  });

  // Les dues línies de període: és el que explica el canvi sense parlar de pendents.
  if (m.periodes) {
    for (const p of m.periodes) {
      const i0 = m.files.findIndex((f) => f.any === p.y0);
      const i1 = m.files.findIndex((f) => f.any === p.y1);
      if (i0 < 0 || i1 < 0) continue;
      const x0 = mg.l + i0 * banda + 1, x1 = mg.l + (i1 + 1) * banda - 1;
      svg.append(el("line", { x1: x0, x2: x1, y1: Y(p.perAny), y2: Y(p.perAny),
        stroke: "var(--ink-2)", "stroke-width": 1.5 }));
      svg.append(el("text", {
        x: (x0 + x1) / 2, y: mg.t + ih + 34, "text-anchor": "middle",
        fill: "var(--ink-2)", "font-size": 11, "font-family": "var(--mono)",
      }, `${p.etiqueta} · ${nf(p.perAny, 1)} ${unitat()}/${L().any}`));
    }
  }

  etiquetesAny(svg, m.files, X, mg.t + ih + 16, iw);

  if (m.periodes) {
    const [a, b] = m.periodes;
    document.getElementById("s-count").textContent +=
      L().saltCount(nf(a.perAny, 1), nf(b.perAny, 1),
        signed(b.perAny - a.perAny, 1), unitat());
  }
}

/** Etiquetes d'any: totes les que hi càpiguen, i abans d'ometre'n cap, escurçar-les.
 *
 *  Saltar-se anys deixa el lector comptant barres per saber on és. Abans que
 *  això, es passa a dos dígits (05, 06, 07…), que ocupen la meitat. Només si
 *  encara no hi caben es posa un pas de 2, 5 o 10 anys.
 */
function etiquetesAny(svg, files, X, y, amplada) {
  const n = files.length;
  if (!n) return;
  const iw = amplada ?? (X(n - 1) - X(0));
  const perEtiqueta = iw / Math.max(1, n - 1);

  let curt = false, pas = 1;
  if (perEtiqueta < 30) curt = true;              // no hi caben quatre xifres
  const ample = curt ? 20 : 32;
  while (iw / Math.ceil(n / pas) < ample && pas < 10) pas = pas === 1 ? 2 : pas === 2 ? 5 : 10;

  const text = (a) => (curt ? String(a).slice(2) : String(a));
  for (let i = 0; i < n; i++) {
    const primer = i === 0, ultim = i === n - 1;
    if (!primer && !ultim && (n - 1 - i) % pas !== 0) continue;
    // El primer i l'últim manen; si un del pas hi cau a sobre, es descarta.
    if (!primer && !ultim && (X(i) - X(0) < ample || X(n - 1) - X(i) < ample)) continue;
    svg.append(el("text", { x: X(i), y, "text-anchor": "middle", fill: "var(--muted)", "font-size": 11 },
      text(files[i].any)));
  }
}

/* --- panell 2: mitjana anual ----------------------------------------------- */

function dibuixaMean(m) {
  const host = document.getElementById("c-mean");
  const svg = host.querySelector("svg");
  buida(svg);
  const dades = m.plens.filter((f) => f.mitjana != null);
  if (dades.length < 2) return;

  const W = 900, H = 282, mg = { t: 18, r: 14, b: 56, l: 46 };
  const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
  const vals = dades.map((f) => f.mitjana);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const marge = (hi - lo) * 0.18 || 0.5;
  const Y = (v) => mg.t + ih - ((v - (lo - marge)) / ((hi + marge) - (lo - marge))) * ih;
  const banda = iw / m.files.length;
  const X = (any) => mg.l + m.files.findIndex((f) => f.any === any) * banda + banda / 2;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  for (const t of ticks(lo - marge, hi + marge, 4)) {
    svg.append(el("line", { x1: mg.l, x2: mg.l + iw, y1: Y(t), y2: Y(t), stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(el("text", { x: mg.l - 9, y: Y(t) + 4, "text-anchor": "end",
      fill: "var(--muted)", "font-size": 11 }, nf(t, 1)));
  }

  // Una mitjana d'un tram a mitges no és un valor baix, és un altre estadístic:
  // els anys incomplets no hi surten, ni units per la línia ni com a punt.
  svg.append(el("path", {
    d: dades.map((f, k) => `${k ? "L" : "M"}${X(f.any)},${Y(f.mitjana)}`).join(" "),
    fill: "none", stroke: "var(--accent)", "stroke-width": 2,
    "stroke-linejoin": "round", "stroke-linecap": "round",
  }));

  // Les línies de període porten sempre el seu valor escrit. Una línia sense
  // número obliga el lector a estimar-la contra l'eix, que és justament el que
  // el gràfic hauria d'estalviar-li.
  if (m.periodes) {
    for (const p of m.periodes) {
      if (p.mitjana == null) continue;
      svg.append(el("line", {
        x1: X(p.y0), x2: X(p.y1), y1: Y(p.mitjana), y2: Y(p.mitjana),
        stroke: "var(--ink-2)", "stroke-width": 1.5,
      }));
      // Sota l'eix, com al gràfic de barres. Posada al mig del període queia
      // damunt de la mateixa sèrie, i cap halo no arregla una etiqueta que
      // competeix amb les dades pel mateix espai.
      svg.append(el("text", {
        x: (X(p.y0) + X(p.y1)) / 2, y: mg.t + ih + 34, "text-anchor": "middle",
        fill: "var(--ink-2)", "font-size": 11, "font-family": "var(--mono)",
      }, `${p.etiqueta} · ${nf(p.mitjana, 1)} °C`));
    }
  }

  for (const f of dades) {
    svg.append(el("circle", { cx: X(f.any), cy: Y(f.mitjana), r: 3.5, fill: "var(--accent)",
      stroke: "var(--surface)", "stroke-width": 2 }));
    const hit = el("circle", { cx: X(f.any), cy: Y(f.mitjana), r: 13, fill: "transparent" });
    hit.addEventListener("pointerenter", () =>
      mostraTip(host, X(f.any), Y(f.mitjana) - 10,
        [titolTip(String(f.any)), linia(`${nf(f.mitjana, 1)} °C`, true)]));
    hit.addEventListener("pointerleave", () => amagaTip(host));
    svg.append(hit);
  }

  etiquetesAny(svg, m.files, (i) => mg.l + i * banda + banda / 2, mg.t + ih + 16, iw);

  if (m.periodes && m.periodes[0].mitjana != null && m.periodes[1].mitjana != null) {
    const [a, b] = m.periodes;
    document.getElementById("s-mean").textContent +=
      L().saltMean(nf(a.mitjana, 1), nf(b.mitjana, 1), signed(b.mitjana - a.mitjana, 1));
  }
}

/* --- panell 3: repartiment per mesos ---------------------------------------- */

function dibuixaHeat(m) {
  const host = document.getElementById("c-heat");
  const svg = host.querySelector("svg");
  buida(svg);
  if (!m.files.length) return;

  const W = 900, mg = { t: 14, r: 14, b: 26, l: 46 };
  const cw = (W - mg.l - mg.r) / m.files.length;
  const ch = 15;
  const H = mg.t + ch * 12 + mg.b;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  let max = 0;
  for (const f of m.files) for (let mes = 1; mes <= 12; mes++) max = Math.max(max, f.cel[mes].c);

  // Mesos excepcionals: aquells en què el fenomen gairebé no passa mai. Una
  // mínima de 25 °C el març és la cel·la més noticiable de tot el gràfic, i amb
  // una escala lineal era pràcticament invisible al costat d'un juliol ple.
  const anysAmb = {};
  for (let mes = 1; mes <= 12; mes++) {
    anysAmb[mes] = m.files.filter((f) => f.cel[mes].c > 0).length;
  }
  const rar = (mes) => anysAmb[mes] > 0 && anysAmb[mes] <= Math.max(1, m.files.length * 0.25);

  for (let mes = 1; mes <= 12; mes++) {
    svg.append(el("text", {
      x: mg.l - 9, y: mg.t + (mes - 0.5) * ch + 4, "text-anchor": "end",
      fill: "var(--muted)", "font-size": 10.5,
    }, L().mesos[mes - 1]));
  }

  const excepcionals = [];
  m.files.forEach((f, i) => {
    for (let mes = 1; mes <= 12; mes++) {
      const c = f.cel[mes];
      const x = mg.l + i * cw, y = mg.t + (mes - 1) * ch;
      const wd = Math.max(1, cw - 1);

      // Una sola tinta, més fosca com més dies: mai un arc de Sant Martí.
      // L'escala és d'arrel i amb terra: qualsevol cel·la amb un sol dia ja es
      // veu clarament diferent d'una de zero. Amb escala lineal, un dia sobre
      // trenta es confonia amb el buit.
      let fill = "var(--neutral)", opac = 0.1;
      if (c.n && c.c > 0) { fill = "var(--accent)"; opac = 0.3 + 0.7 * Math.sqrt(c.c / max); }
      else if (c.n) { fill = "var(--neutral)", opac = 0.16; }
      svg.append(el("rect", { x, y, width: wd, height: ch - 1, rx: 1, fill, "fill-opacity": opac }));

      if (c.c > 0 && rar(mes)) {
        svg.append(el("rect", {
          x: x + 0.5, y: y + 0.5, width: wd - 1, height: ch - 2, rx: 1,
          fill: "none", stroke: "var(--ink)", "stroke-width": 1.5,
        }));
        excepcionals.push({ mes, any: f.any, c: c.c });
      }

      const hit = el("rect", { x, y, width: wd, height: ch - 1, fill: "transparent" });
      hit.addEventListener("pointerenter", () =>
        mostraTip(host, x + cw / 2, y - 2,
          [titolTip(`${L().mesos[mes - 1]} ${f.any}`),
           linia(`${nf(c.c)} ${unitat()}`, true),
           linia(` / ${nf(c.n)}`)]));
      hit.addEventListener("pointerleave", () => amagaTip(host));
      svg.append(hit);
    }
  });
  // Es diuen pel seu nom, a més de marcar-les: ningú espera una mínima de 25 °C
  // el març, i el gràfic ho ha de dir amb paraules i no només amb un requadre.
  if (excepcionals.length) {
    const noms = excepcionals
      .slice(0, 6)
      .map((e) => `${L().mesos[e.mes - 1]} ${e.any}`)
      .join(", ");
    const sobren = excepcionals.length - 6;
    document.getElementById("s-heat").textContent +=
      L().sHeatRar(noms + (sobren > 0 ? ` (i ${sobren} més)` : ""));
  }

  etiquetesAny(svg, m.files, (i) => mg.l + i * cw + cw / 2, H - 8, cw * m.files.length);
}

/* --- text ------------------------------------------------------------------ */

function dibuixaText(m) {
  const t = L(), P = m.periodes, recent = P ? P[1] : null;

  const fig = document.getElementById("hero-fig");
  buida(fig);
  if (recent) {
    fig.append(document.createTextNode(nf(recent.perAny, 1)));
    const u = document.createElement("span");
    u.className = "unit";
    u.textContent = `${unitat()}/${t.any}`;
    fig.append(u);
  } else fig.textContent = "—";

  document.getElementById("hero-cap").textContent =
    recent ? t.heroCap(recent.etiqueta, ST.nom) : t.heroShort;

  const dEl = document.getElementById("hero-delta");
  buida(dEl);
  if (P) {
    const d = P[1].perAny - P[0].perAny;
    dEl.append(document.createTextNode((d > 0 ? "▲" : d < 0 ? "▼" : "▬") + " "));
    dEl.append(linia(`${signed(d, 1)} ${unitat()}/${t.any}`, true));
    dEl.append(document.createTextNode(` ${t.deltaVs} ${P[0].etiqueta} (`));
    dEl.append(linia(nf(P[0].perAny, 1), true));
    dEl.append(document.createTextNode(")"));
  }

  const sEl = document.getElementById("sentence");
  if (P && P[0].mitjana != null && P[1].mitjana != null) {
    const d = P[1].perAny - P[0].perAny;
    const dm = P[1].mitjana - P[0].mitjana;
    // El nom de l'estació ve de l'API: es neteja abans d'entrar a l'HTML.
    sEl.innerHTML = t.sentence({
      estacio: escapa(ST.nom), unitat: unitat(), varCurt: t.vars[state.v].curt,
      cond: thrText(), frase: t.seasonPhrase[state.season],
      a: nf(P[0].perAny, 1), b: nf(P[1].perAny, 1),
      verb: Math.abs(d) < 0.5 ? t.verbFlat : d > 0 ? t.verbUp : t.verbDown,
      m0: nf(P[0].mitjana, 1), m1: nf(P[1].mitjana, 1), dm: signed(dm, 1),
    });
  } else sEl.textContent = t.heroShort;

  // placa
  const pl = document.getElementById("plate");
  buida(pl);
  const fila = (k, v) => {
    const d = document.createElement("div");
    const a = document.createElement("span"); a.className = "k"; a.textContent = k;
    const b = document.createElement("span"); b.className = "v"; b.textContent = v;
    d.append(a, b);
    return d;
  };
  const anys = Object.keys(ST.anys).map(Number);
  pl.append(fila(t.plate.station, ST.nom));
  if (ST.municipi) pl.append(fila(t.plate.muni, ST.municipi));
  if (ST.altitud != null) pl.append(fila(t.plate.alt, `${nf(ST.altitud)} m`));
  pl.append(fila(t.plate.serie, `${Math.min(...anys)}–${Math.max(...anys)}`));
  pl.append(fila(t.plate.dies, nf(Object.values(ST.anys).reduce((a, y) => a + y.n, 0))));
  if (ST.estat && ST.estat !== "Operativa") pl.append(fila(t.plate.estat, t.desmantellada));

  // targetes
  const tiles = document.getElementById("tiles");
  buida(tiles);
  if (!m.files.length) return;
  const total = m.files.reduce((a, f) => a + f.hit, 0);
  const obs = m.files.reduce((a, f) => a + f.obs, 0);
  const cim = m.files.reduce((a, b) => (b.hit > a.hit ? b : a));
  const sufix = state.season === "any" ? "" : ` (${t.tAnual})`;

  const tile = (k, v, u, s) => {
    const d = document.createElement("div"); d.className = "tile";
    const a = document.createElement("div"); a.className = "k"; a.textContent = k;
    const b = document.createElement("div"); b.className = "v"; b.textContent = v;
    if (u) { const uu = document.createElement("span"); uu.className = "u"; uu.textContent = " " + u; b.append(uu); }
    const c = document.createElement("div"); c.className = "s"; c.textContent = s;
    d.append(a, b, c);
    return d;
  };
  tiles.append(tile(t.tTotal, nf(total), unitat(), t.tTotalSub(nf(obs))));
  tiles.append(tile(t.tPeak(unitat()), String(cim.any), "",
    `${nf(cim.hit)} ${unitat()}${cim.complet ? "" : " · " + t.tPartial}`));
  if (m.rec) {
    tiles.append(tile(t.tHigh + sufix, `${nf(m.rec.alt, 1)} °C`, "", dataLlarga(m.rec.altData)));
    tiles.append(tile(t.tLow + sufix, `${nf(m.rec.baix, 1)} °C`, "", dataLlarga(m.rec.baixData)));
  }

  // capçaleres
  const u = majuscula(unitat());
  document.getElementById("t-count").textContent = t.pCount(u, thrText());
  document.getElementById("s-count").textContent =
    t.sCount + (m.apilat ? " " + t.sCountStack : "");
  document.getElementById("t-mean").textContent =
    t.pMean(majuscula(t.vars[state.v].curt), t.seasonPhrase[state.season]);
  document.getElementById("s-mean").textContent = t.sMean;
  document.getElementById("t-heat").textContent = t.pHeat(u, thrText());
  document.getElementById("s-heat").textContent = t.sHeat;

  llegenda(m);
}

const majuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function escapa(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function dataLlarga(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(state.lang === "ca" ? "ca-ES" : "en-GB", { dateStyle: "long" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

function llegenda(m) {
  const t = L();
  const posa = (id, items) => {
    const c = document.getElementById(id);
    buida(c);
    for (const [cls, text] of items) {
      const s = document.createElement("span");
      const i = document.createElement("i");
      i.className = cls;
      s.append(i, document.createTextNode(text));
      c.append(s);
    }
  };
  const count = [["swatch", t.seasons[state.season]]];
  if (m.apilat) count.push(["swatch na", t.lRest]);
  if (m.periodes) count.push(["rule-key", t.lPeriod]);
  if (m.files.some((f) => !f.complet)) count.push(["swatch na", t.lPartial]);
  posa("l-count", count);
  posa("l-mean", m.periodes ? [["rule-key", t.lPeriod]] : []);

  const heat = document.getElementById("l-heat");
  buida(heat);
  let max = 0;
  for (const f of m.files) for (let mes = 1; mes <= 12; mes++) max = Math.max(max, f.cel[mes].c);
  const bar = document.createElement("div");
  bar.className = "scale-bar";
  bar.style.background = "linear-gradient(to right, color-mix(in srgb, var(--accent) 8%, var(--heat-base)), var(--accent))";
  heat.append(document.createTextNode("0"), bar, document.createTextNode(nf(max)));
}

/* --- taula ------------------------------------------------------------------ */

function dibuixaTaula(m) {
  const t = L();
  const head = document.getElementById("t-head");
  buida(head);
  const cols = [t.thYear, `${t.thDays} (${unitat()})`, ...(m.apilat ? [t.thRest] : []),
                `${t.thMean} (°C)`, t.thObs, t.thCov];
  for (const c of cols) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = c;
    head.append(th);
  }
  const tb = document.querySelector("#tabla tbody");
  buida(tb);
  for (const f of m.files) {
    const tr = document.createElement("tr");
    if (!f.complet) tr.className = "partial";
    const vals = [String(f.any), nf(f.hit), ...(m.apilat ? [nf(f.resta)] : []),
                  f.mitjana == null ? "—" : nf(f.mitjana, 1), nf(f.obs),
                  nf(f.cobertura * 100, 0) + " %"];
    for (const v of vals) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.append(td);
    }
    tb.append(tr);
  }
}

/* --- controls ---------------------------------------------------------------- */

function omplirEstacions() {
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

function textosFixos() {
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
      render();
    });
    pl.append(b);
  }
}

function nomPreset(p) {
  const noms = {
    ca: { nit_tropical: "Nit tropical", nit_torrida: "Nit tòrrida", dia_estiu: "Dia d'estiu",
          dia_caloros: "Dia calorós", dia_torrid: "Dia tòrrid", glacada: "Glaçada" },
    en: { nit_tropical: "Tropical night", nit_torrida: "Torrid night", dia_estiu: "Summer day",
          dia_caloros: "Hot day", dia_torrid: "Scorching day", glacada: "Frost day" },
  };
  return noms[state.lang][p.id] || p.id;
}

function sincronitza() {
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

function llegeixHash() {
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
}

function escriuHash() {
  const p = new URLSearchParams({
    st: state.st, v: state.v, op: state.op, thr: String(state.thr),
    season: state.season, y: `${state.y0}-${state.y1}`, lang: state.lang,
  });
  if (state.split != null) p.set("split", String(state.split));
  history.replaceState(null, "", "#" + p.toString());
}

/* --- render ------------------------------------------------------------------ */

function render() {
  sincronitza();
  const m = model();
  dibuixaHist(m);
  dibuixaText(m);
  dibuixaCount(m);
  dibuixaMean(m);
  dibuixaHeat(m);
  dibuixaTaula(m);
  document.getElementById("split-val").textContent =
    `${m.tall ?? "—"}${state.split == null ? " · " + L().auto : ""}`;
  peu();
  escriuHash();
}

function peu() {
  const t = L();
  const d = new Intl.DateTimeFormat(state.lang === "ca" ? "ca-ES" : "en-GB", { dateStyle: "long" });
  const dh = new Intl.DateTimeFormat(state.lang === "ca" ? "ca-ES" : "en-GB",
    { dateStyle: "long", timeStyle: "short" });
  document.getElementById("x-footer").innerHTML = t.footer({
    dataset: DATASET, legal: LEGAL, codi: REPO,
    metodologia: `${REPO}/blob/main/docs/METODOLOGIA.md`,
    crues: escapa(ST.source_url),
    font: dh.format(new Date(META.source_last_updated)),
    generat: d.format(new Date(META.generated_at)),
  });
}

async function carregaEstacio(codi) {
  const r = await fetch(`data/st/${encodeURIComponent(codi)}.json`);
  ST = await r.json();
  const anys = Object.keys(ST.anys).map(Number);
  const lo = Math.min(...anys), hi = Math.max(...anys);
  if (state.y0 == null || state.y0 < lo || state.y0 > hi) state.y0 = lo;
  if (state.y1 == null || state.y1 > hi || state.y1 < lo) state.y1 = hi;
  state.split = null;
}

function initControls() {
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

(async function () {
  [META, INDEX] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetch("data/index.json").then((r) => r.json()),
  ]);
  COMPLETESA = META.qc?.rules?.year_completeness ?? 0.95;

  llegeixHash();
  // Badalona-Museu per defecte: és l'estació que va originar el projecte.
  if (!state.st || !INDEX.some((s) => s.codi === state.st)) state.st = "WU";

  omplirEstacions();
  initControls();
  textosFixos();
  await carregaEstacio(state.st);
  render();
})();
