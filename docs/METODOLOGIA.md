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

### 2.4 Les estacions no s'encadenen mai

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
| `data/index.json` | l'imprescindible de cada estació per al selector (~40 KB) |
| `data/st/<CODI>.json` | la fitxa sencera d'una estació (~36 KB) |
| `data/meta.json` | dates, atribució i comptadors del control de qualitat |
| `data/stations.json`, `data/hist-*.json` | agregats de totes les estacions alhora, per a comparacions futures |

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

## 6. Limitacions que has de conèixer

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

## 7. Reproduir-ho

Tot el que hi ha al web surt de `./dothething.sh`, que descarrega, filtra, calcula i
escriu `site/data/`. El fitxer `site/data/meta.json` porta la data de generació,
la data de la darrera actualització de la font i els comptadors de tot el que
s'ha descartat.

Els tests de `tests/` fixen valors verificats a mà contra l'API. Si un canvi al
pipeline els mou, o el canvi és dolent o la font ha canviat, i cap dels dos casos
s'ha de publicar sense mirar-lo.
