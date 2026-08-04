/* Tot el que es text: xifra principal, frase, placa, targetes, taula i peu.
 *
 * Els noms venen de l'API, aixi que aqui s'insereixen amb textContent i mai per
 * concatenacio d'HTML.
 */

import { linia } from "./grafics.js";
import { state, META, ST, L, nf, signed, unitat, thrText, buida, majuscula, varInfo, unitatVar,
         escapa, dataLlarga, DATASET, LEGAL, REPO } from "./nucli.js";

export function dibuixaText(m) {
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
      art: t.art[t.vars[state.v].gen || "f"],
      a: nf(P[0].perAny, 1), b: nf(P[1].perAny, 1),
      verb: Math.abs(d) < 0.5 ? t.verbFlat : d > 0 ? t.verbUp : t.verbDown,
      m0: nf(P[0].mitjana, 1), m1: nf(P[1].mitjana, 1) + " " + unitatVar(), dm: signed(dm, 1),
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
    tiles.append(tile(t.tHigh + sufix, `${nf(m.rec.alt, 1)} ${unitatVar()}`, "",
      dataLlarga(m.rec.altData)));
    // A la pluja el mínim és sempre zero i no diu res: la targeta no hi surt.
    if (!varInfo().skewed) {
      tiles.append(tile(t.tLow + sufix, `${nf(m.rec.baix, 1)} ${unitatVar()}`, "",
        dataLlarga(m.rec.baixData)));
    }
  }

  // capçaleres
  const u = majuscula(unitat());
  document.getElementById("t-count").textContent = t.pCount(u, thrText());
  document.getElementById("s-count").textContent =
    t.sCount + (m.apilat ? " " + t.sCountStack : "");
  document.getElementById("t-mean").textContent =
    t.pMean(majuscula(t.vars[state.v].curt) + " " +
              t.resum[varInfo().agg][t.vars[state.v].gen || "f"],
            t.seasonPhrase[state.season]);
  document.getElementById("s-mean").textContent = t.sMean;
  document.getElementById("t-heat").textContent = t.pHeat(u, thrText());
  document.getElementById("s-heat").textContent = t.sHeat;

  llegenda(m);
}

export function llegenda(m) {
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

export function dibuixaTaula(m) {
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

export function peu() {
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
