"""Entrena las tres regresiones con scikit-learn y exporta los .joblib."""

from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

RAIZ = Path(__file__).resolve().parents[2]
ARTEFACTOS = Path(__file__).resolve().parent / "artefactos"
EMPAQUETADOS = RAIZ / "modelos"

PREGUNTAS = {
    "glucosa": "¿Qué nivel de glucosa cabe esperar con esta edad, este IMC y esta actividad?",
    "energia": "¿Qué consumo cabe esperar con esta temperatura, esta hora y este día?",
    "dolar": "¿Cuánto costaría el dólar según el día, la inflación y la tasa?",
}

ESCENARIOS = {
    "glucosa": {
        "archivo": "glucosa_data.csv",
        "objetivo": "Nivel_Glucosa",
        "columnas": ["Edad", "IMC", "Actividad_Fisica"],
        "etiqueta": "Glucosa",
        "unidad": "mg/dL",
        "descripcion": "Nivel de glucosa a partir de edad, IMC y actividad física.",
    },
    "energia": {
        "archivo": "energia_data.csv",
        "objetivo": "Consumo_Energia",
        "columnas": ["Temperatura", "Hora", "Dia_Semana"],
        "etiqueta": "Energía",
        "unidad": "unidades de consumo",
        "descripcion": "Consumo a partir de temperatura, hora y día de la semana.",
    },
    "dolar": {
        "archivo": "dolar_data.csv",
        "objetivo": "Precio_Dolar",
        "columnas": ["Dia", "Inflacion", "Tasa_interes"],
        "etiqueta": "Dólar",
        "unidad": "precio",
        "descripcion": "Precio del dólar a partir del día, la inflación y la tasa.",
    },
}

ETIQUETAS = {
    "Edad": "Edad",
    "IMC": "IMC",
    "Actividad_Fisica": "Actividad física",
    "Temperatura": "Temperatura",
    "Hora": "Hora",
    "Dia_Semana": "Día de la semana",
    "Dia": "Día",
    "Inflacion": "Inflación",
    "Tasa_interes": "Tasa de interés",
}


def leer_csv(ruta: Path) -> list[dict[str, float]]:
    with ruta.open(newline="", encoding="utf-8") as archivo:
        return [{clave: float(valor) for clave, valor in fila.items()} for fila in csv.DictReader(archivo)]


def cuantiles(valores: np.ndarray, pasos: int = 100) -> list[float]:
    return [float(np.quantile(valores, p / pasos)) for p in range(pasos + 1)]


def entrenar_uno(clave: str, config: dict) -> dict:
    filas = leer_csv(RAIZ / config["archivo"])
    columnas = config["columnas"]
    x = np.array([[fila[col] for col in columnas] for fila in filas], dtype=float)
    y = np.array([fila[config["objetivo"]] for fila in filas], dtype=float)

    modelo = LinearRegression()
    modelo.fit(x, y)
    predichos = modelo.predict(x)
    r2 = float(r2_score(y, predichos))
    rmse = float(np.sqrt(mean_squared_error(y, predichos)))

    rangos = {}
    for indice, columna in enumerate(columnas):
        serie = x[:, indice]
        rangos[columna] = {
            "etiqueta": ETIQUETAS[columna],
            "min": float(serie.min()),
            "max": float(serie.max()),
            "media": float(serie.mean()),
            "sd": float(serie.std(ddof=1)),
        }

    artefacto = {
        "escenario": clave,
        "algoritmo": "LinearRegression",
        "biblioteca": "scikit-learn",
        "objetivo": config["objetivo"],
        "etiqueta": config["etiqueta"],
        "unidad": config["unidad"],
        "descripcion": config["descripcion"],
        "columnas": columnas,
        "intercepto": float(modelo.intercept_),
        "coeficientes": {columna: float(coef) for columna, coef in zip(columnas, modelo.coef_)},
        "r2": r2,
        "rmse": rmse,
        "n": int(len(filas)),
        "rangos": rangos,
        "objetivo_resumen": {
            "min": float(y.min()),
            "max": float(y.max()),
            "media": float(y.mean()),
            "sd": float(y.std(ddof=1)),
        },
        "cuantiles_objetivo": cuantiles(y),
    }

    ARTEFACTOS.mkdir(parents=True, exist_ok=True)
    ruta_portable = ARTEFACTOS / f"{clave}.joblib"
    ruta_sklearn = ARTEFACTOS / f"{clave}_sklearn.joblib"
    joblib.dump(artefacto, ruta_portable)
    joblib.dump(modelo, ruta_sklearn)
    return artefacto


def publicar_en_frontend(artefactos: list[dict]) -> None:
    """Copia los modelos al sitio estático, en JSON, para predecir sin backend."""
    EMPAQUETADOS.mkdir(parents=True, exist_ok=True)
    orden = ["dolar", "glucosa", "energia"]
    fichas = []
    for artefacto in sorted(artefactos, key=lambda item: orden.index(item["escenario"])):
        clave = artefacto["escenario"]
        ficha = {
            "escenario": clave,
            "etiqueta": artefacto["etiqueta"],
            "unidad": artefacto["unidad"],
            "descripcion": artefacto["descripcion"],
            "pregunta": PREGUNTAS[clave],
            "algoritmo": artefacto["algoritmo"],
            "biblioteca": artefacto["biblioteca"],
            "objetivo": artefacto["objetivo"],
            "n": artefacto["n"],
            "r2": artefacto["r2"],
            "rmse": artefacto["rmse"],
            "intercepto": artefacto["intercepto"],
            "coeficientes": artefacto["coeficientes"],
            "columnas": [
                {"clave": columna, **artefacto["rangos"][columna]} for columna in artefacto["columnas"]
            ],
            "objetivo_resumen": artefacto["objetivo_resumen"],
            "cuantiles_objetivo": artefacto["cuantiles_objetivo"],
        }
        fichas.append(ficha)
        (EMPAQUETADOS / f"{clave}.json").write_text(
            json.dumps(ficha, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        shutil.copy(ARTEFACTOS / f"{clave}.joblib", EMPAQUETADOS / f"{clave}.joblib")
    (EMPAQUETADOS / "indice.json").write_text(
        json.dumps({"modelos": fichas}, ensure_ascii=False),
        encoding="utf-8",
    )


def main() -> None:
    artefactos = []
    for clave, config in ESCENARIOS.items():
        artefacto = entrenar_uno(clave, config)
        artefactos.append(artefacto)
        print(
            f"{artefacto['escenario']}: n={artefacto['n']} R2={artefacto['r2']:.4f} "
            f"RMSE={artefacto['rmse']:.2f}"
        )
    publicar_en_frontend(artefactos)
    print(f"Empaquetados en {EMPAQUETADOS}")


if __name__ == "__main__":
    main()
