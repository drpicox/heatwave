/* Nits de calor a Catalunya — portada.
 *
 * Tot el que es dibuixa aqui es calcula al navegador a partir dels histogrames
 * anuals que publica el pipeline. Per aixo el llindar pot ser un slider: moure'l
 * es tornar a sumar uns quants centenars d'enters, no tornar a demanar res.
 *
 * SVG a ma i cap dependencia externa. La pagina ha de seguir funcionant d'aqui
 * a deu anys i des d'una copia local.
 */

import { T, nomMetrica, nomDrecera } from "./strings.ca.js";

/* --- estat --------------------------------------------------------------- */

const FINESTRES = [
  { id: "2006-2025", de: 2006, a: 2025 },
  { id: "1996-2025", de: 1996, a: 2025 },
];

/* Fraccio d'anys de la finestra que una estacio ha de tenir complets per entrar
 * a la comparacio. Sense aquest filtre es barrejarien estacions amb historics de
 * longitud diferent, que es la manera mes facil d'inventar-se una tendencia. */
const COBERTURA = 0.9;

const state = {
  // Per defecte la mitjana d'estiu, i no el recompte de nits tropicals, perque
  // es l'unica de les dues que val a totes les altituds: una estacio de muntanya
  // que no arriba mai als 20 graus te tendencia zero per construccio, i aixo no
  // vol dir que no s'escalfi.
  metrica: "jja",
  variable: "tn",
  op: ">=",
  llindar: 20,
  finestra: "2006-2025",
  estacio: null,
};

let META = null;
let ESTACIONS = [];
const HIST = {};

const nf = (d = 0) =>
  new Intl.NumberFormat("ca-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

const unitat = () => T.metriques[state.metrica].unitat;
const dec = () => T.metriques[state.metrica].decimals;
const signe = (v, d = dec()) => (v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v));

/* --- estadistica --------------------------------------------------------- */

/** Mediana de tots els pendents entre parelles de punts (Theil-Sen).
 *  No parametrica i robusta a valors extrems, que es el que toca amb series
 *  curtes i sorolloses. */
function theilSen(xs, ys) {
  if (xs.length < 5) return null;
  const s = [];
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++) {
      const dx = xs[j] - xs[i];
      if (dx) s.push((ys[j] - ys[i]) / dx);
    }
  return s.length ? mediana(s) : null;
}

function mediana(a) {
  const v = [...a].sort((x, y) => x - y);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/* --- histogrames --------------------------------------------------------- */

/** Dies per damunt (o per sota) del llindar, a partir d'un histograma dispers.
 *
 *  L'histograma es `[offset, c0, c1, ...]` amb bins d'1 grau semioberts: el bin
 *  k conte els valors de [k, k+1). Nomes dues operacions son exactes amb aquesta
 *  graella, i son justament aquestes dues. */
function compta(h, llindar, op) {
  if (!h) return 0;
  const off = h[0];
  let n = 0;
  for (let i = 1; i < h.length; i++) {
    const bin = off + i - 1;
    if (op === ">=" ? bin >= llindar : bin < llindar) n += h[i];
  }
  return n;
}

async function histograma(variable) {
  if (!HIST[variable]) {
    const r = await fetch(`data/hist-${variable}.json`);
    HIST[variable] = (await r.json()).stations;
  }
  return HIST[variable];
}

/* --- calcul per estacio -------------------------------------------------- */

function finestraActual() {
  return FINESTRES.find((f) => f.id === state.finestra);
}

/** Serie anual d'una estacio dins la finestra.
 *
 *  Els anys que no passen el control de completesa no entren mai a `vals`, que
 *  es el que alimenta la tendencia. Quan es demana, tornen a part com a
 *  `parcials`, per poder-los dibuixar marcats en comptes d'amagar-los. */
function serie(est, hist, fin, { nomesComplets = true } = {}) {
  const anys = [], vals = [], parcials = [];

  if (state.metrica === "jja") {
    const camp = state.variable === "tn" ? "jja_tn" : "jja_tx";
    for (const y of est.years) {
      if (y.y < fin.de || y.y > fin.a) continue;
      const v = y[camp];
      if (v == null) continue;
      // Aqui mana la completesa de juny-agost, no la de l'any sencer.
      if (y.jc) { anys.push(y.y); vals.push(v); }
      else if (!nomesComplets) parcials.push({ any: y.y, valor: v, ongoing: y.og });
    }
    return { anys, vals, parcials };
  }

  const h = hist[est.codi];
  if (!h) return null;
  for (const y of est.years) {
    if (y.y < fin.de || y.y > fin.a) continue;
    const hh = h[String(y.y)];
    if (!hh) continue;
    const v = compta(hh, state.llindar, state.op);
    if (y.c) { anys.push(y.y); vals.push(v); }
    else if (!nomesComplets) parcials.push({ any: y.y, valor: v, ongoing: y.og });
  }
  return { anys, vals, parcials };
}

function calcula(hist) {
  const fin = finestraActual();
  const calen = Math.ceil((fin.a - fin.de + 1) * COBERTURA);
  const punts = [];
  for (const est of ESTACIONS) {
    if (est.altitud == null) continue;
    const s = serie(est, hist, fin);
    if (!s || s.anys.length < calen) continue;
    const pendent = theilSen(s.anys, s.vals);
    if (pendent == null) continue;
    punts.push({
      est,
      decada: pendent * 10,
      mitjana: s.vals.reduce((a, b) => a + b, 0) / s.vals.length,
      nAnys: s.anys.length,
      destacada: DESTACADES.has(est.codi),
    });
  }
  return punts;
}

let DESTACADES = new Set();

/* --- SVG ----------------------------------------------------------------- */

const NS = "http://www.w3.org/2000/svg";

function sv(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

/** Ticks rodons dins d'un rang. */
function ticks(min, max, n = 5) {
  const cru = (max - min) / n || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(cru))));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= cru) || mag * 10;
  const out = [];
  for (let v = Math.ceil(min / pas) * pas; v <= max + 1e-9; v += pas) out.push(+v.toFixed(6));
  return out;
}

/* --- dispersio: tendencia contra altitud --------------------------------- */

function dibuixaDispersio(punts) {
  const cont = document.getElementById("scatter");
  cont.textContent = "";
  const tip = document.getElementById("tip");

  if (!punts.length) {
    cont.append(Object.assign(document.createElement("p"), {
      className: "sub", textContent: T.ui.cap,
    }));
    return;
  }

  const W = 900, H = 460;
  const m = { t: 16, r: 24, b: 46, l: 62 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;

  const altMax = Math.max(...punts.map((p) => p.est.altitud));
  const ys = punts.map((p) => p.decada);
  let yMin = Math.min(0, ...ys), yMax = Math.max(0, ...ys);
  const pad = (yMax - yMin) * 0.08 || 1;
  yMin -= pad; yMax += pad;

  const X = (v) => m.l + (v / (altMax * 1.04)) * iw;
  const Y = (v) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih;

  const svg = sv("svg", {
    viewBox: `0 0 ${W} ${H}`, width: W, height: H,
    role: "img", "aria-label": document.getElementById("scatter-title").textContent,
  });

  // Graella horitzontal: hairline solida, mai discontinua.
  for (const t of ticks(yMin, yMax, 5)) {
    svg.append(sv("line", { x1: m.l, x2: m.l + iw, y1: Y(t), y2: Y(t), class: "gridline" }));
    svg.append(sv("text", { x: m.l - 10, y: Y(t) + 4, "text-anchor": "end", class: "tick" },
      nf(dec()).format(t)));
  }
  // El zero es la referencia que importa: cap tendencia o tendencia a la baixa.
  svg.append(sv("line", { x1: m.l, x2: m.l + iw, y1: Y(0), y2: Y(0), class: "axisline" }));

  for (const t of ticks(0, altMax * 1.04, 5)) {
    svg.append(sv("text", { x: X(t), y: m.t + ih + 20, "text-anchor": "middle", class: "tick" },
      nf(0).format(t)));
  }
  svg.append(sv("text", { x: m.l + iw, y: H - 6, "text-anchor": "end", class: "axis-label" },
    `altitud de l'estació (${T.unitats.metres})`));
  svg.append(sv("text", {
    x: 14, y: m.t + ih / 2, class: "axis-label", "text-anchor": "middle",
    transform: `rotate(-90 14 ${m.t + ih / 2})`,
  }, `tendència (${unitat()})`));

  // Context primer, emfasi a sobre: el gris no ha de tapar mai el blau.
  const ordenats = [...punts].sort((a, b) => a.destacada - b.destacada);
  for (const p of ordenats) {
    const x = X(p.est.altitud), y = Y(p.decada);
    const g = sv("g");
    g.append(sv("circle", {
      cx: x, cy: y, r: p.destacada ? 6 : 4.5,
      fill: p.destacada ? "var(--accent)" : "var(--muted)",
      "fill-opacity": p.destacada ? 1 : 0.55,
      class: "dot-ring",
    }));
    // L'area sensible es molt mes gran que el punt: ningu encerta un cercle de 9 px.
    const hit = sv("circle", { cx: x, cy: y, r: 13, class: "hit" });
    if (p.destacada) { hit.setAttribute("tabindex", "0"); hit.setAttribute("role", "button"); }
    hit.setAttribute("aria-label", `${p.est.nom}, ${p.est.altitud} m, ${signe(p.decada)} ${unitat()}`);

    const mostra = (ev) => {
      const r = cont.getBoundingClientRect();
      const px = (ev.clientX ?? r.left + x * (r.width / W)) - r.left;
      const py = (ev.clientY ?? r.top + y * (r.width / W)) - r.top;
      tip.textContent = "";
      const v = document.createElement("span");
      v.className = "v";
      v.textContent = `${signe(p.decada)} ${unitat()}`;
      const n = document.createElement("span");
      n.className = "n";
      // Els noms venen de l'API: textContent i mai innerHTML.
      n.textContent = p.est.nom || p.est.codi;
      const d = document.createElement("span");
      d.className = "m";
      const mitjana = state.metrica === "jja"
        ? `${nf(1).format(p.mitjana)} °C de mitjana`
        : `${nf(0).format(p.mitjana)} ${T.unitats.dies}/any de mitjana`;
      d.textContent = `${nf(0).format(p.est.altitud)} m · ${p.nAnys} anys · ${mitjana}`;
      tip.append(v, n, document.createElement("br"), d);
      tip.dataset.show = "1";
      tip.style.left = Math.min(px + 14, cont.clientWidth - 200) + "px";
      tip.style.top = Math.max(py - 10, 0) + "px";
    };
    const amaga = () => { tip.dataset.show = "0"; };

    hit.addEventListener("pointermove", mostra);
    hit.addEventListener("pointerleave", amaga);
    hit.addEventListener("focus", mostra);
    hit.addEventListener("blur", amaga);
    hit.addEventListener("click", () => selecciona(p.est.codi));
    hit.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selecciona(p.est.codi); }
    });

    g.append(hit);
    svg.append(g);
  }

  cont.append(svg);
}

/* --- serie d'una estacio -------------------------------------------------- */

function dibuixaEstacio(est, hist) {
  const cont = document.getElementById("station-chart");
  cont.textContent = "";

  // Aqui es mostra tot l'historic, no nomes la finestra: la fitxa d'una estacio
  // ha d'ensenyar el que te.
  const tot = { de: -Infinity, a: Infinity };
  const s = serie(est, hist, tot, { nomesComplets: false });

  // En un recompte, un any incomplet es un subrecompte: te sentit ensenyar-lo
  // marcat, perque el lector veu que la barra es curta perque falten dies. En una
  // MITJANA no: un estiu a mitges no dona un valor baix, dona un altre estadistic,
  // i pintar-lo convida a llegir-lo com si fos comparable. Per aixo s'omet.
  const mostraParcials = state.metrica !== "jja";
  const files = [
    ...s.anys.map((a, i) => ({ any: a, valor: s.vals[i], complet: true })),
    ...(mostraParcials
      ? s.parcials.map((p) => ({ any: p.any, valor: p.valor, complet: false, ongoing: p.ongoing }))
      : []),
  ].sort((a, b) => a.any - b.any);

  if (!files.length) return;

  const W = 900, H = 300;
  const m = { t: 22, r: 16, b: 42, l: 52 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const banda = iw / files.length;

  // Un recompte comenca a zero i es dibuixa amb barres. Una temperatura mitjana
  // no comenca a zero: amb barres caldria truncar l'eix, que es exactament la
  // manera d'exagerar una diferencia petita. Per aixo va amb linia.
  const barres = state.metrica !== "jja";
  const vals = files.map((f) => f.valor);
  const vMax = barres ? Math.max(1, ...vals) : Math.max(...vals);
  const vMin = barres ? 0 : Math.min(...vals);
  const marge = barres ? 0 : (vMax - vMin) * 0.15 || 0.5;
  const lo = vMin - marge, hi = vMax + marge;
  const Y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
  const X = (i) => m.l + i * banda + banda / 2;

  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img",
    "aria-label": `Sèrie anual de ${est.nom}` });

  for (const t of ticks(lo, hi, 4)) {
    svg.append(sv("line", { x1: m.l, x2: m.l + iw, y1: Y(t), y2: Y(t), class: "gridline" }));
    svg.append(sv("text", { x: m.l - 10, y: Y(t) + 4, "text-anchor": "end", class: "tick" },
      nf(barres ? 0 : 1).format(t)));
  }

  if (barres) {
    const ample = Math.min(24, banda - 2);  // mai omplir la banda: l'aire hi compta
    files.forEach((f, i) => {
      const x = m.l + i * banda + (banda - ample) / 2;
      const h = m.t + ih - Y(f.valor);
      const y = Y(f.valor);
      const r = Math.min(4, ample / 2, h);  // extrem arrodonit, base quadrada
      if (h > 0) {
        svg.append(sv("path", {
          d: `M${x},${m.t + ih} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
             `L${x + ample - r},${y} Q${x + ample},${y} ${x + ample},${y + r} ` +
             `L${x + ample},${m.t + ih} Z`,
          fill: f.complet ? "var(--accent)" : "var(--muted)",
          "fill-opacity": f.complet ? 1 : 0.45,
        }));
      }
    });
  } else {
    // Els anys incomplets no s'uneixen amb la linia: es dibuixen com a punts
    // solts, perque una linia continua faria creure que la serie no te forats.
    const complets = files.filter((f) => f.complet);
    const d = complets
      .map((f, k) => `${k ? "L" : "M"}${X(files.indexOf(f))},${Y(f.valor)}`)
      .join(" ");
    if (d) {
      svg.append(sv("path", {
        d, fill: "none", stroke: "var(--accent)", "stroke-width": 2,
        "stroke-linejoin": "round", "stroke-linecap": "round",
      }));
    }
    for (const f of files) {
      svg.append(sv("circle", {
        cx: X(files.indexOf(f)), cy: Y(f.valor), r: 4,
        fill: f.complet ? "var(--accent)" : "var(--muted)",
        "fill-opacity": f.complet ? 1 : 0.5,
        class: "dot-ring",
      }));
    }
  }

  // Etiquetes de l'eix sense trepitjar-se: es proposen el primer, l'ultim i els
  // multiples de cinc, i despres es descarta qualsevol que caigui massa a prop
  // d'una altra. Val mes una etiqueta de menys que dos numeros encavalcats.
  const SEPARACIO = 42;
  const posades = [];
  const candidats = files
    .map((f, i) => ({ i, any: f.any }))
    .filter((c) => c.i === 0 || c.i === files.length - 1 || c.any % 5 === 0)
    .sort((a, b) => (a.i === 0 || a.i === files.length - 1 ? -1 : 0) -
                    (b.i === 0 || b.i === files.length - 1 ? -1 : 0));
  for (const c of candidats) {
    const x = X(c.i);
    if (posades.some((p) => Math.abs(p - x) < SEPARACIO)) continue;
    posades.push(x);
    svg.append(sv("text", { x, y: m.t + ih + 18, "text-anchor": "middle", class: "tick" },
      String(c.any)));
  }

  // Etiqueta selectiva: nomes l'extrem, mai un numero a cada punt.
  const complets = files.filter((f) => f.complet);
  if (complets.length) {
    const cim = complets.reduce((a, b) => (b.valor > a.valor ? b : a));
    svg.append(sv("text", {
      x: X(files.indexOf(cim)), y: Y(cim.valor) - 10, "text-anchor": "middle", class: "tick",
    }, `${nf(barres ? 0 : 1).format(cim.valor)}${barres ? "" : " °C"} el ${cim.any}`));
  }

  document.getElementById("station-chart").append(svg);

  const cap = document.getElementById("station-caption");
  cap.textContent = "";
  const txt = document.createElement("span");
  if (mostraParcials) {
    const parcials = files.filter((f) => !f.complet).map((f) => f.any);
    txt.textContent = parcials.length
      ? `En gris, els anys sense prou dades (${parcials.join(", ")}): ${T.ui.anyParcial}.`
      : "Tots els anys de la sèrie passen el filtre de completesa.";
  } else {
    const omesos = s.parcials.map((p) => p.any);
    txt.textContent = omesos.length
      ? `S'han omès ${omesos.length} anys sense prou dades de juny a agost ` +
        `(${omesos.join(", ")}): una mitjana d'un estiu a mitges no és comparable amb les altres.`
      : "Tots els estius de la sèrie tenen prou dades.";
  }
  cap.append(txt);
  const a = document.createElement("a");
  a.href = `https://analisi.transparenciacatalunya.cat/resource/7bvh-jvq2.csv?$where=codi_estacio='${encodeURIComponent(est.codi)}'&$order=data_lectura`;
  a.textContent = T.ui.dadesCrues;
  a.rel = "noopener";
  cap.append(" ", a, ".");
}

/* --- taula equivalent ----------------------------------------------------- */

function dibuixaTaula(punts) {
  document.getElementById("th-tend").textContent = `Tendència (${unitat()})`;
  document.getElementById("th-mitj").textContent =
    state.metrica === "jja" ? "Mitjana (°C)" : "Mitjana (dies/any)";

  const tb = document.querySelector("#tabla tbody");
  tb.textContent = "";
  for (const p of [...punts].sort((a, b) => b.decada - a.decada)) {
    const tr = document.createElement("tr");
    const cel = (t, num) => {
      const td = document.createElement("td");
      if (num) td.className = "num";
      td.textContent = t;
      return td;
    };
    tr.append(
      cel(p.est.nom || p.est.codi),
      cel(nf(0).format(p.est.altitud), true),
      cel(signe(p.decada), true),
      cel(nf(state.metrica === "jja" ? 1 : 0).format(p.mitjana), true),
      cel(String(p.nAnys), true)
    );
    tb.append(tr);
  }
}

/* --- xifra principal ------------------------------------------------------ */

async function dibuixaHero(punts) {
  const drecera = nomDrecera(META.presets, state.variable, state.op, state.llindar);

  document.getElementById("hero-figure").textContent =
    punts.length ? `${signe(mediana(punts.map((p) => p.decada)))} ${unitat()}` : "—";

  const cap = document.getElementById("hero-caption");
  cap.textContent = "";
  const forta = document.createElement("strong");
  forta.textContent = state.metrica === "jja"
    ? nomMetrica("jja", state.variable)
    : (drecera ? drecera.plural : nomMetrica("llindar", state.variable, state.op, state.llindar));
  cap.append(
    state.metrica === "jja" ? "Variació mediana de la " : "Variació mediana de les ", forta,
    ` per dècada entre ${state.finestra.replace("-", " i ")}, sobre ${punts.length} estacions `,
    `amb almenys el ${Math.round(COBERTURA * 100)} % dels anys complets. `
  );
  const r = pearson(punts.map((p) => p.est.altitud), punts.map((p) => p.decada));
  if (r != null) {
    cap.append(`Correlació amb l'altitud: r = ${nf(2).format(r)}.`);
  }

  // La comparacio entre finestres es el nucli metodologic del projecte, aixi que
  // es calcula sempre i es ensenya al costat, no amagada a la documentacio.
  const cont = document.getElementById("windows");
  cont.textContent = "";
  const hist = await histograma(state.variable);
  const guardat = state.finestra;
  for (const f of FINESTRES) {
    state.finestra = f.id;
    const p = calcula(hist);
    const d = document.createElement("div");
    const k = document.createElement("span"); k.className = "k";
    k.textContent = `${f.de}–${f.a} · ${p.length} estacions`;
    const v = document.createElement("span"); v.className = "v";
    v.textContent = p.length ? `${signe(mediana(p.map((x) => x.decada)))} ${unitat()}` : "—";
    d.append(k, v);
    cont.append(d);
  }
  state.finestra = guardat;
}

/* --- controls -------------------------------------------------------------- */

function construeixControls() {
  const met = document.getElementById("met-seg");
  for (const k of ["jja", "llindar"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = T.metriques[k].nom;
    b.addEventListener("click", () => { state.metrica = k; render(); });
    met.append(b);
  }

  const seg = document.getElementById("var-seg");
  for (const v of ["tn", "tx"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = T.variables[v].curt;
    b.setAttribute("aria-pressed", String(state.variable === v));
    b.addEventListener("click", () => { state.variable = v; state.estacio = null; render(); });
    seg.append(b);
  }

  const win = document.getElementById("win-seg");
  for (const f of FINESTRES) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `${f.de}–${f.a}`;
    b.setAttribute("aria-pressed", String(state.finestra === f.id));
    b.addEventListener("click", () => { state.finestra = f.id; render(); });
    win.append(b);
  }

  const pre = document.getElementById("presets");
  for (const p of META.presets) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = (T.presets[p.id] || {}).nom || p.id;
    b.addEventListener("click", () => {
      // Triar una drecera vol dir voler el recompte, no la mitjana.
      state.metrica = "llindar";
      state.variable = p.var; state.op = p.op; state.llindar = p.value;
      render();
    });
    pre.append(b);
  }

  const sl = document.getElementById("llindar");
  sl.addEventListener("input", () => {
    state.metrica = "llindar";
    state.llindar = +sl.value;
    state.op = ">=";
    render();
  });
}

function sincronitzaControls() {
  const llindars = state.metrica === "llindar";

  [...document.getElementById("met-seg").children].forEach((b, i) =>
    b.setAttribute("aria-pressed", String(["jja", "llindar"][i] === state.metrica)));
  [...document.getElementById("var-seg").children].forEach((b, i) =>
    b.setAttribute("aria-pressed", String(["tn", "tx"][i] === state.variable)));
  [...document.getElementById("win-seg").children].forEach((b, i) =>
    b.setAttribute("aria-pressed", String(FINESTRES[i].id === state.finestra)));
  [...document.getElementById("presets").children].forEach((b, i) => {
    const p = META.presets[i];
    b.setAttribute("aria-pressed", String(llindars &&
      p.var === state.variable && p.op === state.op && p.value === state.llindar));
  });

  const sl = document.getElementById("llindar");
  sl.value = state.llindar;
  document.getElementById("llindar-out").textContent =
    `${state.op === ">=" ? "≥" : "<"} ${state.llindar} °C`;
  // El llindar no vol dir res quan es mesura la mitjana: es desactiva en comptes
  // de deixar-lo actiu sense efecte.
  document.getElementById("llindar-control").dataset.inactiu = String(!llindars);
  sl.disabled = !llindars;

  document.getElementById("avis-zero").hidden = !llindars;
}

function selecciona(codi) {
  state.estacio = state.estacio === codi ? null : codi;
  render();
}

/* --- render ---------------------------------------------------------------- */

async function render() {
  sincronitzaControls();
  const hist = await histograma(state.variable);
  const punts = calcula(hist);

  document.getElementById("scatter-title").textContent = state.metrica === "jja"
    ? `Tendència de la ${nomMetrica("jja", state.variable)} contra l'altitud`
    : `Tendència de les ${nomMetrica("llindar", state.variable, state.op, state.llindar)} contra l'altitud`;

  await dibuixaHero(punts);
  dibuixaDispersio(punts);
  dibuixaTaula(punts);

  const card = document.getElementById("station-card");
  if (state.estacio) {
    const est = ESTACIONS.find((e) => e.codi === state.estacio);
    card.hidden = false;
    document.getElementById("station-name").textContent = est.nom || est.codi;
    document.getElementById("station-meta").textContent =
      [est.municipi, est.comarca, est.altitud != null ? `${nf(0).format(est.altitud)} m` : null,
       est.emplacament, est.estat !== "Operativa" ? T.ui.desmantellada : null]
        .filter(Boolean).join(" · ");
    dibuixaEstacio(est, hist);
  } else {
    card.hidden = true;
  }
}

/* --- arrencada -------------------------------------------------------------- */

(async function () {
  const [meta, estacions] = await Promise.all([
    fetch("data/meta.json").then((r) => r.json()),
    fetch("data/stations.json").then((r) => r.json()),
  ]);
  META = meta;
  ESTACIONS = estacions;
  DESTACADES = new Set(meta.featured.map((f) => f.codi));

  construeixControls();
  document.getElementById("tancar").addEventListener("click", () => selecciona(null));

  // L'avis legal obliga a indicar la data de la darrera actualitzacio de la font.
  const fmtData = new Intl.DateTimeFormat("ca-ES", { dateStyle: "long" });
  const fmtHora = new Intl.DateTimeFormat("ca-ES", { dateStyle: "long", timeStyle: "short" });
  document.getElementById("updated").textContent =
    `Darrera actualització de la font: ${fmtHora.format(new Date(meta.source_last_updated))}. ` +
    `Agregats generats el ${fmtData.format(new Date(meta.generated_at))}.`;
  document.getElementById("stations-count").textContent = nf(0).format(meta.qc.stations);

  await render();
})();
