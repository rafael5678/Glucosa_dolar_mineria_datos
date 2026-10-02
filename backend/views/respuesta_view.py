"""Envoltura estable del JSON, igual en local y en Vercel."""


class RespuestaView:
    def ok(self, datos: dict) -> dict:
        return {"ok": True, **datos}

    def prediccion(self, resultado: dict) -> dict:
        return {"ok": True, "prediccion": resultado}

    def error(self, mensaje: str) -> dict:
        return {"ok": False, "error": mensaje}
