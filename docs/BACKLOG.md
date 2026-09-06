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

## El Niño, la Niña i els volcans

**Estat: mesurat i publicat com a franja de context. L'ENSO no té senyal aquí i
els volcans no tenen finestra. Cap filtre, i el motiu és a sota.**

És la pregunta que fa tothom quan veu el web: no serà que els anys calents són
anys del Niño, o que hi va haver un volcà. Val la pena tenir la resposta
mesurada i no opinada, perquè totes dues intuïcions són raonables i totes dues
fallen, però per motius diferents.

### El Niño: el senyal és zero, i el signe depèn del conveni

Índex ONI de la NOAA (`cpc.ncep.noaa.gov/data/indices/oni.ascii.txt`, 918
línies, DJF 1950 endavant, domini públic). Composició de la **mínima mitjana de
juny-agost** per fase, amb la mediana de xarxa de les estacions amb JJA complet
a tota la finestra, i el mateix càlcul repetit sobre la sèrie sense la tendència
de Theil-Sen:

| finestra | estacions | Niño − Niña (cru) | (sense tendència) | σ interanual |
|---|---|---|---|---|
| 1996–2025 | 14 | +0,08 °C | −0,04 °C | 0,65 |
| 2001–2025 | 57 | −0,09 °C | −0,10 °C | 0,68 |
| 2006–2025 | 100 | −0,32 °C | −0,44 °C | 0,55 |

Tot per sota de la variabilitat interanual. I pitjor: **el signe depèn del
conveni de desfasament**, que és una decisió invisible per a qui mira el gràfic.
A 2006–2025, classificant per l'ONI del DJF previ els estius de Niño surten
0,44 °C **més freds**; classificant per l'ONI simultani de JJA, 0,28 °C **més
calents**. Mateixes dades, mateixes estacions, signe oposat.

Amb n ≈ 10 per grup i una tendència de +0,84 °C/dècada a la finestra curta, un
recompte per fase mesura sobretot **quan van caure els events**, no l'ENSO. És
la mateixa trampa que la secció de tendències de
[METODOLOGIA.md](METODOLOGIA.md), amb una altra disfressa.

Per Catalunya els índexs amb relació física no són l'ENSO sinó el **WeMO**
(fet expressament per a la façana mediterrània, i on es veu és a la pluja de
tardor), la **NAO** d'hivern i, per a la calor nocturna, la temperatura del mar
—vegeu «Context marí» aquí sobre.

### Volcans: el criteri no és el VEI

La intuïció natural és cercar erupcions famoses, i porta a l'error. El
**Eyjafjallajökull (2010)** va cancel·lar 107.000 vols i és el que tothom
recorda, però la ploma es va quedar als 9 km, dins la troposfera: el seu efecte
climàtic és indistingible de zero. El **Holuhraun (2014-15)**, la colada més
gran d'Islàndia des del Laki, va emetre moltíssim SO₂ però efusiu i baix, i la
pluja se'l va endur en setmanes.

El que refreda és el sofre que arriba a l'**estratosfera** i s'hi queda, i això
està mesurat: profunditat òptica de l'aerosol estratosfèric (SAOD), publicada
per la NASA GISS a `data.giss.nasa.gov/modelforce/strataer/`. Cal llegir-la a la
**banda de latitud d'aquí (43° N)**, no la mitjana global: l'aerosol no es
reparteix per igual entre hemisferis.

Valor anual a 43° N, dues reconstruccions independents, en múltiples del fons
(fons ≈ 0,004 a CMIP7 i 0,006 a Sato-Lacis):

| any | event | CMIP7 | Sato-Lacis |
|---|---|---|---|
| 1884 | Krakatoa | 18× | 21× |
| 1912 | Novarupta-Katmai | 13× | 9× |
| 1963–64 | Agung | 3× | 4× |
| 1983 | El Chichón | 11× | 15× |
| **1992** | **Pinatubo** | **21×** | **20×** |

I d'aquí surt tot: **en 174 anys, el pic més gran d'aerosol estratosfèric sobre
la nostra latitud és el del Pinatubo.** L'única erupció que valdria la pena
marcar en tota l'era instrumental cau el quart any de la sèrie de la XEMA.
Aquells estius la xarxa tenia **6 estacions amb JJA complet el 1991, 9 el 1992 i
11 el 1993**. L'aerosol arriba aquí el juliol del 1991 i fa el màxim el febrer
del 1992: l'estiu a mirar seria el del 1992, no el del 1991.

L'Agung és la contraprova de per què cal la banda de latitud: globalment és un
dels grans del segle XX i aquí no arriba ni a 4×, perquè va quedar a l'hemisferi
sud. Amb la mitjana global algú conclouria que el 1963 aquí va passar alguna
cosa.

De l'era satèl·lit (GloSSAC v2.24, 1979–2025) no en surt res més: el
Eyjafjallajökull dona 0,0046 a 43° N —per sota de la mitjana del propi
registre—, el Grímsvötn i el Nabro del 2011 fan 0,0069, i el Hunga Tonga (2022)
és el pic global més gran des del Pinatubo però a 43° N es queda a 0,0063,
perquè va quedar atrapat als tròpics del sud. I el que va injectar era sobretot
vapor d'aigua, l'efecte net del qual, si de cas, és d'escalfar.

### Què s'ha fet, i què no

Fet: una **franja de context** sota el gràfic d'anys, amb la magnitud any a any
i no una marca de sí/no (`pipeline/events.py`, `site/data/context.json`, 2 KB).
Dibuixa una ratlla gairebé plana amb un sol pic al començament, i explica per si
sola que no hi ha res a filtrar. Les decisions de presentació són a
[METODOLOGIA.md](METODOLOGIA.md) §6.

**No fet, i deliberadament: el filtre.** «Mostra'm només els anys del Niño» faria
exactament el contrari de la franja: insinuaria que hi ha alguna cosa a filtrar,
i amb n ≈ 10 per grup el que es llegiria seria la tendència. Si algú hi torna a
pensar, que llegeixi primer la taula de dalt.

De la sèrie llarga es fa servir només GloSSAC (des del 1979), que ja cobreix tota
la XEMA. Les reconstruccions del 1850 (CMIP7, Sato-Lacis) es van fer servir per
comprovar que el Pinatubo és el pic més gran de la sèrie a la nostra latitud,
però no es publiquen: el que cobreixen de més és anterior a qualsevol dada d'aquí.

Quatre paranys ja trepitjats:

- **La mitjana global enganya.** Cal la banda de latitud. Vegeu l'Agung.
- **`_FillValue = 9999`.** El netCDF de Sato-Lacis acaba el 2012 però el fitxer
  arriba al 2022 farcit. Sense emmascarar-lo surten deu anys amb SAOD = 1,0, que
  seria un apagat de sol total.
- **Són netCDF-3 clàssic** i el projecte no té `scipy` ni `netCDF4`. Un lector
  en Python pur són unes 40 línies, però `tau` és variable de registre i
  l'*offset* de cada mes no és el trivial: cal sumar la mida de registre de
  totes les variables de registre.
- **El conveni de desfasament de l'ENSO s'ha de declarar**, perquè decideix el
  signe. Si es publica, va a METODOLOGIA.

Estirar l'ENSO més enrere del 1950 no compra res: l'ONI net arriba fins allà i
el SOI del CPC al 1951; per anar al 1876 cal el fitxer del BOM. Com que el
composite modern ja dona zero, allargar-lo només allargaria una sèrie que no
correlaciona.

Per **veure** de debò aquests events a Catalunya caldria una sèrie més llarga
que la XEMA (l'Observatori Fabra, o la sèrie homogeneïtzada de Barcelona). Això
vol dir una segona font i encadenar sèries, que és exactament el que
[METODOLOGIA.md](METODOLOGIA.md) §2.5 es nega a fer amb el cas de Badalona.
Decisió oberta.

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
