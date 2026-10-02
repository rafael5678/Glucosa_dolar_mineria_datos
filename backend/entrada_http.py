"""Lee y escribe HTTP para las funciones de Vercel."""

from __future__ import annotations

import json


def leer_json(peticion) -> dict:
    longitud = int(peticion.headers.get("Content-Length", 0) or 0)
    if longitud <= 0:
        return {}
    bruto = peticion.rfile.read(longitud)
    if not bruto:
        return {}
    try:
        datos = json.loads(bruto.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError("El JSON no se pudo leer.") from error
    if not isinstance(datos, dict):
        raise ValueError("El JSON tiene que ser un objeto.")
    return datos


def responder(peticion, cuerpo: dict, codigo: int = 200) -> None:
    data = json.dumps(cuerpo, ensure_ascii=False).encode("utf-8")
    peticion.send_response(codigo)
    peticion.send_header("Content-Type", "application/json; charset=utf-8")
    peticion.send_header("Access-Control-Allow-Origin", "*")
    peticion.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    peticion.send_header("Access-Control-Allow-Headers", "Content-Type")
    peticion.send_header("Cache-Control", "no-store")
    peticion.end_headers()
    peticion.wfile.write(data)


def opciones(peticion) -> None:
    peticion.send_response(204)
    peticion.send_header("Access-Control-Allow-Origin", "*")
    peticion.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    peticion.send_header("Access-Control-Allow-Headers", "Content-Type")
    peticion.end_headers()
