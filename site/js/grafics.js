/* Els quatre grafics.
 *
 * SVG a ma. Cada funcio rep el model ja calculat i nomes s'ocupa de pintar-lo.
 */

import { state, ST, L, nf, signed, unitat, el, buida, ticks,
         varInfo, unitatVar } from "./nucli.js";

export function mostraTip(host, x, y, nodes) {
  const t = host.querySelector(".tip");
  buida(t);
  nodes.forEach((n) => t.append(n));
  t.style.left = x + "px";
  t.style.top = y + "px";
  t.style.opacity = "1";
}

export const amagaTip = (host) => { host.querySelector(".tip").style.opacity = "0"; };

export function linia(text, forta) {
  const s = document.createElement(forta ? "b" : "span");
  s.textContent = text;
  return s;
}

export function titolTip(text) {
  const s = document.createElement("span");
  s.className = "ty";
  s.textContent = text;
  return s;
}

/* --- histograma del llindar ------------------------------------------------ */

export function dibuixaHist(m) {
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

  // A la pluja, quatre de cada cinc dies valen zero: si es dibuixa el bin del
  // zero, la barra el tapa tot i no es veu res de la distribució que importa.
  // S'amaga i es diu quin percentatge és, que és el que el lector ha de saber.
  let secs = 0;
  if (varInfo().skewed) {
    for (const [b, n] of bins) if (b < 0.5 - 1e-9) { secs += n; bins.delete(b); }
  }
  const totalDies = secs + [...bins.values()].reduce((a, b) => a + b, 0);
  const ajuda = document.getElementById("thr-help");
  ajuda.textContent = secs && totalDies
    ? L().secs(nf((secs / totalDies) * 100, 0))
    : L().hThr;

  const claus = [...bins.keys()].sort((a, b) => a - b);
  const lo = +document.getElementById("f-thr").min;
  const hi = +document.getElementById("f-thr").max;
  const max = Math.max(...bins.values());
  const X = (v) => ((v - lo) / (hi - lo)) * W;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");

  // Amb la pluja, un dia de 40 mm/h al costat de centenars de dies de 1 mm/h
  // desapareix en escala lineal. La mateixa lliçó que al mapa mensual.
  const escala = varInfo().skewed
    ? (n) => Math.sqrt(n / max)
    : (n) => n / max;
  for (const b of claus) {
    if (b < lo || b > hi) continue;
    const alt = escala(bins.get(b)) * (H - 4);
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

export function dibuixaCount(m) {
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
export function etiquetesAny(svg, files, X, y, amplada) {
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

export function dibuixaMean(m) {
  const host = document.getElementById("c-mean");
  const svg = host.querySelector("svg");
  buida(svg);
  const dades = m.plens.filter((f) => f.mitjana != null);
  if (dades.length < 2) return;

  const W = 900, H = 282, mg = { t: 18, r: 14, b: 56, l: 46 };
  const iw = W - mg.l - mg.r, ih = H - mg.t - mg.b;
  const vals = dades.map((f) => f.mitjana);
  // Una mitjana de temperatures no comença a zero i va amb línia. Un total de
  // mil.límetres i una punta d'intensitat sí que hi comencen, i van amb barres:
  // dibuixar-los amb línia i eix retallat exageraria diferències petites.
  const barres = varInfo().agg !== "mean";
  const lo = barres ? 0 : Math.min(...vals);
  const hi = Math.max(...vals);
  const marge = barres ? 0 : ((hi - Math.min(...vals)) * 0.18 || 0.5);
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
  if (barres) {
    const ample = Math.min(24, banda - 3);
    for (const f of dades) {
      const x = X(f.any) - ample / 2, y = Y(f.mitjana);
      const h = mg.t + ih - y;
      const r = Math.min(4, ample / 2, h);
      if (h > 0) svg.append(el("path", {
        d: `M${x},${mg.t + ih} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
           `L${x + ample - r},${y} Q${x + ample},${y} ${x + ample},${y + r} ` +
           `L${x + ample},${mg.t + ih} Z`,
        fill: "var(--accent)",
      }));
    }
  } else {
    svg.append(el("path", {
      d: dades.map((f, k) => `${k ? "L" : "M"}${X(f.any)},${Y(f.mitjana)}`).join(" "),
      fill: "none", stroke: "var(--accent)", "stroke-width": 2,
      "stroke-linejoin": "round", "stroke-linecap": "round",
    }));
  }

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
      }, `${p.etiqueta} · ${nf(p.mitjana, 1)} ${unitatVar()}`));
    }
  }

  for (const f of dades) {
    if (!barres) svg.append(el("circle", { cx: X(f.any), cy: Y(f.mitjana), r: 3.5,
      fill: "var(--accent)", stroke: "var(--surface)", "stroke-width": 2 }));
    const hit = el("circle", { cx: X(f.any), cy: Y(f.mitjana), r: 13, fill: "transparent" });
    hit.addEventListener("pointerenter", () =>
      mostraTip(host, X(f.any), Y(f.mitjana) - 10,
        [titolTip(String(f.any)), linia(`${nf(f.mitjana, 1)} ${unitatVar()}`, true)]));
    hit.addEventListener("pointerleave", () => amagaTip(host));
    svg.append(hit);
  }

  etiquetesAny(svg, m.files, (i) => mg.l + i * banda + banda / 2, mg.t + ih + 16, iw);

  if (m.periodes && m.periodes[0].mitjana != null && m.periodes[1].mitjana != null) {
    const [a, b] = m.periodes;
    document.getElementById("s-mean").textContent +=
      L().saltMean(nf(a.mitjana, 1), nf(b.mitjana, 1) + " " + unitatVar(),
                   signed(b.mitjana - a.mitjana, 1));
  }
}

/* --- panell 3: repartiment per mesos ---------------------------------------- */

export function dibuixaHeat(m) {
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
