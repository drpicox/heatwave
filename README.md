# Nits de calor a Catalunya

Quantes nits de calor fa cada any a cada estació de Catalunya, com evoluciona, i
si l'escalfament nocturn depèn de l'altitud i de l'entorn de l'estació.

Web estàtic construït sobre les dades obertes de la **XEMA** del Servei
Meteorològic de Catalunya.

## Per què

El Meteocat ja té visor de dades. Aquest projecte no vol ser-ne un altre: vol
respondre una pregunta concreta que el visor no respon, i que va sortir mirant
tres estacions properes a Tiana.

De 2006–2015 a 2016–2025, la mitjana de les mínimes de juny–agost va pujar:

| estació | altitud | entorn | 2006–2015 | 2016–2025 | diferència |
|---|---|---|---|---|---|
| Badalona-Museu (`WU`) | 42 m | urbà litoral | 20,87 | 21,79 | +0,92 |
| Cabrils (`UP`) | 81 m | vessant, semirural | 19,21 | 19,72 | +0,51 |
| Observatori Fabra (`D5`) | 410 m | bosc d'alçada | 18,59 | 19,85 | +1,26 |

La que més s'escalfa no és la urbana: és la del bosc d'alçada. Si això es manté
en les ~190 estacions operatives, la història no és la que tothom espera.

## Com funciona

Sense servidor i sense cap crida a l'API des del navegador. Un script baixa les
dades, les filtra, calcula i escriu JSON estàtics que es versionen al repositori.

El que es versiona són **agregats** (histogrames i mitjanes), no una còpia de les
dades del Meteocat: cada fitxa d'estació enllaça les dades brutes directament a
la font. La portada carrega 172 KB comprimits i la fitxa d'una estació 7 KB més.

```
./dothething            baixa el que falti, calcula i escriu site/data/
./dothething --full     ignora el cache i ho refà tot
./dothething --years 2005-2026
./dothething --stations WU,UP,D5
./dothething --test     corre els tests de fixtures
./dothething --serve    serveix site/ a http://localhost:8000
```

La primera execució baixa tota la sèrie (1988 fins avui) i triga uns minuts. Les
següents només refresquen els dos anys més recents, perquè el Meteocat corregeix
dades enrere.

Si tens un [app token de Socrata](https://analisi.transparenciacatalunya.cat)
—no cal, però puja el límit de peticions— exporta'l abans:

```
export SOCRATA_APP_TOKEN=...
```

## Estructura

```
dothething          punt d'entrada únic
pipeline/           descàrrega, control de qualitat, càlcul, generació
  socrata.py        client de l'API, amb paginació verificada
  fetch.py          descàrrega i cache per (variable, any)
  quality.py        completesa, anys parcials, filtre del camp `estat`
  metrics.py        histogrames, mitjanes estivals, tendències
  build.py          escriptura de site/data/
site/               el web estàtic
  data/             sortida versionada (JSON)
docs/               METODOLOGIA.md, FONTS.md
tests/              fixtures verificades contra l'API
cache/              dades crues descarregades (no es versiona)
```

## Llegeix això abans de fer-ne res

- [**METODOLOGIA.md**](docs/METODOLOGIA.md) — què es compta, què es descarta i
  per què. Inclou les limitacions, que són reals: les sèries **no estan
  homogeneïtzades**.
- [**FONTS.md**](docs/FONTS.md) — datasets, condicions d'ús i atribució.

> Font: Servei Meteorològic de Catalunya (XEMA). Dades obertes de la Generalitat
> de Catalunya.

Aquestes no són dades científiques validades. Per a qualsevol ús que ho
requereixi, ves a la font original.
