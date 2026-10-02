"""POST /api/predecir en Vercel."""

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from backend.controllers.prediccion_controller import PrediccionController  # noqa: E402
from backend.entrada_http import leer_json, opciones, responder  # noqa: E402

controlador = PrediccionController()


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        opciones(self)

    def do_POST(self):
        try:
            cuerpo = leer_json(self)
        except ValueError as error:
            responder(self, {"ok": False, "error": str(error)}, 400)
            return
        datos, codigo = controlador.predecir(cuerpo)
        responder(self, datos, codigo)
