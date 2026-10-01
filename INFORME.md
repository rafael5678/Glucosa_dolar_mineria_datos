# Informe de minería de datos

**Glucosa, consumo de energía y precio del dólar**

Observatorio VETA · sexto semestre

Este informe describe tres conjuntos de datos, mide cómo se relacionan sus variables y ajusta un modelo lineal en cada uno. Los números salen de los archivos del proyecto. La página `index.html` muestra los mismos resultados de forma visual.

---

## 1. Resumen

Se trabajaron 12.500 registros repartidos en tres problemas de regresión.

| Conjunto | Registros | Variable objetivo | R² | Error típico (RMSE) |
| --- | ---: | --- | ---: | ---: |
| Glucosa | 2.000 | Nivel de glucosa | 0,685 | 15,33 |
| Energía | 10.000 | Consumo de energía | 0,901 | 20,13 |
| Dólar | 500 | Precio del dólar | 0,995 | 50,25 |

La lectura no es que el tercer modelo sea “el mejor” por tener el R² más alto. En la glucosa, la edad ordena el nivel y la actividad física lo corrige un poco. En la energía, la temperatura y la hora del día explican casi todo el consumo. En el dólar, el paso de los días se come a la inflación y a la tasa de interés: el ajuste es altísimo porque la serie es casi una línea recta, no porque las variables económicas aporten una señal propia.

Los tres modelos describen asociación dentro de estos archivos. No demuestran causa.

## 2. Objetivo

El objetivo es leer cada archivo con el mismo procedimiento y comparar qué variable mueve de verdad a la objetivo.

En concreto:

1. Describir la escala de cada variable.
2. Medir la relación lineal de cada atributo con la variable objetivo.
3. Ajustar una regresión lineal múltiple y leer sus coeficientes, el R² y el RMSE.
4. Separar un ajuste alto de una explicación útil.

## 3. Descripción de los datos

Los tres archivos están en la raíz del proyecto. No se eliminaron filas: no hay celdas vacías y todas las columnas llegan como número.

### 3.1 Glucosa (`glucosa_data.csv`)

2.000 personas. La objetivo es el nivel de glucosa, en la escala del archivo (el rango, de 43 a 228, coincide con la lectura habitual en mg/dL).

| Variable | Mínimo | Máximo | Media | Mediana | Desviación |
| --- | ---: | ---: | ---: | ---: | ---: |
| Edad | 20 | 79 | 49,16 | 50 | 17,54 |
| IMC | 10,59 | 39,43 | 24,96 | 25,03 | 3,98 |
| Actividad física | 0 | 9 | 4,66 | 5 | 2,91 |
| Nivel de glucosa | 43,42 | 227,56 | 139,63 | 139,97 | 27,34 |

La media y la mediana de la glucosa casi coinciden (139,63 y 139,97). La distribución está centrada y no la arrastra un extremo suelto. La actividad física es una puntuación de 0 a 9, no horas medidas.

### 3.2 Energía (`energia_data.csv`)

10.000 lecturas. La objetivo es el consumo, en las unidades del archivo. La temperatura está en una escala compatible con grados ambiente.

| Variable | Mínimo | Máximo | Media | Mediana | Desviación |
| --- | ---: | ---: | ---: | ---: | ---: |
| Temperatura | 5,39 | 44,63 | 24,92 | 24,90 | 5,00 |
| Hora | 1 | 24 | 12,49 | 12 | 6,92 |
| Día de la semana | 1 | 7 | 4,00 | 4 | 2,00 |
| Consumo de energía | 185,20 | 631,09 | 400,04 | 399,27 | 63,83 |

El día de la semana llega codificado del 1 al 7. El archivo no dice qué número es lunes. Por eso el informe habla de “día 1” a “día 7” y no de nombres del calendario.

### 3.3 Dólar (`dolar_data.csv`)

500 días seguidos. La objetivo es el precio del dólar en la escala del archivo.

| Variable | Mínimo | Máximo | Media | Mediana | Desviación |
| --- | ---: | ---: | ---: | ---: | ---: |
| Día | 1 | 500 | 250,50 | 250,50 | 144,48 |
| Inflación | 0,0038 | 0,0393 | 0,0200 | 0,0201 | 0,0049 |
| Tasa de interés | 3,65 | 6,32 | 5,02 | 5,01 | 0,49 |
| Precio del dólar | 3.940,36 | 6.553,60 | 5.211,77 | 5.218,79 | 723,90 |

La inflación viene en proporción: 0,02 es 2 %. El precio abre en 4.024,83 el día 1 y cierra en 6.479,38 el día 500. La subida del periodo es de 2.454,55. El cambio de un día al siguiente promedia 4,92, pero su desviación es 71,73: la tendencia es firme y el ruido diario es ancho. El salto más bajo fue −184,65 y el más alto, 246,15.

## 4. Metodología

En los tres conjuntos se usó el mismo camino.

**Descripción.** Mínimo, máximo, media, mediana y desviación estándar. Sirve para saber la escala antes de interpretar un coeficiente. Un coeficiente de −338 en la inflación no significa lo mismo que uno de −2,5 en la tasa, porque las variables no viven en la misma unidad.

**Correlación de Pearson.** Mide si dos variables suben juntas en línea recta. Cerca de 1, suben juntas. Cerca de −1, una sube cuando la otra baja. Cerca de 0, no hay relación lineal. No detecta curvas ni dice cuál variable causa a la otra.

**Regresión lineal múltiple.** Se estima con mínimos cuadrados ordinarios. La ecuación tiene un intercepto y un coeficiente por cada atributo. Cada coeficiente responde a esta pregunta: si esa variable sube una unidad y las demás se quedan quietas, ¿cuánto cambia la estimación?

Se reportan dos medidas de ajuste:

- **R².** Fracción de la variación de la objetivo que el modelo alcanza a contar. Va de 0 a 1 en estos ajustes.
- **RMSE.** Raíz del error cuadrático medio. Está en las mismas unidades de la objetivo y se lee como el error típico.

El ajuste se hizo con todos los registros de cada archivo. El R² y el RMSE son, por tanto, de entrenamiento: dicen qué tan bien el modelo recorre los datos que ya vio. No son una prueba sobre registros nuevos.

## 5. Resultados

### 5.1 Glucosa

Correlación de cada atributo con el nivel de glucosa:

| Atributo | Pearson |
| --- | ---: |
| Edad | 0,790 |
| IMC | 0,138 |
| Actividad física | −0,198 |

La edad es la señal dominante. El IMC empuja en el mismo sentido, pero poco. La actividad física va al revés: a más puntuación, menor glucosa.

El modelo ajustado es:

**Glucosa ≈ 66,31 + 1,23·Edad + 0,88·IMC − 2,01·Actividad física**

R² = 0,685. RMSE = 15,33.

Leído en unidades: cada año de edad suma alrededor de 1,23 al nivel estimado; cada punto de IMC suma 0,88; cada punto de actividad resta 2,01. Con las tres variables, el modelo deja fuera cerca de un tercio de la variación. Un error típico de 15 sobre una media de 140 alcanza para ver la pendiente y no para clavar el valor de una persona.

La media por década confirma la recta de la edad:

| Década | Personas | Glucosa media |
| --- | ---: | ---: |
| 20–29 | 348 | 108,3 |
| 30–39 | 340 | 122,1 |
| 40–49 | 297 | 132,7 |
| 50–59 | 360 | 146,3 |
| 60–69 | 322 | 159,4 |
| 70–79 | 333 | 170,2 |

De la veintena a los setenta y tantos hay unos 62 puntos de diferencia. El salto entre décadas es parejo, del orden de 11 a 14 puntos, coherente con el coeficiente de 1,23 por año.

Por actividad, agrupando la puntuación:

| Grupo | Puntuación | Personas | Glucosa media |
| --- | --- | ---: | ---: |
| Baja | 0 a 2 | 575 | 146,1 |
| Media | 3 a 5 | 569 | 142,0 |
| Alta | 6 a 9 | 856 | 133,7 |

Quien más se mueve queda unos 12 puntos por debajo de quien casi no se mueve. Es una diferencia real, y más chica que la de la edad. Por eso el título de esa sección en la página es que la edad pesa más que el peso: el IMC, aquí, es la señal débil.

### 5.2 Energía

Correlación de cada atributo con el consumo:

| Atributo | Pearson |
| --- | ---: |
| Temperatura | 0,772 |
| Hora del día | 0,529 |
| Día de la semana | −0,102 |

El modelo ajustado es:

**Consumo ≈ 101,38 + 9,97·Temperatura + 5,01·Hora − 3,09·Día de la semana**

R² = 0,901. RMSE = 20,13.

Un grado más de temperatura suma cerca de 10 unidades de consumo. Una hora más en el reloj suma cerca de 5. El día de la semana resta unas 3 unidades por cada paso del código 1 al 7, un efecto pequeño al lado de los otros dos. El error típico de 20, sobre una media de 400, es estrecho: este es el modelo más útil de los tres, porque explica mucho y las variables que lo sostienen se entienden.

El reloj del día lo muestra sin el modelo. La media de la hora 1 es 348,0 y la de la hora 24 es 459,1. Entre las horas 1 y 6 la media es 357,0. Entre las 18 y las 24 sube a 442,4. La temperatura media de cada hora se mantiene cerca de 25°, así que la subida a lo largo del día no es un disfraz del calor: hora y temperatura aportan por separado, y por eso las dos entran con coeficiente claro.

El día de la semana se mueve poco. La media del día 1 es 412,2 y la del día 7 es 391,0. Hay una inclinación, y es secundaria.

### 5.3 Dólar

Correlación de cada atributo con el precio:

| Atributo | Pearson |
| --- | ---: |
| Día | 0,998 |
| Inflación | 0,020 |
| Tasa de interés | 0,074 |

El modelo ajustado es:

**Precio ≈ 3.978,98 + 5,00·Día − 338,06·Inflación − 2,53·Tasa de interés**

R² = 0,995. RMSE = 50,25.

El día suma casi 5 unidades de precio por jornada. Eso solo, a lo largo de 500 días, reconstruye la subida de unos 2.500 que se ve en el archivo. Inflación y tasa, miradas por su cuenta, casi no se correlacionan con el precio.

El coeficiente de la inflación parece enorme y no lo es en la práctica. La inflación está en proporción, no en puntos porcentuales. Una subida de 0,01 en el archivo (un punto porcentual) mueve la estimación en −3,38. Una desviación estándar de la inflación (0,0049) la mueve en cerca de −1,7. La tasa, por su desviación estándar, la mueve en cerca de −1,2. Las dos quedan muy por debajo del error típico de 50 y del paso diario de 5. El modelo las conserva porque están en el archivo, no porque cuenten una historia económica dentro de estos datos.

Hay otra lectura, y es la importante para minería. Un R² de 0,995 puede esconder que una sola columna —el calendario— se llevó la variable objetivo. Inflación y tasa no fallan el modelo: el modelo no las necesita. Cuando se recorre un día concreto con su inflación y su tasa reales, la diferencia entre el precio del archivo y la estimación cabe a menudo en ese error de 50, y a veces se sale. La lupa de la página hace exactamente esa comparación.

## 6. Comparación de los tres modelos

| | Glucosa | Energía | Dólar |
| --- | --- | --- | --- |
| Lo que manda | Edad (r = 0,790) | Temperatura (r = 0,772) y hora (r = 0,529) | Día (r = 0,998) |
| Lo que corrige poco | IMC y actividad | Día de la semana | Inflación y tasa |
| R² | 0,685 | 0,901 | 0,995 |
| RMSE | 15,33 | 20,13 | 50,25 |
| RMSE frente a la media | 15 sobre 140 | 20 sobre 400 | 50 sobre 5.212 |
| Uso razonable | Ver la pendiente | Estimar el consumo | Describir la tendencia |

El orden de utilidad no sigue al orden del R².

- La energía es el mejor compromiso: ajuste alto y variables con sentido propio.
- La glucosa es un modelo parcial. La edad dibuja la escalera y queda un tercio de variación sin explicar. Sirve para orientar, no para reemplazar una medición.
- El dólar es un modelo casi perfecto y, a la vez, una advertencia. Predice el precio porque el precio ya venía subiendo día tras día. No dice que la inflación o la tasa lo estén empujando en este archivo.

## 7. Qué se puede afirmar y qué no

Se puede afirmar, dentro de estos datos:

- En las 2.000 personas, el nivel de glucosa crece con la edad de forma casi regular, baja algo con la actividad y apenas se mueve con el IMC.
- En las 10.000 lecturas, el consumo crece con el calor y con la hora, y el día de la semana pesa poco.
- En los 500 días, el precio es una tendencia lineal. El resto de columnas no agrega una señal clara.

No se puede afirmar:

- Que la edad cause el nivel de glucosa, ni que moverse lo baje en una persona concreta. El coeficiente resume a este grupo.
- Que el archivo de glucosa sirva como diagnóstico. El RMSE de 15 mg/dL y el tercio de variación no explicada lo impiden. La página lo dice en la consola.
- Que la inflación no importe en la economía. Importa poco **en este archivo**, una vez que el día ya está en la ecuación.
- Que el R² del dólar vaya a repetirse en otro periodo. El modelo aprendió esta rampa de 500 días.

## 8. Alcance y límites

1. **Linealidad.** Pearson y la regresión solo ven relaciones en línea recta. Si alguna variable actuara en curva, estos números la aplastarían.
2. **Ajuste sobre todos los datos.** No hubo partición de entrenamiento y prueba. El error reportado es optimista respecto de registros futuros.
3. **Sin otras variables.** En glucosa faltan, por ejemplo, antecedentes o medicación. En energía, el tipo de día o el uso del equipo. En el dólar, el tipo de cambio puede depender de hechos que no están en las tres columnas.
4. **Codificación.** La actividad física y el día de la semana son códigos del archivo, no unidades físicas con nombre.
5. **Escala de la inflación.** Leer −338 como “338 de precio por cada punto de inflación” es un error de unidad. El informe lo corrige en el apartado 5.3.
6. **Asociación.** Nada en el procedimiento identifica causa. Un coeficiente dice cómo se mueve la estimación cuando una columna cambia y las otras se dejan fijas.

## 9. Conclusiones

1. Los tres archivos admiten el mismo análisis y cuentan historias distintas. El método no cambia; cambia qué columna se queda con la explicación.
2. En glucosa, la edad es la veta principal. De 108 en la veintena a 170 cerca de los ochenta. Actividad física resta; IMC casi no entra. El modelo explica el 68,5 % y se equivoca, en típico, por 15.
3. En energía, temperatura y hora construyen el consumo. El modelo explica el 90,1 % con un error típico de 20 sobre una media de 400. Es el resultado más aprovechable.
4. En el dólar, el día explica el 99,5 %. La subida es de unos 5 por jornada. Inflación y tasa, en la escala en que de verdad se mueven, no alcanzan a salir del ruido.
5. Un R² alto no cierra un análisis. Hay que mirar qué variable lo produce y si el error, en las unidades de la objetivo, sigue siendo útil.

## 10. Material del proyecto

| Archivo | Qué es |
| --- | --- |
| `glucosa_data.csv` | 2.000 registros de edad, IMC, actividad y glucosa |
| `energia_data.csv` | 10.000 lecturas de temperatura, hora, día y consumo |
| `dolar_data.csv` | 500 días de inflación, tasa y precio |
| `generar_datos.py` | Calcula descripciones, correlaciones, regresión y las series de la página |
| `js/datos.js` | Resultado de ese cálculo, listo para el navegador |
| `index.html`, `css/estilos.css`, `js/app.js` | Observatorio visual: gráficos, reloj, lupa y cámara de corte |

Para regenerar los números de la página:

```bash
python generar_datos.py
```

La página se abre con `index.html`. Ahí están los gráficos de este informe, la consola de cada modelo, el reloj de 24 horas del consumo, la lupa día a día del dólar y la cámara que compara un registro real con lo que el modelo habría dicho.
