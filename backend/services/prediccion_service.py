"""Valida la entrada, ejecuta el modelo y arma la lectura del resultado."""

from __future__ import annotations

from backend.models.regresor import ErrorDeModelo, cargar, escenarios_disponibles


class PrediccionService:
    def listar(self) -> dict:
        modelos = []
        for escenario in escenarios_disponibles():
            modelos.append(cargar(escenario).ficha_publica())
        return {"modelos": modelos}

    def predecir(self, escenario: str, valores_crudos) -> dict:
        if not isinstance(escenario, str) or not escenario.strip():
            raise ErrorDeModelo("Falta el escenario. Usa glucosa, energia o dolar.")
        clave = escenario.strip().lower()
        modelo = cargar(clave)
        if not isinstance(valores_crudos, dict):
            raise ErrorDeModelo("Los valores tienen que llegar como un objeto, uno por variable.")

        valores, advertencias, errores = self._normalizar(modelo, valores_crudos)
        if errores:
            raise ErrorDeModelo(" ".join(errores))

        estimado, aportes = modelo.predecir(valores)
        puesto = modelo.percentil(estimado)
        rmse = float(modelo.artefacto["rmse"])
        dominante = max(aportes, key=lambda aporte: abs(aporte["aporte"]))
        suma = modelo.intercepto + sum(aporte["aporte"] for aporte in aportes)

        return {
            "escenario": clave,
            "etiqueta": modelo.artefacto["etiqueta"],
            "unidad": modelo.artefacto["unidad"],
            "estimado": estimado,
            "intervalo": {"bajo": estimado - rmse, "alto": estimado + rmse, "rmse": rmse},
            "percentil": puesto,
            "lectura_percentil": self._lectura_percentil(puesto, clave),
            "intercepto": modelo.intercepto,
            "aportes": aportes,
            "suma_aportes": suma,
            "cuadra": abs(suma - estimado) < 1e-6,
            "dominante": {
                "etiqueta": dominante["etiqueta"],
                "aporte": dominante["aporte"],
            },
            "r2": modelo.artefacto["r2"],
            "n": modelo.artefacto["n"],
            "advertencias": advertencias,
            "lectura": self._lectura(modelo, estimado, puesto, dominante, advertencias),
        }

    def _normalizar(self, modelo, valores_crudos: dict) -> tuple[dict, list[str], list[str]]:
        valores = {}
        advertencias = []
        errores = []
        for columna in modelo.columnas:
            if columna not in valores_crudos or valores_crudos[columna] in ("", None):
                etiqueta = modelo.artefacto["rangos"][columna]["etiqueta"]
                errores.append(f"Falta {etiqueta}.")
                continue
            try:
                numero = float(str(valores_crudos[columna]).replace(",", ".").strip())
            except (TypeError, ValueError):
                etiqueta = modelo.artefacto["rangos"][columna]["etiqueta"]
                errores.append(f"{etiqueta} tiene que ser un número.")
                continue
            rango = modelo.artefacto["rangos"][columna]
            if numero < rango["min"] or numero > rango["max"]:
                advertencias.append(
                    f"{rango['etiqueta']} ({self._formato(numero)}) está fuera del entrenamiento "
                    f"({self._formato(rango['min'])} a {self._formato(rango['max'])}). "
                    "La cifra es una extrapolación."
                )
            valores[columna] = numero
        return valores, advertencias, errores

    def _lectura(self, modelo, estimado, puesto, dominante, advertencias) -> str:
        unidad = modelo.artefacto["unidad"]
        sentido = "suma" if dominante["aporte"] >= 0 else "resta"
        base = (
            f"El modelo entrenado estima {self._formato(estimado)} {unidad}. "
            f"Quedaría por encima del {puesto} % de los registros vistos. "
            f"En este caso, {dominante['etiqueta']} es el término que más empuja: "
            f"{sentido} {self._formato(abs(dominante['aporte']))}."
        )
        if advertencias:
            base += " Hay valores fuera del rango con el que se entrenó."
        return base

    def _lectura_percentil(self, puesto: int, escenario: str) -> str:
        quien = {
            "glucosa": "de las personas del archivo",
            "energia": "de las lecturas de consumo",
            "dolar": "de los días del dólar",
        }.get(escenario, "de los registros")
        if puesto <= 8:
            return f"Entre los valores más bajos: solo el {puesto} % {quien} está por debajo."
        if puesto >= 92:
            return f"Entre los valores más altos: por encima del {puesto} % {quien}."
        return f"Por encima del {puesto} % {quien}."

    @staticmethod
    def _formato(numero: float) -> str:
        absoluto = abs(numero)
        decimales = 0 if absoluto >= 100 else 2 if absoluto < 10 else 1
        return f"{numero:,.{decimales}f}".replace(",", "X").replace(".", ",").replace("X", ".")
