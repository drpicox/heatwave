# Fonts i atribució

## Origen de les dades

Totes les dades d'aquest projecte provenen de la **Xarxa d'Estacions
Meteorològiques Automàtiques (XEMA)** del Servei Meteorològic de Catalunya
(Meteocat), publicades al portal de dades obertes de la Generalitat de
Catalunya.

> Font: Servei Meteorològic de Catalunya (XEMA). Dades obertes de la Generalitat
> de Catalunya.

La data de la darrera actualització de la font es publica a
[`site/data/meta.json`](../site/data/meta.json) (camp `source_last_updated`) i es
mostra a totes les pàgines del web.

## Conjunts de dades utilitzats

| dataset | identificador | ús |
|---|---|---|
| [Dades meteorològiques diàries de la XEMA](https://analisi.transparenciacatalunya.cat/d/7bvh-jvq2) | `7bvh-jvq2` | mínimes i màximes diàries |
| [Metadades estacions meteorològiques automàtiques](https://analisi.transparenciacatalunya.cat/d/yqwd-vj5e) | `yqwd-vj5e` | nom, altitud, coordenades, emplaçament, estat |
| [Metadades variables meteorològiques](https://analisi.transparenciacatalunya.cat/d/4fb2-n3yi) | `4fb2-n3yi` | codis i unitats |
| [Dades meteorològiques de la XEMA](https://analisi.transparenciacatalunya.cat/d/nzvn-apee) | `nzvn-apee` | lectures semihoràries (pendent, fase 2) |

Variables emprades del dataset diari:

| codi | variable | unitat |
|---|---|---|
| `1002` | temperatura mínima diària | °C |
| `1001` | temperatura màxima diària | °C |
| `1300` | precipitació acumulada diària | mm |
| `1303` | precipitació màxima en 1 h del dia | mm |

Totes quatre arrenquen el **1988-09-01** i tenen la mateixa cobertura (uns 187
punts de mesura el 2024).

L'amplitud tèrmica (`1004`) no es descarrega perquè s'ha verificat que és
exactament `1001 − 1002`.

Hi ha una segona precipitació acumulada, `1301`, que va de les 8 h a les 8 h
segons la convenció meteorològica. Aquí es fa servir `1300`, de dia natural, per
coherència amb la temperatura, que també va per dia natural.

El dataset publica moltes més variables diàries que aquí no es fan servir:
humitat relativa, irradiació solar, vent, pressió i gruix de neu (aquesta última
només a 20 estacions).

Compte si en fas servir més: a `7bvh-jvq2` el camp `codi_variable` és **numèric**
(`codi_variable=1002`), mentre que a `nzvn-apee` és **text**
(`codi_variable='32'`).

## Condicions d'ús

El portal no publica aquestes dades sota una llicència oberta estàndard tipus
Creative Commons. La fitxa remet a l'[avís legal de
meteo.cat](https://www.meteo.cat/wpweb/avis-legal/), que empara la reutilització
en la llei 18/2015 i hi posa quatre condicions, textualment:

> Que el contingut de la informació no sigui alterat. Que no es desnaturalitzi el
> contingut de la informació. Que es citi la font. Que s'indiqui la data de la
> darrera actualització.

Com les complim:

- **No alterar el contingut.** Els valors diaris es publiquen tal com arriben de
  la XEMA, sense arrodonir ni reescalar. L'únic que es descarta són els valors
  que la pròpia font marca com a `No representatiu`, i es declara quants són.
- **No desnaturalitzar.** Cada gràfic enllaça el dataset original, i les
  limitacions (sèries no homogeneïtzades, dades no validades científicament)
  estan a [METODOLOGIA.md](METODOLOGIA.md) i enllaçades des del web.
- **Citar la font.** L'atribució apareix a totes les pàgines.
- **Indicar la darrera actualització.** Es mostra la data real de la font, no la
  de generació del web, que també es publica per separat.

No hi ha, a l'avís legal, cap restricció d'ús comercial ni cap prohibició de
descàrrega massiva.

## Aquest projecte no és un mirall del dataset

Al repositori només hi ha **agregats derivats**: histogrames i mitjanes. La sèrie
diària no es republica. Cada fitxa d'estació enllaça les dades brutes d'aquella
estació directament al portal, amb tots els camps originals:

```
https://analisi.transparenciacatalunya.cat/resource/7bvh-jvq2.csv
  ?$where=codi_estacio='WU' and codi_variable in (1002,1001)
  &$order=data_lectura
```

És deliberat, i per tres motius: pesa un 70 % menys, evita que circuli una còpia
que envelleix mentre l'original es corregeix, i deixa clar que la font de veritat
és el Meteocat i no nosaltres.

El codi és obert. Els agregats es poden reutilitzar citant tant la font original
com aquest projecte, però si hi ha discrepància té raó el Meteocat.

Les dades crues descarregades per generar-ho no es versionen (`cache/` està a
`.gitignore`); es reconstrueixen amb `./dothething.sh`.
