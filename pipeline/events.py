"""Context global: El Nino/la Nina i l'aerosol volcanic estratosferic.

Aixo es **context, no explicacio**. Les dues preguntes que fa tothom davant
d'una serie que puja son si no sera cosa del Nino o d'algun volca, i totes dues
estan mesurades a docs/BACKLOG.md: l'ENSO no te senyal detectable a la minima
estival d'aqui (el signe canvia segons el conveni de desfasament) i l'unic event
volcanic de la serie es el Pinatubo, que cau quan la xarxa tenia nou estacions.

Per aixo es publica la **magnitud any a any** i no una marca de si/no. Una franja
continua pot dibuixar que una cosa es plana; una bandera nomes sap dir que hi es.

Dues fonts, totes dues obertes:

* **ONI** (Oceanic Nino Index) del Climate Prediction Center de la NOAA. Mitjana
  movil de tres mesos de l'anomalia de temperatura del Pacific a la regio 3.4.
  Es el que la NOAA fa servir per declarar els episodis: >= +0,5 Nino,
  <= -0,5 Nina.

* **GloSSAC** (Global Space-based Stratospheric Aerosol Climatology) de la NASA,
  servit per GISS ja convertit a profunditat optica a 550 nm. Es una mesura de
  satel.lit, no una reconstruccio, i cobreix des del 1979: tota la serie de la
  XEMA i onze anys mes.

El que refreda no es com de gran es l'explosio sino quant sofre arriba a
l'estratosfera i s'hi queda. El VEI no ho mesura: l'Eyjafjallajokull del 2010 va
tancar l'espai aeri d'Europa i aqui dona menys que la mitjana del registre,
perque la ploma es va quedar a la troposfera.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import struct
import urllib.request

from . import config

EPOCH = dt.date(1850, 1, 1)

# Tipus de netCDF-3 classic: codi -> (format de struct, mida en bytes).
_NC_TYPES = {1: ("b", 1), 2: ("c", 1), 3: ("h", 2), 4: ("i", 4), 5: ("f", 4), 6: ("d", 8)}


class NetCDF3:
    """Lector minim de netCDF-3 classic.

    El projecte no porta scipy ni netCDF4 i no val la pena afegir-los per llegir
    dos fitxers de 300 KB un cop per setmana. El format es prou simple.

    L'unica part que no es obvia son les **variables de registre**: les que
    pengen de la dimensio il.limitada no es guarden seguides sino intercalades
    mes a mes, aixi que l'offset d'un mes no es `begin + k * mida_de_la_variable`
    sino `begin + k * suma_de_les_mides_de_totes_les_variables_de_registre`.
    """

    def __init__(self, blob: bytes):
        if blob[:3] != b"CDF":
            raise ValueError("no es un netCDF classic")
        self.b = blob
        self.p = 4
        self.numrecs = self._int()
        self._int()  # etiqueta de la llista de dimensions
        self.dims = [(self._string(), self._int()) for _ in range(self._int())]
        self._attrs()
        self._int()  # etiqueta de la llista de variables
        self.vars = {}
        for _ in range(self._int()):
            name = self._string()
            ids = [self._int() for _ in range(self._int())]
            attrs = self._attrs()
            vtype, vsize, begin = self._int(), self._int(), self._int()
            self.vars[name] = dict(ids=ids, type=vtype, size=vsize, begin=begin, attrs=attrs)

    def _int(self) -> int:
        v = struct.unpack_from(">i", self.b, self.p)[0]
        self.p += 4
        return v

    def _string(self) -> str:
        n = self._int()
        v = self.b[self.p:self.p + n].decode("utf-8", "replace")
        self.p += (n + 3) // 4 * 4
        return v

    def _values(self, vtype: int, n: int):
        fmt, size = _NC_TYPES[vtype]
        if vtype == 2:
            v = self.b[self.p:self.p + n].decode("utf-8", "replace")
        else:
            v = list(struct.unpack_from(">" + fmt * n, self.b, self.p))
        self.p += (n * size + 3) // 4 * 4
        return v

    def _attrs(self) -> dict:
        self._int()  # etiqueta
        out = {}
        for _ in range(self._int()):
            name = self._string()
            vtype = self._int()
            out[name] = self._values(vtype, self._int())
        return out

    def _is_record(self, var) -> bool:
        return bool(var["ids"]) and self.dims[var["ids"][0]][1] == 0

    def read(self, name: str) -> list:
        var = self.vars[name]
        fmt, _ = _NC_TYPES[var["type"]]
        shape = [self.dims[i][1] or self.numrecs for i in var["ids"]]
        if not self._is_record(var):
            n = math.prod(shape) if shape else 1
            return list(struct.unpack_from(">" + fmt * n, self.b, var["begin"]))
        stride = sum(v["size"] for v in self.vars.values() if self._is_record(v))
        per = math.prod(shape[1:]) if len(shape) > 1 else 1
        out = []
        for k in range(shape[0]):
            out += list(struct.unpack_from(">" + fmt * per, self.b, var["begin"] + k * stride))
        return out

    def scaled(self, name: str) -> tuple[list, list]:
        """Valors amb `scale_factor` aplicat i els de farciment com a None.

        El `_FillValue` no es opcional de mirar: el fitxer de Sato-Lacis acaba el
        2012 pero arriba al 2022 farcit amb 9999, que amb l'escala de 1e-4 dona
        una profunditat optica d'1,0 -- un apagat de sol total durant deu anys.
        """
        var = self.vars[name]
        scale = var["attrs"].get("scale_factor", [1.0])[0]
        offset = var["attrs"].get("add_offset", [0.0])[0]
        fill = var["attrs"].get("_FillValue", [None])[0]
        raw = self.read(name)
        vals = [None if (fill is not None and v == fill) else v * scale + offset for v in raw]
        shape = [self.dims[i][1] or self.numrecs for i in var["ids"]]
        return vals, shape


def _download(url: str, name: str, log=print) -> bytes | None:
    """Baixa i deixa copia al cache. Si la xarxa falla, tira del cache.

    Aixo es una capa de context i no la rao de ser del projecte: si la NOAA o la
    NASA no responen, val mes publicar el web sense la franja que no publicar-lo.
    """
    path = config.CONTEXT_CACHE / name
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            blob = r.read()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
        return blob
    except Exception as e:  # noqa: BLE001 -- xarxa: qualsevol cosa
        if path.exists():
            log(f"    avis: {name} no s'ha pogut baixar ({e}); es fa servir el cache")
            return path.read_bytes()
        log(f"    avis: {name} no s'ha pogut baixar ({e}) i no hi ha cache; sense franja")
        return None


def parse_oni(blob: bytes) -> dict[int, float]:
    """ONI de la temporada DJF, indexat per l'any en que cau el gener.

    **El conveni de desfasament decideix el signe del resultat**, aixi que va
    escrit aqui i a METODOLOGIA.md. Un episodi del Nino fa el maxim cap al
    desembre-febrer i la resposta de la temperatura global va tres a sis mesos
    enrere, de manera que l'estiu que li correspon es el que ve **despres** del
    pic. DJF 1998 (des. 1997 - feb. 1998) es, doncs, l'etiqueta de l'any 1998.

    Amb el conveni contrari els estius del Nino de 2006-2025 surten 0,3 C mes
    calents en comptes de 0,4 C mes freds. Aixo no es un detall d'implementacio:
    es tota la conclusio, i per aixo no es pot deixar implicit.
    """
    out = {}
    for line in blob.decode("utf-8", "replace").splitlines()[1:]:
        parts = line.split()
        if len(parts) == 4 and parts[0] == config.ONI_SEASON:
            out[int(parts[1])] = float(parts[3])
    if not out:
        raise ValueError("l'ONI no porta cap temporada DJF: ha canviat el format?")
    return out


def parse_saod(blob: bytes, band: tuple[float, float]) -> dict[int, float]:
    """Profunditat optica de l'aerosol estratosferic a la banda de latitud d'aqui.

    **No es pot fer servir la mitjana global**, i l'Agung del 1963 es la prova:
    globalment es un dels grans del segle XX i a 43 N no arriba ni a quatre
    vegades el fons, perque l'aerosol va quedar a l'hemisferi sud. Amb la mitjana
    global algu conclouria que aquell any aqui va passar alguna cosa.
    """
    nc = NetCDF3(blob)
    lat = nc.read("lat")
    tau, shape = nc.scaled("tau")
    months = nc.read("month")
    nlat = len(lat)

    lo, hi = band
    sel = [i for i, x in enumerate(lat) if lo <= x <= hi]
    if not sel:  # la graella es grossa; si cap centre hi cau, el mes proper
        sel = [min(range(nlat), key=lambda i: abs(lat[i] - (lo + hi) / 2))]
    # Ponderacio per area: a la mateixa amplada en graus, una franja mes al nord
    # cobreix menys superficie.
    w = [math.cos(math.radians(lat[i])) for i in sel]

    per_year: dict[int, list[float]] = {}
    for k in range(shape[0]):
        row = [tau[k * nlat + i] for i in sel]
        if any(v is None for v in row):
            continue
        year = (EPOCH + dt.timedelta(days=int(months[k]))).year
        per_year.setdefault(year, []).append(
            sum(v * wi for v, wi in zip(row, w)) / sum(w))
    # Un any incomplet no es publica: mitjanar nomes els mesos que hi ha faria
    # pujar o baixar l'any segons quins hi hagi.
    return {y: sum(v) / len(v) for y, v in per_year.items() if len(v) == 12}


def build(log=print) -> dict | None:
    oni_blob = _download(config.ONI_URL, "oni.ascii.txt", log)
    saod_blob = _download(config.SAOD_URL, "glossac.nc", log)
    if oni_blob is None or saod_blob is None:
        return None

    enso = parse_oni(oni_blob)
    saod = parse_saod(saod_blob, config.CONTEXT_LAT_BAND)

    # El fons es la mediana: la immensa majoria d'anys no tenen cap volca que
    # compti, aixi que la mediana ES el fons, i el pic es llegeix en multiples
    # d'aquest fons i no en unitats de profunditat optica, que no diuen res a
    # ningu.
    ordenats = sorted(saod.values())
    fons = ordenats[len(ordenats) // 2] if ordenats else None

    log(f"    ENSO {min(enso)}-{max(enso)} · SAOD {min(saod)}-{max(saod)} "
        f"a {config.CONTEXT_LAT_BAND[0]:.0f}-{config.CONTEXT_LAT_BAND[1]:.0f} N "
        f"(fons {fons:.4f})")
    return {
        "enso": {str(y): round(v, 2) for y, v in sorted(enso.items())},
        "saod": {str(y): round(v, 5) for y, v in sorted(saod.items())},
        "saod_fons": round(fons, 5) if fons else None,
        "lat_band": list(config.CONTEXT_LAT_BAND),
        "enso_season": config.ONI_SEASON,
        "enso_llindar": config.ENSO_LLINDAR,
        "fonts": {
            "enso": {
                "nom": "Oceanic Niño Index (ONI), NOAA Climate Prediction Center",
                "url": config.ONI_URL,
            },
            "saod": {
                "nom": "GloSSAC v2.24, NASA (servit per NASA GISS)",
                "url": "https://data.giss.nasa.gov/modelforce/strataer/",
            },
        },
    }


def write(log=print) -> int | None:
    payload = build(log)
    if payload is None:
        return None
    path = config.SITE_DATA / "context.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    return path.stat().st_size


if __name__ == "__main__":
    print(write())
