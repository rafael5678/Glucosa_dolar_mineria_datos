"""Servidor local: la misma API que Vercel, y las páginas del proyecto."""

from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

RAIZ = Path(__file__).resolve().parents[1]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

from backend.controllers.prediccion_controller import PrediccionController  # noqa: E402

controlador = PrediccionController()
app = Flask(__name__, static_folder=None)


@app.after_request
def cabeceras(respuesta):
    respuesta.headers["Access-Control-Allow-Origin"] = "*"
    respuesta.headers["Access-Control-Allow-Headers"] = "Content-Type"
    respuesta.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return respuesta


@app.route("/api/modelos", methods=["GET", "OPTIONS"])
def modelos():
    if request.method == "OPTIONS":
        return "", 204
    cuerpo, codigo = controlador.listar()
    return jsonify(cuerpo), codigo


@app.route("/api/predecir", methods=["POST", "OPTIONS"])
def predecir():
    if request.method == "OPTIONS":
        return "", 204
    cuerpo, codigo = controlador.predecir(request.get_json(silent=True))
    return jsonify(cuerpo), codigo


@app.route("/", defaults={"ruta": "index.html"})
@app.route("/<path:ruta>")
def paginas(ruta: str):
    partes = Path(ruta).parts
    if any(parte.startswith(".") or parte == "__pycache__" for parte in partes):
        return jsonify({"ok": False, "error": "No está ese archivo."}), 404
    destino = (RAIZ / ruta).resolve()
    if not str(destino).startswith(str(RAIZ.resolve())) or not destino.is_file():
        return jsonify({"ok": False, "error": "No está ese archivo."}), 404
    return send_from_directory(RAIZ, ruta)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8765, debug=False)
