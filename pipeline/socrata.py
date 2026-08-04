"""Client de l'API Socrata del portal de dades obertes de la Generalitat.

Dues coses el fan diferent d'un `requests.get` qualsevol, i les dues venen de
comportaments reals de l'API:

1. Una consulta agregada massa cara **no torna error: torna una llista buida**.
   Si tractessim `[]` com a "zero resultats" publicariem grafiques a zero sense
   adonar-nos-en. Per aixo cada descarrega demana primer un `count(*)` i despres
   verifica que ha rebut exactament aquell nombre de files.

2. La paginacio per `$offset` nomes es fiable amb un ordre total explicit.
   Sense `$order`, Socrata no garanteix un ordre estable entre peticions i pots
   saltar-te files o repetir-les. Fem servir `$order=:id`, l'identificador intern
   de fila.
"""

from __future__ import annotations

import csv
import io
import os
import time
from typing import Iterator

import requests

from . import config

USER_AGENT = "heatwave/1.0 (+https://github.com/drpicox/heatwave)"


class SocrataError(RuntimeError):
    pass


class EmptyResponse(SocrataError):
    """Resposta buida on n'esperavem files. Gairebe sempre vol dir timeout."""


class Client:
    def __init__(self, domain: str = config.DOMAIN, app_token: str | None = None):
        self.domain = domain.rstrip("/")
        self.app_token = app_token or os.environ.get("SOCRATA_APP_TOKEN") or None
        self.session = requests.Session()
        headers = {"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"}
        if self.app_token:
            headers["X-App-Token"] = self.app_token
        self.session.headers.update(headers)
        self.requests_made = 0

    # -- transport ------------------------------------------------------------

    def _get(self, dataset: str, params: dict, fmt: str = "json", tries: int = 5):
        url = f"{self.domain}/resource/{dataset}.{fmt}"
        delay = 2.0
        last = None
        for attempt in range(1, tries + 1):
            try:
                r = self.session.get(url, params=params, timeout=180)
                self.requests_made += 1
                if r.status_code == 429:
                    raise SocrataError("429 rate limited")
                r.raise_for_status()
                return r
            except (requests.RequestException, SocrataError) as exc:
                last = exc
                if attempt == tries:
                    break
                time.sleep(delay)
                delay *= 2
        raise SocrataError(f"{url} ha fallat despres de {tries} intents: {last}")

    # -- consultes ------------------------------------------------------------

    def count(self, dataset: str, where: str | None = None) -> int:
        params = {"$select": "count(*) as n"}
        if where:
            params["$where"] = where
        rows = self._get(dataset, params).json()
        if not rows:
            raise EmptyResponse(f"count(*) buit a {dataset} amb where={where!r}")
        return int(rows[0]["n"])

    def json_rows(self, dataset: str, **params) -> list[dict]:
        """Consulta petita que cap en una resposta. No pagina."""
        params.setdefault("$limit", config.PAGE_SIZE)
        rows = self._get(dataset, params).json()
        if not rows:
            raise EmptyResponse(f"resposta buida a {dataset} amb {params!r}")
        return rows

    def csv_pages(
        self, dataset: str, select: str, where: str, expected: int
    ) -> Iterator[list[dict]]:
        """Descarrega paginada en CSV, verificant que arriben totes les files.

        CSV i no JSON perque per a milions de files la diferencia de volum
        transferit es de mes del triple.
        """
        if expected == 0:
            return
        got = 0
        offset = 0
        while got < expected:
            params = {
                "$select": select,
                "$where": where,
                "$order": ":id",
                "$limit": config.PAGE_SIZE,
                "$offset": offset,
            }
            r = self._get(dataset, params, fmt="csv")
            rows = list(csv.DictReader(io.StringIO(r.text)))
            if not rows:
                # No es "s'han acabat les files": sabem quantes n'esperem i
                # encara no hi som. Es un timeout silencios.
                raise EmptyResponse(
                    f"pagina buida a offset={offset} pero nomes portem "
                    f"{got}/{expected} files ({where})"
                )
            got += len(rows)
            offset += len(rows)
            yield rows

        if got != expected:
            raise SocrataError(f"esperavem {expected} files i n'han arribat {got}")

    def last_updated(self, dataset: str) -> str:
        """Data de la darrera actualitzacio del dataset, en ISO 8601.

        L'avis legal de meteo.cat obliga a indicar-la alla on es publiquen les
        dades, aixi que no es opcional.
        """
        r = self.session.get(f"{self.domain}/api/views/{dataset}.json", timeout=60)
        r.raise_for_status()
        ts = r.json().get("rowsUpdatedAt")
        if not ts:
            raise SocrataError(f"{dataset} no reporta rowsUpdatedAt")
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(int(ts)))
