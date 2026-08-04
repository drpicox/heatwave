"""Contorn de les comarques per a la vista de mapa.

L'original son 43 comarques amb 661.514 vertexs i 25,7 MB: impossible d'encastar
en una pagina. Simplificat amb Douglas-Peucker a 0,002 graus (uns 222 m) queden
uns 6.900 vertexs i 34 KB comprimits, i a l'escala del mapa -- 900 px per a 350
km -- l'error es inferior a un pixel.

Els limits administratius no canvien mai, aixi que aixo no forma part del refresc
setmanal: es genera un cop i es versiona. `./dothething.sh --geo` el refa.
"""

from __future__ import annotations

import json
import math
import sys

from . import config

DS_COMARQUES = "aasi-gwnd"
TOLERANCIA = 0.002  # graus; ~222 m


def _dp(pts: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    """Douglas-Peucker: es queda els vertexs que canvien la forma."""
    if len(pts) < 3:
        return pts
    x1, y1 = pts[0]
    x2, y2 = pts[-1]
    dx, dy = x2 - x1, y2 - y1
    den = math.hypot(dx, dy)
    dmax, idx = -1.0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        # Els anells son tancats: quan el primer i l'ultim punt coincideixen la
        # recta de referencia es degenerada i cal mesurar la distancia al punt.
        d = (abs(dy * x - dx * y + x2 * y1 - y2 * x1) / den) if den > 1e-12 \
            else math.hypot(x - x1, y - y1)
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        return _dp(pts[: idx + 1], tol)[:-1] + _dp(pts[idx:], tol)
    return [pts[0], pts[-1]]


def _walk(coords, tol):
    if coords and isinstance(coords[0][0], (int, float)):
        s = _dp([(float(p[0]), float(p[1])) for p in coords], tol)
        # Un anell que ha quedat en tres punts o menys no dibuixa res.
        return [[round(x, 4), round(y, 4)] for x, y in s] if len(s) >= 4 else None
    out = [w for w in (_walk(c, tol) for c in coords) if w]
    return out or None


def build(client, tol: float = TOLERANCIA, log=print) -> dict:
    sys.setrecursionlimit(50_000)
    cru = config.CACHE / "comarques.geojson"
    if not cru.exists():
        log(f"  baixant {DS_COMARQUES} (uns 25 MB, un sol cop)")
        r = client.session.get(
            f"{config.DOMAIN}/resource/{DS_COMARQUES}.geojson",
            params={"$limit": 100}, timeout=600,
        )
        r.raise_for_status()
        cru.parent.mkdir(parents=True, exist_ok=True)
        cru.write_bytes(r.content)

    g = json.loads(cru.read_text(encoding="utf-8"))
    comarques = []
    for f in g["features"]:
        co = _walk(f["geometry"]["coordinates"], tol)
        if co:
            comarques.append({"n": f["properties"].get("nomcomar"), "c": co})

    vertexs = 0
    def _cnt(c):
        nonlocal vertexs
        if c and isinstance(c[0], (int, float)):
            vertexs += 1
        else:
            for x in c:
                _cnt(x)
    for c in comarques:
        _cnt(c["c"])

    log(f"  {len(comarques)} comarques, {vertexs:,} vèrtexs "
        f"(tolerància {tol}° ≈ {tol*111000:.0f} m)")
    return {"tolerancia_graus": tol, "font": f"{config.DOMAIN}/d/{DS_COMARQUES}",
            "comarques": comarques}
