# Pendent

Coses decidides però no fetes, amb el que ja s'ha comprovat de cadascuna perquè
qui hi torni no hagi de refer la investigació.

## Creuar amb la contaminació atmosfèrica (XVPCA)

**Estat: verificat que es pot fer, aparcat conscientment.**

La XVPCA (`tasf-thgu`, Xarxa de Vigilància i Previsió de la Contaminació
Atmosfèrica) té 131 estacions amb dades i cobreix precisament l'àrea
metropolitana densa on la XEMA no arriba: Gràcia-Sant Gervasi, Poblenou,
Montcada i Reixac, Sant Adrià, Santa Coloma de Gramenet, Cornellà.

**No mesura temperatura.** Els seus sensors donen NO₂, NO, O₃, SO₂, NOX, CO,
PM10, PM2.5, benzè, mercuri i clor. Comprovat agrupant per `contaminant`.

Però el creuament és possible parellant cada estació de contaminació amb la
XEMA més propera. Distàncies verificades: **71 de 131 a menys de 5 km, 124 a
menys de 10 km**, mediana 4,6 km. Dues parelles són pràcticament el mateix punt:

| estació de contaminació | termòmetre XEMA | distància | Δ altitud |
|---|---|---|---|
| Tarragona (Universitat Laboral) | `XE` Complex Educatiu | 0,0 km | −1 m |
| Girona (parc de la Devesa) | `XJ` Girona | 0,5 km | 0 m |
| Cornellà de Llobregat | `XL` el Prat de Llobregat | 1,8 km | +20 m |
| Barcelona (Gràcia - Sant Gervasi) | `X4` el Raval | 2,0 km | +24 m |
| Sabadell | `XF` Parc Agrari | 2,7 km | −49 m |
| Santa Coloma de Gramenet | `WU` Badalona - Museu | 3,2 km | −19 m |
| Sant Adrià de Besòs | `WU` Badalona - Museu | 3,6 km | −35 m |
| Barcelona (Poblenou) | `X4` el Raval | 3,8 km | −30 m |
| Reus | `VQ` Constantí | 4,6 km | −11 m |
| Santa Pau | `W9` la Vall d'en Bas | 4,6 km | +35 m |
| Montcada i Reixac | `WU` Badalona - Museu | 5,9 km | −8 m |

Massa lluny o massa desnivell per fiar-se'n: Sant Celoni (8,8 km, −317 m),
Begur (8,5 km, +196 m), Lleida (7,8 km, +95 m).

### Dos avisos imprescindibles si algú s'hi posa

**Les coordenades de la XVPCA estan brutes.** 68 de les 131 estacions tenen més
d'un parell de coordenades per al mateix `codi_eoi`, algunes fins a catorze.
Barcelona (Eixample) en té nou, i una el situa prop de Vilafranca. La brutícia
està concentrada als registres del **2001**: la coordenada correcta surt a
59.589 files i les set errònies sumen 929. **Agafa la coordenada majoritària per
estació** i tot quadra. Sense aquest filtre, el veí més proper de
Gràcia-Sant Gervasi surt Alcarràs, a 150 km.

Posa-hi una comprovació de sanitat amb una distància que ja sàpigues (Barcelona
Eixample → `X4` el Raval ha de donar 1,2 km). És el que va fer saltar l'error.

**El creuament només val per a preguntes temporals.** Puja l'ozó les nits que la
mínima no baixa dels 25 °C? Coincideixen els episodis de contaminació amb els de
calor nocturna? Això és sòlid: els dos senyals són regionals.

No val per a preguntes espacials. No es pot dir que un barri és més calorós que
un altre a partir d'un termòmetre que és a 4 km i dins d'un parc: seria
exactament l'error que aquest projecte intenta evitar.

## Temperatura del vespre

La mínima diària es dona de matinada i està dominada pel balanç radiatiu i, al
litoral, per la temperatura del mar. El **vespre** està dominat per la calor que
superfícies i edificis alliberen després del dia, i és per tant molt més sensible
a la cobertura del sòl. No sembla que ningú la publiqui de manera rutinària.

Necessita el dataset semihorari `nzvn-apee`, variable **32** (temperatura), amb
`codi_variable` com a **text** (`'32'`), no numèric com al dataset diari. Hores
en TU: 20:00–21:00 TU són les 22:00–23:00 locals a l'estiu.

Abans de comprometre-s'hi, cal una prova amb una estació i un estiu per mesurar
el volum real.

## Tests estadístics

- **Tendència**: Mann-Kendall, a més del pendent de Theil–Sen que ja es calcula.
- **Canvi de règim**: test de Pettitt sobre la mínima mitjana d'estiu.

Avís: sobre la mínima estival, la sèrie de Badalona-Museu torna a valors
normals el 2024 després del pic de 2022–2023, i amb ~20 punts la potència d'un
test de canvi de règim és baixa. On sí que s'hi veu un escaló net és a les
**nits tòrrides** (Tmin ≥ 25): de 0–7 per any fins al 2021, a 14, 14, 6 i 16 des
del 2022. El senyal sembla ser a la cua de la distribució, no a la mitjana.
Val la pena contrastar-ho a moltes estacions abans d'escriure'n res.

## Context marí

Creuar amb la temperatura superficial del Mediterrani (NOAA OISST o Copernicus
Marine, totes dues obertes). Si un canvi coincideix amb el del mar, hi ha una
explicació física i no només una correlació temporal.

## Estacions destacades pendents de decidir

Els municipis següents no tenen estació XEMA. Aquests són els millors substituts,
pendents de si s'accepta canviar el municipi demanat per un altre:

| volies | substitut | anys complets |
|---|---|---|
| Reus | `U6` Vinyols i els Arcs - Cambrils, 30 m | 32 |
| Begur | `UB` la Tallada d'Empordà, 15 m | 33 |
| Santa Pau | `W9` la Vall d'en Bas, 461 m | 25 |
| Sant Celoni | `VX` Tagamanent - PN del Montseny, 1.030 m | 30 |
| Cornellà | `D3` Vallirana, 255 m | 28 |

Per Montcada i Reixac, Sant Adrià de Besòs i Santa Coloma de Gramenet no hi ha
res al Barcelonès més enllà de les estacions de Barcelona i Badalona.

## Comparar dues estacions

El web és, ara mateix, un explorador **d'una estació**. La comparació entre
estacions —marcar-ne dues i veure-les de costat— es va decidir deixar per més
endavant.

Quan es faci, el pipeline ja hi juga a favor: `data/stations.json` i
`data/hist-tn.json` / `data/hist-tx.json` ja es generen i porten totes les
estacions alhora, així que és feina de navegador i no de dades.

**Amb una condició que no es pot saltar:** una comparació honesta ha de retallar
totes les sèries a la finestra d'anys que tenen en comú, i dir-ho. Una sèrie que
comença el 2006 no inclou els anys plans dels noranta i surt més inclinada pel
sol fet de començar més tard. Vegeu la secció de tendències de
[METODOLOGIA.md](METODOLOGIA.md), que ho documenta amb els números.

I un segon parany, mesurat: si es compara amb un **recompte per damunt d'un
llindar**, les estacions que no arriben mai al llindar donen zero per
construcció. Amb les nits tropicals això fabrica una correlació amb l'altitud de
−0,53 que no vol dir el que sembla, mentre que la mitjana estival, que val a
totes les altituds, en dona +0,33. Per comparar altituds, la mètrica honesta és
la mitjana.

## Altres

- **Amplitud tèrmica** (`màxima − mínima`). Es pot calcular ja des dels agregats
  publicats; falta decidir com es presenta. La pèrdua de vegetació i l'augment
  de massa tèrmica urbana tendeixen a reduir-la.
- **Ratxes de nits consecutives**. L'agregat mensual no les pot reconstruir. Si
  es volen, cal precalcular-les al pipeline per als llindars de drecera.
- **Exportació CSV** per gràfic, per a ús de tercers.
- **Estació `UG`**: té 11.951 dies de dades i cap fila de metadades a la font, o
  sigui ni nom ni altitud. Ara surt marcada amb `sense_metadades`. Decidir si
  s'amaga del mapa.
- **Mataró (`YV`)**: és l'estació de MeteoMar incorporada a la XEMA el juny de
  2025 (l'emplaçament diu literalment «Estació MeteoMar»). Encara no té cap any
  complet; serà utilitzable cap al 2027. És el precedent que demostra que dades
  de Meteomar poden acabar sent obertes.
