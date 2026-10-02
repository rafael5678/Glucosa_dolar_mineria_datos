"""Carga el modelo exportado y calcula la predicción lineal."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib

ARTEFACTOS = Path(__file__).resolve().parent / "artefactos"


class ErrorDeModelo(Exception):
    def __init__(self, mensaje: str, codigo: int = 400) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo = codigo


class RegresorExportado:
    """Regresión lineal ya entrenada. Los coeficientes viven en el .joblib."""

    def __init__(self, artefacto: dict) -> None:
        self.artefacto = artefacto
        self.escenario = artefacto["escenario"]
        self.columnas = list(artefacto["columnas"])
        self.intercepto = float(artefacto["intercepto"])
        self.coeficientes = {clave: float(valor) for clave, valor in artefacto["coeficientes"].items()}

    def predecir(self, valores: dict[str, float]) -> tuple[float, list[dict]]:
        aportes = []
        estimado = self.intercepto
        for columna in self.columnas:
            coeficiente = self.coeficientes[columna]
            aporte = coeficiente * valores[columna]
            estimado += aporte
            aportes.append(
                {
                    "clave": columna,
                    "etiqueta": self.artefacto["rangos"][columna]["etiqueta"],
                    "valor": valores[columna],
                    "coeficiente": coeficiente,
                    "aporte": aporte,
                }
            )
        return estimado, aportes

    def percentil(self, estimado: float) -> int:
        cortes = self.artefacto["cuantiles_objetivo"]
        puesto = 0
        while puesto < len(cortes) - 1 and cortes[puesto] < estimado:
            puesto += 1
        return puesto

    def ficha_publica(self) -> dict:
        return {
            "escenario": self.escenario,
            "etiqueta": self.artefacto["etiqueta"],
            "unidad": self.artefacto["unidad"],
            "descripcion": self.artefacto["descripcion"],
            "algoritmo": self.artefacto["algoritmo"],
            "biblioteca": self.artefacto["biblioteca"],
            "objetivo": self.artefacto["objetivo"],
            "n": self.artefacto["n"],
            "r2": self.artefacto["r2"],
            "rmse": self.artefacto["rmse"],
            "intercepto": self.intercepto,
            "coeficientes": self.coeficientes,
            "columnas": [
                {"clave": columna, **self.artefacto["rangos"][columna]} for columna in self.columnas
            ],
            "objetivo_resumen": self.artefacto["objetivo_resumen"],
        }


@lru_cache(maxsize=8)
def cargar(escenario: str) -> RegresorExportado:
    ruta = ARTEFACTOS / f"{escenario}.joblib"
    if not ruta.is_file():
        raise ErrorDeModelo(f"No existe un modelo entrenado para '{escenario}'.", 404)
    artefacto = joblib.load(ruta)
    if not isinstance(artefacto, dict) or "coeficientes" not in artefacto:
        raise ErrorDeModelo(f"El archivo del modelo '{escenario}' no tiene la forma esperada.", 500)
    return RegresorExportado(artefacto)


def escenarios_disponibles() -> list[str]:
    return sorted(ruta.stem for ruta in ARTEFACTOS.glob("*.joblib") if not ruta.stem.endswith("_sklearn"))
