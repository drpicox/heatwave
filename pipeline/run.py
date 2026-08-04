"""Orquestracio. El que crida ./dothething.sh."""

from __future__ import annotations

import argparse
import datetime as dt
import http.server
import json
import socketserver
import sys
import time

from . import build, config, fetch, quality
from .socrata import Client


def parse_years(spec: str | None) -> list[int]:
    end = dt.date.today().year
    if not spec:
        return list(range(config.FIRST_YEAR, end + 1))
    if "-" in spec:
        a, b = spec.split("-", 1)
        return list(range(int(a), int(b) + 1))
    return [int(spec)]


def serve(port: int = 8000):
    handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(
        *a, directory=str(config.ROOT / "site"), **kw
    )
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"servint site/ a http://localhost:{port}  (ctrl-c per parar)")
        httpd.serve_forever()


def main(argv=None):
    p = argparse.ArgumentParser(prog="dothething.sh")
    p.add_argument("--full", action="store_true", help="ignora el cache i ho refa tot")
    p.add_argument("--years", help="rang d'anys, p.ex. 2005-2026")
    p.add_argument("--stations", help="filtra la sortida a aquests codis, separats per comes")
    p.add_argument("--refresh", type=int, default=2, help="anys recents que sempre es rebaixen")
    p.add_argument("--allow-unknown-estat", action="store_true",
                   help="continua encara que el camp `estat` porti valors nous")
    p.add_argument("--skip-fetch", action="store_true", help="nomes recalcula des del cache")
    p.add_argument("--wetbulb", action="store_true",
                   help="baixa el semihorari per trossos i calcula el bulb humit")
    p.add_argument("--wetbulb-years", help="rang d'anys del bulb humit, p.ex. 2009-2026")
    p.add_argument("--geo", action="store_true",
                   help="refa el contorn de comarques (els limits no canvien mai)")
    p.add_argument("--serve", action="store_true")
    p.add_argument("--port", type=int, default=8000)
    args = p.parse_args(argv)

    if args.serve:
        return serve(args.port)

    t0 = time.time()
    years = parse_years(args.years)
    client = Client()
    if client.app_token:
        print("app token de Socrata: si")

    source_updated = None
    stations = None
    estat_report = []

    if not args.skip_fetch:
        print(f"==> baixant {years[0]}-{years[-1]} (variables: "
              f"{', '.join(config.VARIABLES.values())})")
        report = fetch.fetch_all(
            client,
            years,
            full=args.full,
            refresh=args.refresh,
            allow_unknown=args.allow_unknown_estat,
        )
        estat_report = report["estat"]
        print(f"    {report['downloaded']} fitxers de cache escrits, "
              f"{client.requests_made} peticions")
        source_updated = client.last_updated(config.DS_DAILY)

    if args.wetbulb:
        from . import subdaily
        anys = parse_years(args.wetbulb_years) if args.wetbulb_years else subdaily.anys_disponibles()
        anys = [y for y in anys if y >= subdaily.PRIMER_ANY]
        print(f"==> bulb humit: semihorari {anys[0]}-{anys[-1]}, maig-octubre")
        r = subdaily.download(client, anys)
        print(f"    {r['rows']:,} files noves en {r['chunks']} trossos")
        print("==> creuant temperatura i humitat instant a instant")
        subdaily.build_daily(anys)

    print("==> metadades d'estacions")
    stations = fetch.fetch_stations(client)
    if source_updated is None:
        source_updated = client.last_updated(config.DS_DAILY)
    print(f"    {len(stations)} estacions")

    print("==> llegint el cache")
    daily, filter_report = fetch.load(years)
    dropped = filter_report["dropped_not_representative"]
    blank = filter_report["kept_with_blank_estat"]
    print(f"    descartades per 'No representatiu': "
          f"{', '.join(f'{k}={v:,}' for k, v in dropped.items())}")
    print(f"    conservades amb `estat` buit: "
          f"{', '.join(f'{k}={v:,}' for k, v in blank.items())}")
    if args.stations:
        keep = {s.strip().upper() for s in args.stations.split(",")}
        daily = daily[daily["codi_estacio"].isin(keep)]
        stations = stations[stations["codi_estacio"].isin(keep)]
    print(f"    {len(daily):,} dies-estacio, "
          f"{daily['codi_estacio'].nunique()} estacions, "
          f"{daily['year'].min()}-{daily['year'].max()}")

    print("==> control de qualitat")
    cov = quality.year_coverage(daily)
    s = quality.summary(cov)
    print(f"    {s['station_years_complete']:,} anys-estacio complets, "
          f"{s['station_years_partial']:,} parcials "
          f"(dels quals {s['station_years_ongoing']:,} en curs)")

    # Els limits administratius no canvien: nomes es refan si falten o si es
    # demana explicitament, per no baixar 25 MB cada setmana per res.
    geo_path = config.SITE_DATA / "comarques.json"
    if args.geo or not geo_path.exists():
        print("==> contorn de comarques")
        from . import geo
        geo_path.parent.mkdir(parents=True, exist_ok=True)
        geo_path.write_text(
            json.dumps(geo.build(client), ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8")

    print("==> escrivint site/data")
    build.build_all(daily, stations, cov, estat_report, filter_report, source_updated)

    print(f"fet en {time.time()-t0:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
