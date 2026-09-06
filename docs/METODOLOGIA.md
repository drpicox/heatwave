# Metodologia

Aquest document explica com es calcula tot el que es publica, i sobretot què
**no** es publica i per què. Si trobes una xifra al web que no puguis retrobar
seguint aquestes regles, és un error nostre: obre una incidència.

## 1. Què és una nit de calor

Partim de la **temperatura mínima diària** (variable `1002` de la XEMA), que és
la temperatura més baixa registrada durant el dia natural. A l'estiu es dona de
matinada, i és per tant la mesura de com de calorosa ha estat la nit.

Els llindars habituals:

| nom | definició |
|---|---|
| nit tropical | mínima ≥ 20 °C |
| nit tòrrida | mínima ≥ 25 °C |
| dia d'estiu | màxima ≥ 25 °C |
| dia calorós | màxima ≥ 30 °C |
| dia tòrrid | màxima ≥ 35 °C |
| dia de glaçada | mínima < 0 °C |

Al web aquests llindars són només dreceres: el selector deixa moure el llindar
on vulguis. Els noms són convencions d'ús comú, no definicions oficials del
Meteocat.

### Any natural, no temporada

Els recomptes són per **any natural**, de l'1 de gener al 31 de desembre. És la
decisió més simple i la que no amaga res: si hi ha una nit tropical el maig o
l'octubre, compta. Retallar-ho a juny–setembre eliminaria precisament els
episodis de fora de temporada, que són els que més diuen sobre si la temporada
s'està allargant.

Per això la fitxa de cada estació indica, per a cada any, **quants d'aquests
episodis han caigut fora de juny–setembre**, i quina ha estat la primera i
l'última data de l'any.

### Pluja: cada variable s'agrega diferent

Amb la precipitació no serveix copiar el que es fa amb la temperatura, i aquesta
és la part que cal entendre.

| variable | codi XEMA | com es resumeix un mes |
|---|---|---|
| temperatura mínima / màxima | `1002` / `1001` | **mitjana** |
| precipitació diària | `1300` | **total** |
| intensitat màxima en 1 h | `1303` | **màxima** |

La mitjana de mil·límetres diaris d'un mes no vol dir res: el que es vol saber és
quanta aigua hi va caure, i els totals se sumen. I d'una intensitat, el resum
d'un mes no és ni la suma ni la mitjana sinó **la punta**: importa com de fort va
ploure el pitjor dia.

Per això el segon panell canvia de forma segons la variable. Una mitjana de
temperatures no comença a zero i va amb línia; un total de mil·límetres i una
punta d'intensitat sí que hi comencen, i van amb barres. Dibuixar un total amb
línia i l'eix retallat exageraria diferències petites.

### L'histograma de la pluja amaga els dies secs

A Badalona només plou el 21 % dels dies. Si l'histograma del llindar dibuixés el
interval del zero, la barra taparia tota la resta i no es veuria res de la
distribució que de fet estàs tallant. Per a la pluja i la intensitat, l'interval
del zero **no es dibuixa** i el text diu quin percentatge de dies són secs.

### Per què la intensitat i no només el total

El senyal climàtic de la precipitació és molt més clar a la **intensitat** que al
total acumulat: no tant quanta aigua cau en un any com de fort cau quan cau. La
variable `1303` publica la precipitació màxima registrada en una hora de cada
dia, amb la mateixa cobertura que el total diari i des del 1988, de manera que es
pot preguntar directament quants dies l'any superen una intensitat determinada.

### Temperatura de bulb humit

És la temperatura que marcaria un termòmetre embolicat amb un drap moll. Importa
perquè és el límit al qual el cos es pot refredar suant: si el bulb humit ambient
puja prou, suar deixa de servir. Per damunt de **26 °C** ja és incòmode per a qui
treballa a fora, cap a **28 °C** limita l'activitat física, i a partir de **31 °C**
és perillós fins i tot en repòs.

Es calcula amb la fórmula de **Stull (2011)** a partir de temperatura i humitat
relativa. És una aproximació empírica vàlida per a humitats del 5 al 99 % i
temperatures de −20 a 50 °C; l'alternativa exacta demana resoldre una equació
implícita i no aporta res a aquesta escala.

**Es calcula des de les dades semihoràries, no des dels resums diaris**, i això
no és perfeccionisme. El bulb humit depèn de la temperatura i la humitat *al
mateix instant*, i el que interessa és la punta del dia. Vam mesurar les tres
maneres d'estimar-lo amb dades diàries contra la veritat d'un estiu sencer de
Badalona (120 dies):

| mètode | biaix | error mitjà | pitjor cas |
|---|---|---|---|
| Tw(T mitjana, HR mitjana) | −1,70 | 1,70 | 4,65 °C |
| Tw(T màxima, HR mínima) | −1,96 | 1,96 | 6,56 °C |
| Tw(T màxima, rosada de la mitjana) | −0,76 | 0,79 | 4,13 °C |

El millor subestima 0,8 °C de mitjana. Per a una mètrica que existeix per comptar
dies per damunt d'un llindar, això desplaça el recompte sencer, així que es
descarta.

Dues limitacions que cal conèixer:

- **La sèrie arrenca el 2009**, no el 1988: el registre semihorari no va més
  enrere. És la meitat d'històric que la temperatura.
- **Només hi ha dades de maig a octubre.** No és una retallada: s'ha comprovat
  que en tot l'històric i totes les estacions no hi ha ni un sol dia amb bulb
  humit estimat ≥ 24 °C fora d'aquests mesos, i que el percentil 99,9 de l'abril
  es queda a 19,2 °C. Els recomptes anuals són, doncs, complets.

Un dia només compta si té almenys 36 de les 48 lectures semihoràries: amb quatre
lectures no se sap quina va ser la punta.

### Amplitud tèrmica

La variable `1004` de la XEMA (amplitud tèrmica diària) no es descarrega: s'ha
verificat que és exactament `màxima − mínima`, i es calcula al navegador.

## 2. Control de qualitat

### 2.1 Completesa

- Un any només es considera **complet** si té dada per a ≥ 95 % dels dies de
  l'any natural.
- Per a mètriques estivals cal ≥ 87 dels 92 dies de juny, juliol i agost.
- Els anys d'obertura i tancament d'una estació són els que solen fallar aquest
  filtre. És el comportament desitjat.

Els anys incomplets **es mostren**, però marcats, i **no entren mai** en cap
càlcul de tendència.

### 2.2 Anys en curs

L'any en curs no es considera complet encara que porti moltes dades. Es dibuixa
sempre diferenciat i amb la data fins a la qual arriba. Una barra a mig omplir
al final d'un gràfic de barres és desinformació involuntària, encara que cada
número que la compon sigui correcte.

### 2.3 El camp `estat`

Cada valor diari ve amb un camp `estat`. A la font hi hem trobat tres casos, i
els tractem diferent:

- **`Representatiu`** — el gruix de les dades. Es fa servir.
- **`No representatiu`** — dies en què l'extrem diari s'ha calculat sobre un dia
  incomplet. Porten valor, i el valor és dolent: hi ha mínimes diàries
  registrades a les 11:29 del matí a estacions d'alta muntanya a l'hivern.
  **Es descarten.** Són poques (de l'ordre de centenars sobre milions) però són
  exactament el tipus de valor que embruta una mètrica basada en extrems.
- **Buit** — entre el 27 i el 29 de juny de 2025 gairebé tota la xarxa té aquest
  camp sense omplir. Els valors d'aquells tres dies encaixen amb els dels dies
  del voltant, així que és un forat administratiu i no de dades. **Es fan
  servir**, i el nombre exacte es declara a `data/meta.json`.

Si algun dia hi apareix un valor que no sabem interpretar, el pipeline s'atura
en comptes de decidir sol.

El filtre s'aplica **per variable**: si la màxima d'un dia no és representativa
però la mínima sí, només es perd la màxima.

### 2.4 Quines estacions arriben al web

De les 241 estacions amb dades, al web n'hi arriben **182**. Perquè hi entri, una
estació ha de seguir reportant (dada de l'any passat o d'aquest) i tenir com a
mínim un any complet des del 2018.

Les 59 excloses no es perden: segueixen a `data/stations.json` i als histogrames
de totes les estacions, que és on viu el registre complet. El que passa és que
41 d'elles van deixar d'emetre abans del 2018 i no poden dir res del que està
passant ara, que és la pregunta d'aquest projecte.

És una decisió editorial, no de qualitat: les seves dades són igual de bones,
però responen una altra pregunta.

### 2.5 Les estacions no s'encadenen mai

Cada `codi_estacio` és una sèrie independent. No es concatena mai amb cap altra,
encara que el nom s'assembli i el municipi sigui el mateix.

El cas canònic és Badalona: `DH` (Mas Ram) es va desmantellar el 2005 i `WU`
(Museu) es va donar d'alta el mateix any, però a una **altitud i un emplaçament
diferents**. Unir-les fabricaria una sèrie llarga que no ha existit mai, i
qualsevol tendència que en sortís seria un artefacte del canvi d'ubicació.

## 3. Què es publica aquí, i què no

**Aquest lloc no republica les dades del Meteocat.** Publica agregats derivats i
enllaça la font per a les dades brutes. Cada fitxa d'estació porta un enllaç que
et baixa la sèrie diària sencera d'aquella estació **directament del portal de
dades obertes**, amb tots els camps originals (`estat`, `hora_tu`, unitats). Si
vols el cru, el treus d'on viu i d'on es manté corregit, no d'una còpia nostra.

El que sí que es publica:

| fitxer | què és |
|---|---|
| `data/index.json` | l'imprescindible de cada estació per al selector (~35 KB) |
| `data/st/<CODI>.json` | la fitxa sencera d'una estació (~36 KB) |
| `data/meta.json` | dates, atribució i comptadors del control de qualitat |
| `data/comarques.json` | contorn comarcal simplificat, per a la vista de mapa |
| `data/context.json` | ENSO i aerosol volcànic any a any, per a la franja de context (~2 KB) |
| `data/map-*.json` | histogrames mensuals de totes les estacions, per a la vista de mapa |
| `data/stations.json`, `data/hist-*.json` | agregats de totes les estacions alhora, per a comparacions futures |

### La vista de mapa es paga a part

L'explorador d'una estació carrega uns 16 KB de dades. La vista de mapa en
necessita moltes més —el contorn i els histogrames de les 182 estacions—, i per
això **només es baixen quan obres el mapa**: 34 KB del contorn i uns 550 KB dels
histogrames, un sol cop per sessió. Qui no obri el mapa no ho paga.

El contorn ve de [Límits administratius
comarcals](https://analisi.transparenciacatalunya.cat/d/aasi-gwnd), que en cru
són 661.514 vèrtexs i 25,7 MB. Simplificat amb Douglas-Peucker a 0,002° (uns
222 m) queden 6.855 vèrtexs, i a l'escala a què es dibuixa l'error és inferior a
un píxel.

**El mapa són punts, no una superfície.** Entre dues estacions no hi ha dada, i
cada estació té la seva altitud i el seu entorn. Un mapa de colors continu
convidaria a llegir «aquí fa més calor» quan el que hi ha són 182 mesures en
llocs molt diferents, amb sèries que no estan homogeneïtzades.

La pàgina només carrega l'índex i **una** fitxa: uns 16 KB comprimits. La fitxa
porta, per a cada any, els histogrames i les mitjanes **mes a mes**, la cobertura
i els quatre rècords amb la seva data.

La resolució mensual permet triar qualsevol finestra de mesos i qualsevol
llindar. El que **no** permet, i s'assumeix conscientment, són les ratxes de nits
consecutives i les dates exactes de llindars que no siguin els de drecera. Qui
necessiti això té l'enllaç a la font.

Els rècords s'inclouen precisament perquè són l'única cosa que un histograma no
pot reconstruir: no guarda dates. Són quatre números per any i variable, molt
més barat que publicar la sèrie diària per poder-los trobar. Van sempre referits
a **l'any sencer**, també quan tens una època de l'any seleccionada, i la fitxa
ho diu.

Les mitjanes d'una finestra es reconstrueixen exactament ponderant les mitjanes
mensuals pel nombre de dies de cada mes, i el nombre de dies surt de sumar el
mateix histograma. Hi ha un test que ho comprova reproduint les mitjanes de
dècada des dels fitxers publicats, no des de les dades internes.

## 4. Com es calculen els recomptes al navegador

El pipeline publica, per a cada estació, any i mes, un **histograma** dels valors
diaris en intervals de **0,5 °C**. El navegador en deriva el recompte de
qualsevol llindar sense tornar a demanar res, i per això el llindar pot ser un
control que llisca en comptes d'una llista tancada.

Mig grau i no un grau sencer per dos motius: és la resolució a la qual la font
publica els valors, i l'histograma es dibuixa darrere del control de llindar —
a un grau, el perfil de la distribució surt massa dentat per llegir-hi la forma.

Els intervals són semioberts per l'esquerra: l'interval que comença a *k* conté
els valors de [*k*, *k*+0,5). D'això en surten dues operacions **exactes**, i
només dues:

```
dies amb valor ≥ T  =  suma dels intervals que comencen a ≥ T
dies amb valor < T  =  suma dels intervals que comencen a  < T
```

Per això el control de condició ofereix **«≥ o més»** i **«menys de»**, i no
«≤ o menys»: aquesta última no es pot respondre exactament amb aquesta graella, i
preferim una definició explícita a un número aproximat que sembli exacte. El
mateix motiu fa que el dia de glaçada es defineixi com `mínima < 0`.

Les **mitjanes** no passen per la graella: es publiquen exactes, mes a mes. La
mitjana d'una finestra qualsevol es reconstrueix ponderant les mitjanes mensuals
pel nombre de dies, i el nombre de dies surt de sumar el mateix histograma.

## 5. Tendències

S'utilitza el **pendent de Theil–Sen**: la mediana de tots els pendents entre
parelles d'anys. És no paramètric i robust a valors extrems, que és el que
convé amb sèries curtes i sorolloses. Només hi entren els anys complets, i calen
com a mínim 5 anys.

Un pendent no és una predicció ni una demostració de causa. És una descripció
del que ha fet la sèrie observada.

### Una tendència no vol dir res sense el seu període

Aquesta és la trampa més gran de tot el projecte, i s'hi cau sense adonar-se'n.

Calculant la tendència de la mínima estival amb **cada estació sobre el seu propi
històric**, surt una correlació aparent amb l'altitud. Repetint-ho amb **finestra
comuna sobre les mateixes 44 estacions**, el resultat és un altre:

| finestra | tendència mediana | correlació amb l'altitud |
|---|---|---|
| 1996–2025 | 0,435 °C/dècada | r = 0,03 |
| 2006–2025 | 0,794 °C/dècada | r = 0,27 |

Una sèrie que comença el 2006 no inclou els anys plans dels noranta, i per tant
té una tendència més forta *pel simple fet de començar més tard*. Comparar una
estació amb trenta anys d'històric amb una que en té vint no compara climes:
compara finestres.

Per això, al web, tota tendència va acompanyada del seu període, i el comparador
retalla automàticament a la finestra comuna a totes les estacions
seleccionades i ho diu de manera visible.

## 6. La franja de context

Sota el gràfic d'anys hi ha dues pistes: El Niño / la Niña i l'aerosol volcànic
estratosfèric. **No expliquen la sèrie.** Hi són perquè són les dues preguntes
que fa tothom davant d'una sèrie que puja, i perquè totes dues estan mesurades i
la resposta és que no.

### Es dibuixa la magnitud, no una categoria

No hi ha marques de «any del Niño sí / no», i és una decisió i no una mandra. Una
marca és binària i afirma que allò és rellevant; amb l'ENSO en sortirien
marcats un 40 % dels anys i el lector hi buscaria el patró que la mesura diu que
no hi és. Amb els volcans seria pitjor: en tota la sèrie hi hauria **una sola
marca**, i una marca solitària sembla decoració.

Una franja contínua, en canvi, pot dibuixar que una cosa és **plana**, que és
precisament el resultat. L'escala de color és fixa i no depèn del que hi hagi a
la vista: el mateix color vol dir sempre el mateix valor, canviïs d'estació o de
rang d'anys.

### El conveni de desfasament de l'ENSO

Un episodi d'El Niño fa el màxim cap al desembre–febrer i la resposta de la
temperatura global va tres a sis mesos enrere. Aquí s'etiqueta cada any amb
l'**ONI de la temporada DJF que hi comença el gener**: DJF 1998 (des. 1997 –
feb. 1998, el pic del Niño del 1997-98) etiqueta l'any **1998**.

Això no és un detall d'implementació, és tota la conclusió. Compostant la mínima
estival de 2006–2025 amb aquest conveni, els estius del Niño surten **0,44 °C
més freds**; amb l'ONI simultani de juny–agost, **0,28 °C més calents**. Mateixes
dades, signe oposat. Per això el conveni va escrit i no implícit.

En cap de les finestres provades la diferència arriba a la variabilitat
interanual, i el signe no és estable. Els números són a
[BACKLOG.md](BACKLOG.md).

### El volcà, i per què no se'n pot dir res

El criteri no és el VEI sinó el sofre que arriba a l'estratosfera: l'erupció de
l'Eyjafjallajökull (2010) va tancar l'espai aeri d'Europa i a la nostra latitud
dona **menys que la mitjana del registre**, perquè la ploma es va quedar a la
troposfera.

En tota la sèrie de la XEMA hi ha **un sol event**: el Pinatubo, que a 38–46° N
fa el 1992 unes setze vegades el fons. És, de fet, el pic més gran des del 1850
en aquesta franja de latitud. I cau el quart any de la sèrie, quan la xarxa tenia
**nou estacions amb l'estiu complet**. És l'única cosa que valdria la pena mirar
i és justament la que no es pot mirar.

## 7. Limitacions que has de conèixer

**Les sèries no estan homogeneïtzades.** Els canvis d'instrument, de garita, de
manteniment o d'entorn immediat de l'estació poden produir salts que no tenen res
a veure amb el clima. Homogeneïtzar-les és una feina especialitzada que aquí no
s'ha fet. Per a tendències a llarg termini això és una limitació real, i és el
motiu pel qual una diferència petita entre dues estacions no s'hauria de
sobreinterpretar.

**L'entorn de l'estació canvia.** Una estació que fa vint anys era en un camp i
avui té un polígon a cent metres mesura una cosa diferent, i el registre no
n'informa.

**Aquestes no són dades científiques validades.** Són dades obertes
reprocessades. Per a qualsevol ús que ho requereixi, cal anar a la font original
i, si escau, al Servei Meteorològic de Catalunya.

**La cobertura de la xarxa creix amb el temps.** Hi ha moltes més estacions
operatives ara que el 1990. Qualsevol comparació entre estacions ha de fer-se
estació a estació i mai agregant tota la xarxa en un sol número.

## 8. Reproduir-ho

Tot el que hi ha al web surt de `./dothething.sh`, que descarrega, filtra, calcula i
escriu `site/data/`. El fitxer `site/data/meta.json` porta la data de generació,
la data de la darrera actualització de la font i els comptadors de tot el que
s'ha descartat.

Els tests de `tests/` fixen valors verificats a mà contra l'API. Si un canvi al
pipeline els mou, o el canvi és dolent o la font ha canviat, i cap dels dos casos
s'ha de publicar sense mirar-lo.
