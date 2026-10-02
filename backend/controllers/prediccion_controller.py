"""Controlador de los tres escenarios de predicción."""

from __future__ import annotations

from backend.models.regresor import ErrorDeModelo
from backend.services.prediccion_service import PrediccionService
from backend.views.respuesta_view import RespuestaView


class PrediccionController:
    def __init__(self, servicio: PrediccionService | None = None) -> None:
        self.servicio = servicio or PrediccionService()
        self.vista = RespuestaView()

    def listar(self) -> tuple[dict, int]:
        try:
            return self.vista.ok(self.servicio.listar()), 200
        except ErrorDeModelo as error:
            return self.vista.error(error.mensaje), error.codigo
        except Exception:
            return self.vista.error("No se pudieron leer los modelos entrenados."), 500

    def predecir(self, cuerpo) -> tuple[dict, int]:
        if not isinstance(cuerpo, dict):
            return self.vista.error("El cuerpo tiene que ser JSON."), 400
        try:
            resultado = self.servicio.predecir(cuerpo.get("escenario"), cuerpo.get("valores"))
            return self.vista.prediccion(resultado), 200
        except ErrorDeModelo as error:
            return self.vista.error(error.mensaje), error.codigo
        except Exception:
            return self.vista.error("La predicción no se pudo calcular."), 500
