"""Prepara las series y los modelos que consume la página."""

import csv
import json
import math
from pathlib import Path

BASE = Path(__file__).resolve().parent


def cargar(nombre):
    with open(BASE / nombre, newline="", encoding="utf-8") as archivo:
        lector = csv.DictReader(archivo)
        filas = [{k: float(v) for k, v in fila.items()} for fila in lector]
    return filas


def pearson(x, y):
    n = len(x)
    mx, my = sum(x) / n, sum(y) / n
    num = sum((a - mx) * (b - my) for a, b in zip(x, y))
    dx = math.sqrt(sum((a - mx) ** 2 for a in x))
    dy = math.sqrt(sum((b - my) ** 2 for b in y))
    return num / (dx * dy) if dx and dy else 0.0


def ols(features, y):
    n = len(y)
    p = len(features[0]) + 1
    matriz = [[0.0] * (p + 1) for _ in range(p)]
    for i in range(n):
        fila = [1.0] + features[i]
        for j in range(p):
            matriz[j][p] += fila[j] * y[i]
            for k in range(p):
                matriz[j][k] += fila[j] * fila[k]
    for col in range(p):
        pivote = max(range(col, p), key=lambda r: abs(matriz[r][col]))
        matriz[col], matriz[pivote] = matriz[pivote], matriz[col]
        divisor = matriz[col][col]
        for j in range(col, p + 1):
            matriz[col][j] /= divisor
        for r in range(p):
            if r == col:
                continue
            factor = matriz[r][col]
            for j in range(col, p + 1):
                matriz[r][j] -= factor * matriz[col][j]
    coef = [matriz[i][p] for i in range(p)]
    media = sum(y) / n
    ss_res = 0.0
    ss_tot = sum((v - media) ** 2 for v in y)
    for i in range(n):
        pred = coef[0] + sum(coef[j + 1] * features[i][j] for j in range(p - 1))
        ss_res += (y[i] - pred) ** 2
    r2 = 1 - ss_res / ss_tot
    rmse = math.sqrt(ss_res / n)
    return coef, r2, rmse


def resumen(xs):
    n = len(xs)
    media = sum(xs) / n
    orden = sorted(xs)
    if n % 2:
        mediana = orden[n // 2]
    else:
        mediana = (orden[n // 2 - 1] + orden[n // 2]) / 2
    varianza = sum((v - media) ** 2 for v in xs) / (n - 1)
    return {
        "min": min(xs),
        "max": max(xs),
        "media": media,
        "mediana": mediana,
        "sd": math.sqrt(varianza),
    }


def histograma(xs, bins=16):
    lo, hi = min(xs), max(xs)
    ancho = (hi - lo) / bins if hi > lo else 1
    cuentas = [0] * bins
    for valor in xs:
        indice = min(bins - 1, int((valor - lo) / ancho))
        cuentas[indice] += 1
    centros = [lo + (i + 0.5) * ancho for i in range(bins)]
    return {"centros": centros, "cuentas": cuentas}


def muestra(xs, ys, k=220):
    n = len(xs)
    paso = max(1, n // k)
    return [[xs[i], ys[i]] for i in range(0, n, paso)][:k]


def linea_simple(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    varx = sum((x - mx) ** 2 for x in xs)
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    pendiente = cov / varx
    intercepto = my - pendiente * mx
    lo, hi = min(xs), max(xs)
    return {
        "x1": lo,
        "y1": intercepto + pendiente * lo,
        "x2": hi,
        "y2": intercepto + pendiente * hi,
    }


def grupos(filas, clave, objetivo, cortes):
    salida = []
    for lo, hi, etiqueta in cortes:
        valores = [f[objetivo] for f in filas if lo <= f[clave] <= hi]
        salida.append(
            {
                "etiqueta": etiqueta,
                "n": len(valores),
                "media": sum(valores) / len(valores) if valores else 0,
            }
        )
    return salida


def camino_hero(valores):
    lo, hi = min(valores), max(valores)
    n = len(valores)
    paso = max(1, n // 140)
    pts = valores[::paso]
    if valores[-1] != pts[-1]:
        pts.append(valores[-1])
    comandos = []
    for i, valor in enumerate(pts):
        x = 40 + (i / (len(pts) - 1)) * 1120
        y = 250 - ((valor - lo) / (hi - lo)) * 180
        comandos.append(("M" if i == 0 else "L") + f"{x:.1f},{y:.1f}")
    return " ".join(comandos)


def cuantiles(xs, pasos=100):
    orden = sorted(xs)
    ultimo = len(orden) - 1
    salida = []
    for p in range(pasos + 1):
        pos = ultimo * p / pasos
        i = int(pos)
        frac = pos - i
        if i >= ultimo:
            salida.append(orden[-1])
        else:
            salida.append(orden[i] * (1 - frac) + orden[i + 1] * frac)
    return salida


def muestras_reales(filas, claves, objetivo, k=36):
    n = len(filas)
    paso = max(1, n // k)
    salida = []
    for i in range(0, n, paso):
        if len(salida) >= k:
            break
        fila = filas[i]
        item = {"registro": i + 1, "real": fila[objetivo]}
        for clave in claves:
            item[clave] = fila[clave]
        salida.append(item)
    return salida


def redondear(valor):
    if isinstance(valor, float):
        return round(valor, 6)
    if isinstance(valor, list):
        return [redondear(v) for v in valor]
    if isinstance(valor, dict):
        return {k: redondear(v) for k, v in valor.items()}
    return valor


def main():
    glucosa = cargar("glucosa_data.csv")
    energia = cargar("energia_data.csv")
    dolar = cargar("dolar_data.csv")

    def columnas(filas, nombres):
        return {nombre: [f[nombre] for f in filas] for nombre in nombres}

    g = columnas(glucosa, ["Edad", "IMC", "Actividad_Fisica", "Nivel_Glucosa"])
    e = columnas(energia, ["Temperatura", "Hora", "Dia_Semana", "Consumo_Energia"])
    d = columnas(dolar, ["Dia", "Inflacion", "Tasa_interes", "Precio_Dolar"])

    def bloque(filas, objetivo, rasgos):
        y = [f[objetivo] for f in filas]
        x = [[f[r] for r in rasgos] for f in filas]
        coef, r2, rmse = ols(x, y)
        return coef, r2, rmse

    cg, r2g, rmseg = bloque(glucosa, "Nivel_Glucosa", ["Edad", "IMC", "Actividad_Fisica"])
    ce, r2e, rmsee = bloque(energia, "Consumo_Energia", ["Temperatura", "Hora", "Dia_Semana"])
    cd, r2d, rmsed = bloque(dolar, "Precio_Dolar", ["Dia", "Inflacion", "Tasa_interes"])

    horas = []
    for hora in range(1, 25):
        valores = [f["Consumo_Energia"] for f in energia if f["Hora"] == hora]
        temps = [f["Temperatura"] for f in energia if f["Hora"] == hora]
        horas.append(
            {
                "etiqueta": str(hora),
                "media": sum(valores) / len(valores),
                "temperatura": sum(temps) / len(temps),
                "n": len(valores),
            }
        )

    dias_semana = []
    for dia in range(1, 8):
        valores = [f["Consumo_Energia"] for f in energia if f["Dia_Semana"] == dia]
        dias_semana.append(
            {
                "etiqueta": f"Día {dia}",
                "media": sum(valores) / len(valores),
                "n": len(valores),
            }
        )

    deltas = [d["Precio_Dolar"][i] - d["Precio_Dolar"][i - 1] for i in range(1, len(dolar))]

    datos = {
        "hero": camino_hero(d["Precio_Dolar"]),
        "glucosa": {
            "n": len(glucosa),
            "objetivo": resumen(g["Nivel_Glucosa"]),
            "variables": {
                "Edad": resumen(g["Edad"]),
                "IMC": resumen(g["IMC"]),
                "Actividad_Fisica": resumen(g["Actividad_Fisica"]),
            },
            "correlaciones": [
                {"clave": "Edad", "etiqueta": "Edad", "r": pearson(g["Edad"], g["Nivel_Glucosa"])},
                {"clave": "IMC", "etiqueta": "IMC", "r": pearson(g["IMC"], g["Nivel_Glucosa"])},
                {
                    "clave": "Actividad_Fisica",
                    "etiqueta": "Actividad física",
                    "r": pearson(g["Actividad_Fisica"], g["Nivel_Glucosa"]),
                },
            ],
            "modelo": {
                "intercepto": cg[0],
                "terminos": [
                    {"clave": "Edad", "etiqueta": "Edad", "coef": cg[1]},
                    {"clave": "IMC", "etiqueta": "IMC", "coef": cg[2]},
                    {"clave": "Actividad_Fisica", "etiqueta": "Actividad física", "coef": cg[3]},
                ],
                "r2": r2g,
                "rmse": rmseg,
            },
            "histograma": histograma(g["Nivel_Glucosa"]),
            "porEdad": grupos(
                glucosa,
                "Edad",
                "Nivel_Glucosa",
                [
                    (20, 29, "20–29"),
                    (30, 39, "30–39"),
                    (40, 49, "40–49"),
                    (50, 59, "50–59"),
                    (60, 69, "60–69"),
                    (70, 79, "70–79"),
                ],
            ),
            "porActividad": grupos(
                glucosa,
                "Actividad_Fisica",
                "Nivel_Glucosa",
                [(0, 2, "Baja"), (3, 5, "Media"), (6, 9, "Alta")],
            ),
            "dispersion": {
                "puntos": muestra(g["Edad"], g["Nivel_Glucosa"]),
                "linea": linea_simple(g["Edad"], g["Nivel_Glucosa"]),
            },
            "cuantiles": cuantiles(g["Nivel_Glucosa"]),
            "muestras": muestras_reales(
                glucosa, ["Edad", "IMC", "Actividad_Fisica"], "Nivel_Glucosa"
            ),
        },
        "energia": {
            "n": len(energia),
            "objetivo": resumen(e["Consumo_Energia"]),
            "variables": {
                "Temperatura": resumen(e["Temperatura"]),
                "Hora": resumen(e["Hora"]),
                "Dia_Semana": resumen(e["Dia_Semana"]),
            },
            "correlaciones": [
                {
                    "clave": "Temperatura",
                    "etiqueta": "Temperatura",
                    "r": pearson(e["Temperatura"], e["Consumo_Energia"]),
                },
                {"clave": "Hora", "etiqueta": "Hora del día", "r": pearson(e["Hora"], e["Consumo_Energia"])},
                {
                    "clave": "Dia_Semana",
                    "etiqueta": "Día de la semana",
                    "r": pearson(e["Dia_Semana"], e["Consumo_Energia"]),
                },
            ],
            "modelo": {
                "intercepto": ce[0],
                "terminos": [
                    {"clave": "Temperatura", "etiqueta": "Temperatura", "coef": ce[1]},
                    {"clave": "Hora", "etiqueta": "Hora", "coef": ce[2]},
                    {"clave": "Dia_Semana", "etiqueta": "Día de la semana", "coef": ce[3]},
                ],
                "r2": r2e,
                "rmse": rmsee,
            },
            "histograma": histograma(e["Consumo_Energia"]),
            "porHora": horas,
            "porDia": dias_semana,
            "dispersion": {
                "puntos": muestra(e["Temperatura"], e["Consumo_Energia"], 260),
                "linea": linea_simple(e["Temperatura"], e["Consumo_Energia"]),
            },
            "franjas": {
                "manana": sum(f["Consumo_Energia"] for f in energia if f["Hora"] <= 6)
                / sum(1 for f in energia if f["Hora"] <= 6),
                "tarde": sum(f["Consumo_Energia"] for f in energia if f["Hora"] >= 18)
                / sum(1 for f in energia if f["Hora"] >= 18),
            },
            "cuantiles": cuantiles(e["Consumo_Energia"]),
            "muestras": muestras_reales(
                energia, ["Temperatura", "Hora", "Dia_Semana"], "Consumo_Energia"
            ),
        },
        "dolar": {
            "n": len(dolar),
            "objetivo": resumen(d["Precio_Dolar"]),
            "variables": {
                "Dia": resumen(d["Dia"]),
                "Inflacion": resumen(d["Inflacion"]),
                "Tasa_interes": resumen(d["Tasa_interes"]),
            },
            "correlaciones": [
                {"clave": "Dia", "etiqueta": "Día", "r": pearson(d["Dia"], d["Precio_Dolar"])},
                {
                    "clave": "Inflacion",
                    "etiqueta": "Inflación",
                    "r": pearson(d["Inflacion"], d["Precio_Dolar"]),
                },
                {
                    "clave": "Tasa_interes",
                    "etiqueta": "Tasa de interés",
                    "r": pearson(d["Tasa_interes"], d["Precio_Dolar"]),
                },
            ],
            "modelo": {
                "intercepto": cd[0],
                "terminos": [
                    {"clave": "Dia", "etiqueta": "Día", "coef": cd[1]},
                    {"clave": "Inflacion", "etiqueta": "Inflación", "coef": cd[2]},
                    {"clave": "Tasa_interes", "etiqueta": "Tasa de interés", "coef": cd[3]},
                ],
                "r2": r2d,
                "rmse": rmsed,
            },
            "serie": [
                {
                    "dia": f["Dia"],
                    "precio": f["Precio_Dolar"],
                    "inflacion": f["Inflacion"],
                    "tasa": f["Tasa_interes"],
                }
                for f in dolar
            ],
            "cuantiles": cuantiles(d["Precio_Dolar"]),
            "muestras": muestras_reales(
                dolar, ["Dia", "Inflacion", "Tasa_interes"], "Precio_Dolar"
            ),
            "inicio": dolar[0]["Precio_Dolar"],
            "fin": dolar[-1]["Precio_Dolar"],
            "deltas": resumen(deltas),
            "linea": {
                "x1": 1,
                "y1": cd[0] + cd[1] * 1 + cd[2] * (sum(d["Inflacion"]) / len(dolar)) + cd[3] * (sum(d["Tasa_interes"]) / len(dolar)),
                "x2": 500,
                "y2": cd[0] + cd[1] * 500 + cd[2] * (sum(d["Inflacion"]) / len(dolar)) + cd[3] * (sum(d["Tasa_interes"]) / len(dolar)),
            },
        },
    }

    salida = BASE / "js" / "datos.js"
    salida.parent.mkdir(exist_ok=True)
    payload = json.dumps(redondear(datos), ensure_ascii=False, separators=(",", ":"))
    salida.write_text("window.VETA = " + payload + ";\n", encoding="utf-8")
    print(f"Escrito {salida} ({salida.stat().st_size} bytes)")
    print("R2", round(r2g, 4), round(r2e, 4), round(r2d, 4))


if __name__ == "__main__":
    main()
