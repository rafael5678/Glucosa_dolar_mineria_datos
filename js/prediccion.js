(() => {
  const banco = document.getElementById("banco");
  const pestanias = document.getElementById("pestanias");
  const origenEl = document.getElementById("banco-origen");
  const estado = document.getElementById("sala-estado");
  const cuerpo = document.getElementById("banco-cuerpo");
  const bitacora = document.getElementById("bitacora");
  const lista = document.getElementById("bitacora-lista");
  const limpiar = document.getElementById("limpiar-bitacora");
  if (!banco || !pestanias || !cuerpo || !estado) return;

  const CLAVE = "veta-bitacora";
  const ORDEN = ["dolar", "glucosa", "energia"];
  const AYUDAS = {
    Edad: "Años. En el archivo van de 20 a 79.",
    IMC: "Índice de masa corporal, con decimales.",
    Actividad_Fisica: "Código del archivo, de 0 a 9. No son horas.",
    Temperatura: "Grados. El archivo se mueve cerca de 25.",
    Hora: "Hora del día, de 1 a 24.",
    Dia_Semana: "1 es el primer día de la semana del archivo y 7 el último.",
    Dia: "Número de día, de 1 a 500 en este archivo.",
    Inflacion: "Proporción, no porcentaje. 0,02 equivale a 2 %.",
    Tasa_interes: "Tasa del archivo, cerca de 5.",
  };
  const DECIMALES = {
    Edad: 0,
    IMC: 1,
    Actividad_Fisica: 0,
    Temperatura: 1,
    Hora: 0,
    Dia_Semana: 0,
    Dia: 0,
    Inflacion: 3,
    Tasa_interes: 2,
  };

  const memoria = leerMemoria();
  const borradores = {};
  let catalogo = [];
  let porClave = {};
  let activo = "dolar";
  let hayServidor = false;

  limpiar?.addEventListener("click", () => {
    memoria.length = 0;
    sessionStorage.removeItem(CLAVE);
    pintarBitacora();
  });

  iniciar();

  async function iniciar() {
    estado.textContent = "Leyendo los modelos empaquetados…";
    const empaquetados = await leerEmpaquetados();
    const servidores = await leerServidor();
    if (servidores) {
      hayServidor = true;
      catalogo = servidores.map((modelo) => completar(modelo, empaquetados));
    } else if (empaquetados.length) {
      catalogo = empaquetados;
    }
    if (!catalogo.length) {
      estado.textContent = "No se encontraron los modelos en modelos/indice.json ni en el servidor.";
      if (origenEl) origenEl.textContent = "Sin modelo";
      return;
    }
    catalogo.sort((a, b) => ORDEN.indexOf(a.escenario) - ORDEN.indexOf(b.escenario));
    porClave = Object.fromEntries(catalogo.map((modelo) => [modelo.escenario, modelo]));
    if (!porClave[activo]) activo = catalogo[0].escenario;
    if (origenEl) origenEl.textContent = hayServidor ? "Servidor" : "Empaquetado";
    estado.textContent = hayServidor
      ? "El servidor responde. Si se cae, la misma cuenta sigue con los modelos empaquetados."
      : "Sin backend: la predicción sale de los modelos empaquetados en esta página.";
    pintarPestanias();
    pintarEscenario();
    pintarBitacora();
  }

  async function leerEmpaquetados() {
    try {
      const respuesta = await fetch("/modelos/indice.json", { headers: { Accept: "application/json" } });
      if (!respuesta.ok) return [];
      const datos = await respuesta.json();
      return Array.isArray(datos.modelos) ? datos.modelos : [];
    } catch {
      return [];
    }
  }

  async function leerServidor() {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 1800);
    try {
      const respuesta = await fetch("/api/modelos", {
        headers: { Accept: "application/json" },
        signal: control.signal,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok || !Array.isArray(datos.modelos) || !datos.modelos.length) return null;
      return datos.modelos;
    } catch {
      return null;
    } finally {
      clearTimeout(reloj);
    }
  }

  function completar(modelo, empaquetados) {
    const local = empaquetados.find((item) => item.escenario === modelo.escenario);
    if (!local) return modelo;
    return {
      ...local,
      ...modelo,
      cuantiles_objetivo: modelo.cuantiles_objetivo || local.cuantiles_objetivo,
      pregunta: modelo.pregunta || local.pregunta,
      columnas: modelo.columnas?.length ? modelo.columnas : local.columnas,
    };
  }

  function pintarPestanias() {
    pestanias.replaceChildren();
    catalogo.forEach((modelo) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "pestania";
      boton.setAttribute("role", "tab");
      boton.setAttribute("aria-selected", modelo.escenario === activo ? "true" : "false");
      boton.textContent = modelo.etiqueta;
      if (modelo.escenario === activo) boton.classList.add("activa");
      boton.addEventListener("click", () => {
        guardarBorrador();
        activo = modelo.escenario;
        pintarPestanias();
        pintarEscenario();
      });
      pestanias.append(boton);
    });
  }

  function pintarEscenario() {
    const modelo = porClave[activo];
    banco.dataset.tono = modelo.escenario;
    cuerpo.replaceChildren(crearEjercicio(modelo), crearEstimado(modelo));
    const guardado = borradores[modelo.escenario];
    if (guardado) {
      const forma = cuerpo.querySelector("form");
      modelo.columnas.forEach((columna) => {
        const campo = forma.elements.namedItem(columna.clave);
        if (campo && guardado[columna.clave] != null) campo.value = guardado[columna.clave];
      });
    }
  }

  function crearEjercicio(modelo) {
    const pieza = document.createElement("article");
    pieza.className = "ejercicio";

    const ceja = document.createElement("p");
    ceja.className = "ejercicio-ceja";
    ceja.textContent = "Escribe el caso";
    const titulo = document.createElement("h3");
    titulo.textContent = modelo.etiqueta;
    const pregunta = document.createElement("p");
    pregunta.className = "pregunta";
    pregunta.textContent = modelo.pregunta || modelo.descripcion;

    const fichas = document.createElement("div");
    fichas.className = "fichas-mini";
    [
      ["Observaciones", formato(modelo.n, 0)],
      ["Entradas", String(modelo.columnas.length)],
      ["Error típico", formato(modelo.rmse, 1)],
    ].forEach(([nombre, valor]) => {
      const ficha = document.createElement("div");
      const fuerte = document.createElement("strong");
      fuerte.textContent = valor;
      const etiqueta = document.createElement("span");
      etiqueta.textContent = nombre;
      ficha.append(fuerte, etiqueta);
      fichas.append(ficha);
    });

    const forma = document.createElement("form");
    forma.noValidate = true;
    modelo.columnas.forEach((columna) => forma.append(crearCampo(modelo, columna)));

    const acciones = document.createElement("div");
    acciones.className = "puesto-acciones";
    const calcular = document.createElement("button");
    calcular.type = "submit";
    calcular.className = "estimar";
    calcular.textContent = "Calcular";
    const medias = document.createElement("button");
    medias.type = "button";
    medias.className = "extraer";
    medias.textContent = "Usar medias";
    acciones.append(calcular, medias);
    forma.append(acciones);

    medias.addEventListener("click", () => {
      modelo.columnas.forEach((columna) => {
        const campo = forma.elements.namedItem(columna.clave);
        if (campo) campo.value = formatoEntrada(columna.media, DECIMALES[columna.clave] ?? 2);
      });
      forma.querySelector("input")?.focus();
    });
    forma.addEventListener("submit", (evento) => enviar(evento, modelo, forma, calcular));

    pieza.append(ceja, titulo, pregunta, fichas, forma);
    if (modelo.escenario === "glucosa") {
      const nota = document.createElement("p");
      nota.className = "nota-clinica";
      nota.textContent = "No es un diagnóstico. El error típico sigue siendo de unos 15 mg/dL.";
      pieza.append(nota);
    }
    return pieza;
  }

  function crearCampo(modelo, columna) {
    const envoltura = document.createElement("label");
    envoltura.className = "campo";
    const tope = document.createElement("span");
    tope.className = "campo-tope";
    const nombre = document.createElement("strong");
    nombre.textContent = columna.etiqueta;
    const rango = document.createElement("em");
    rango.textContent = `${formato(columna.min, DECIMALES[columna.clave] ?? 1)} – ${formato(columna.max, DECIMALES[columna.clave] ?? 1)}`;
    tope.append(nombre, rango);

    const entrada = document.createElement("input");
    entrada.name = columna.clave;
    entrada.type = "text";
    entrada.inputMode = "decimal";
    entrada.autocomplete = "off";
    entrada.spellcheck = false;
    entrada.placeholder = formatoEntrada(columna.media, DECIMALES[columna.clave] ?? 2);
    entrada.setAttribute("aria-describedby", `${modelo.escenario}-${columna.clave}-ayuda`);

    const ayuda = document.createElement("small");
    ayuda.id = `${modelo.escenario}-${columna.clave}-ayuda`;
    ayuda.textContent = AYUDAS[columna.clave] || "";

    const fallo = document.createElement("small");
    fallo.className = "campo-fallo";
    fallo.hidden = true;

    envoltura.append(tope, entrada, ayuda, fallo);
    return envoltura;
  }

  function crearEstimado(modelo) {
    const pieza = document.createElement("article");
    pieza.className = "estimado";
    pieza.id = "estimado";

    const ceja = document.createElement("p");
    ceja.className = "ejercicio-ceja";
    ceja.textContent = "Predicción";
    const vacio = document.createElement("p");
    vacio.className = "estimado-vacio";
    vacio.textContent = "Completa los datos y pulsa Calcular. Verás el número, el margen y cuánto empuja cada variable.";

    const metricas = document.createElement("div");
    metricas.className = "metricas-banco";
    [
      ["R²", formato(modelo.r2, 3)],
      ["RMSE", formato(modelo.rmse, 1)],
      ["n", formato(modelo.n, 0)],
    ].forEach(([nombre, valor]) => {
      const caja = document.createElement("div");
      const fuerte = document.createElement("strong");
      fuerte.textContent = valor;
      const etiqueta = document.createElement("span");
      etiqueta.textContent = nombre;
      caja.append(fuerte, etiqueta);
      metricas.append(caja);
    });

    const donas = document.createElement("div");
    donas.className = "donas";
    donas.append(crearDona("Peso en el entrenamiento", pesosEntrenamiento(modelo), "Cuánto empuja cada variable cuando se mueve una desviación, con las demás quietas."));

    pieza.append(ceja, vacio, metricas, donas);
    return pieza;
  }

  async function enviar(evento, modelo, forma, boton) {
    evento.preventDefault();
    const leido = leerFormulario(modelo, forma, true);
    if (leido.errores.length) {
      estado.textContent = leido.errores[0];
      return;
    }
    guardarBorrador();
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Calculando…";
    try {
      const prediccion = await resolver(modelo, leido);
      const suma = prediccion.intercepto + prediccion.aportes.reduce((total, aporte) => total + aporte.aporte, 0);
      if (Math.abs(suma - Number(prediccion.estimado)) > 0.05) {
        throw new Error("La suma de los términos no cierra con la predicción.");
      }
      pintarResultado(modelo, prediccion);
      recordar(modelo, prediccion);
      const vía = prediccion.via === "servidor" ? "servidor" : "modelo empaquetado";
      estado.textContent = `${prediccion.lectura} Fuente: ${vía}.`;
    } catch (error) {
      estado.textContent = error.message || "No se pudo calcular.";
    } finally {
      boton.disabled = false;
      boton.textContent = texto;
    }
  }

  async function resolver(modelo, leido) {
    if (hayServidor) {
      try {
        const control = new AbortController();
        const reloj = setTimeout(() => control.abort(), 2500);
        const respuesta = await fetch("/api/predecir", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ escenario: modelo.escenario, valores: leido.valores }),
          signal: control.signal,
        });
        clearTimeout(reloj);
        const datos = await respuesta.json();
        if (respuesta.ok && datos.ok && datos.prediccion) {
          return { ...datos.prediccion, via: "servidor", advertencias: datos.prediccion.advertencias || leido.avisos };
        }
      } catch {
        hayServidor = false;
        if (origenEl) origenEl.textContent = "Empaquetado";
      }
    }
    return predecirLocal(modelo, leido);
  }

  function predecirLocal(modelo, leido) {
    let estimado = Number(modelo.intercepto);
    const aportes = modelo.columnas.map((columna) => {
      const coeficiente = Number(modelo.coeficientes[columna.clave]);
      const aporte = coeficiente * leido.valores[columna.clave];
      estimado += aporte;
      return {
        clave: columna.clave,
        etiqueta: columna.etiqueta,
        valor: leido.valores[columna.clave],
        coeficiente,
        aporte,
      };
    });
    const puesto = percentil(modelo.cuantiles_objetivo || [], estimado);
    const dominante = aportes.reduce((mejor, aporte) =>
      Math.abs(aporte.aporte) > Math.abs(mejor.aporte) ? aporte : mejor
    );
    const rmse = Number(modelo.rmse);
    return {
      escenario: modelo.escenario,
      etiqueta: modelo.etiqueta,
      unidad: modelo.unidad,
      estimado,
      intervalo: { bajo: estimado - rmse, alto: estimado + rmse, rmse },
      percentil: puesto,
      lectura_percentil: frasePercentil(puesto, modelo.escenario),
      intercepto: Number(modelo.intercepto),
      aportes,
      cuadra: true,
      dominante: { etiqueta: dominante.etiqueta, aporte: dominante.aporte },
      r2: modelo.r2,
      n: modelo.n,
      advertencias: leido.avisos,
      lectura: fraseLectura(modelo, estimado, puesto, dominante, leido.avisos),
      via: "empaquetado",
    };
  }

  function pintarResultado(modelo, prediccion) {
    const pieza = document.getElementById("estimado");
    if (!pieza) return;
    pieza.replaceChildren();

    const ceja = document.createElement("p");
    ceja.className = "ejercicio-ceja";
    ceja.textContent = prediccion.via === "servidor" ? "Precio estimado · servidor" : "Precio estimado · empaquetado";
    if (modelo.escenario !== "dolar") {
      ceja.textContent = prediccion.via === "servidor" ? "Estimación · servidor" : "Estimación · empaquetado";
    }

    const cifra = document.createElement("p");
    cifra.className = "salida-cifra";
    const numero = document.createElement("strong");
    numero.textContent = formato(prediccion.estimado, 1);
    const unidad = document.createElement("span");
    unidad.textContent = modelo.unidad;
    cifra.append(numero, unidad);

    const margen = document.createElement("p");
    margen.className = "salida-margen";
    margen.textContent = `Margen de error ±${formato(prediccion.intervalo.rmse, 1)} · ${formato(prediccion.intervalo.bajo, 1)} a ${formato(prediccion.intervalo.alto, 1)}`;

    const pista = document.createElement("div");
    pista.className = "margen-pista";
    pista.title = "Dónde cae la estimación dentro del rango observado";
    const banda = document.createElement("b");
    const marca = document.createElement("i");
    const resumen = modelo.objetivo_resumen;
    if (resumen && resumen.max > resumen.min) {
      const bajo = acotar((prediccion.intervalo.bajo - resumen.min) / (resumen.max - resumen.min));
      const alto = acotar((prediccion.intervalo.alto - resumen.min) / (resumen.max - resumen.min));
      const punto = acotar((prediccion.estimado - resumen.min) / (resumen.max - resumen.min));
      banda.style.left = `${bajo * 100}%`;
      banda.style.width = `${Math.max(2, (alto - bajo) * 100)}%`;
      marca.style.left = `${punto * 100}%`;
    }
    pista.append(banda, marca);

    const percentil = document.createElement("p");
    percentil.className = "salida-percentil";
    percentil.textContent = prediccion.lectura_percentil || "";

    const metricas = document.createElement("div");
    metricas.className = "metricas-banco";
    [
      ["R²", formato(prediccion.r2, 3)],
      ["RMSE", formato(prediccion.intervalo.rmse, 1)],
      ["Percentil", `${prediccion.percentil}`],
    ].forEach(([nombre, valor]) => {
      const caja = document.createElement("div");
      const fuerte = document.createElement("strong");
      fuerte.textContent = valor;
      const etiqueta = document.createElement("span");
      etiqueta.textContent = nombre;
      caja.append(fuerte, etiqueta);
      metricas.append(caja);
    });

    const titulo = document.createElement("h4");
    titulo.textContent = "Interpretación";
    const impactos = document.createElement("ul");
    impactos.className = "impactos";
    const mayor = Math.max(...prediccion.aportes.map((aporte) => Math.abs(aporte.aporte)), 1);
    prediccion.aportes.forEach((aporte) => {
      const item = document.createElement("li");
      const cabeza = document.createElement("div");
      const nombre = document.createElement("strong");
      nombre.textContent = aporte.etiqueta;
      cabeza.append(nombre);
      if (aporte.etiqueta === prediccion.dominante.etiqueta) {
        const sello = document.createElement("em");
        sello.textContent = "Mayor impacto";
        cabeza.append(sello);
      }
      const frase = document.createElement("p");
      frase.textContent = fraseCoeficiente(aporte);
      const fila = document.createElement("div");
      fila.className = "impacto-fila";
      const barra = document.createElement("b");
      barra.style.width = `${(Math.abs(aporte.aporte) / mayor) * 100}%`;
      barra.dataset.signo = aporte.aporte < 0 ? "resta" : "suma";
      const monto = document.createElement("span");
      monto.textContent = `${aporte.aporte >= 0 ? "+" : "−"}${formato(Math.abs(aporte.aporte), 1)}`;
      fila.append(barra, monto);
      item.append(cabeza, frase, fila);
      impactos.append(item);
    });

    const donas = document.createElement("div");
    donas.className = "donas";
    donas.append(
      crearDona(
        "Impacto en este caso",
        prediccion.aportes.map((aporte) => ({ etiqueta: aporte.etiqueta, valor: Math.abs(aporte.aporte) })),
        "Parte de la suma de los aportes, en valor absoluto, que corresponde a cada variable."
      ),
      crearDona(
        "Peso en el entrenamiento",
        pesosEntrenamiento(modelo),
        "Cuánto empuja cada variable cuando se mueve una desviación, con las demás quietas."
      )
    );

    const cierre = document.createElement("p");
    cierre.className = "salida-cierre";
    cierre.textContent = "La suma del intercepto y los aportes cierra con esta predicción.";

    pieza.append(ceja, cifra, margen, pista, percentil, metricas, titulo, impactos, donas, cierre);
    if (prediccion.advertencias?.length) {
      const aviso = document.createElement("p");
      aviso.className = "salida-aviso";
      aviso.textContent = Array.isArray(prediccion.advertencias)
        ? prediccion.advertencias.map((item) => (typeof item === "string" ? item : "")).join(" ")
        : "";
      if (aviso.textContent) pieza.append(aviso);
    }
  }

  function crearDona(titulo, partes, nota) {
    const caja = document.createElement("figure");
    caja.className = "dona";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.setAttribute("aria-hidden", "true");
    const total = partes.reduce((suma, parte) => suma + parte.valor, 0);
    const opacidades = ["1", "0.62", "0.34"];
    if (total <= 0) {
      const circulo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circulo.setAttribute("cx", "60");
      circulo.setAttribute("cy", "60");
      circulo.setAttribute("r", "38");
      circulo.setAttribute("fill", "none");
      circulo.setAttribute("stroke", "rgba(244,239,230,0.16)");
      circulo.setAttribute("stroke-width", "16");
      svg.append(circulo);
    } else {
      let angulo = -Math.PI / 2;
      partes.forEach((parte, indice) => {
        const barrido = (parte.valor / total) * Math.PI * 2;
        const trazo = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const fin = angulo + (barrido >= Math.PI * 2 - 0.001 ? Math.PI * 2 - 0.001 : Math.max(barrido, 0.001));
        trazo.setAttribute("d", sector(60, 60, 46, 30, angulo, fin));
        trazo.setAttribute("fill", "var(--accent)");
        trazo.setAttribute("opacity", opacidades[indice % opacidades.length]);
        svg.append(trazo);
        angulo += barrido;
      });
    }
    const texto = document.createElement("figcaption");
    const fuerte = document.createElement("strong");
    fuerte.textContent = titulo;
    const leyenda = document.createElement("ul");
    partes.forEach((parte, indice) => {
      const item = document.createElement("li");
      const punto = document.createElement("i");
      punto.style.background = "var(--accent)";
      punto.style.opacity = opacidades[indice % opacidades.length];
      const nombre = document.createElement("span");
      const porcion = total > 0 ? (parte.valor / total) * 100 : 0;
      const texto = porcion >= 10 ? `${Math.round(porcion)} %` : `${porcion.toFixed(1).replace(".", ",")} %`;
      nombre.textContent = `${parte.etiqueta} ${texto}`;
      item.append(punto, nombre);
      leyenda.append(item);
    });
    const detalle = document.createElement("small");
    detalle.textContent = nota;
    texto.append(fuerte, leyenda, detalle);
    caja.append(svg, texto);
    return caja;
  }

  function pesosEntrenamiento(modelo) {
    return modelo.columnas.map((columna) => ({
      etiqueta: columna.etiqueta,
      valor: Math.abs(Number(modelo.coeficientes[columna.clave]) * Number(columna.sd || 0)),
    }));
  }

  function leerFormulario(modelo, forma, marcar) {
    const valores = {};
    const errores = [];
    const avisos = [];
    modelo.columnas.forEach((columna) => {
      const entrada = forma.elements.namedItem(columna.clave);
      const fallo = entrada?.parentElement?.querySelector(".campo-fallo");
      const texto = (entrada?.value || "").trim();
      const numero = parsear(texto);
      if (marcar && fallo) {
        fallo.hidden = true;
        entrada.removeAttribute("aria-invalid");
        entrada.classList.remove("fuera");
      }
      if (texto === "") {
        errores.push(`Falta ${columna.etiqueta}.`);
        if (marcar && fallo) marcarFallo(entrada, fallo, "Escribe un número.", errores.length === 1);
        return;
      }
      if (numero === null) {
        errores.push(`${columna.etiqueta} tiene que ser un número.`);
        if (marcar && fallo) marcarFallo(entrada, fallo, "Eso no es un número. Usa coma o punto.", errores.length === 1);
        return;
      }
      if (numero < columna.min || numero > columna.max) {
        avisos.push(
          `${columna.etiqueta} (${formato(numero, 2)}) está fuera del entrenamiento (${formato(columna.min, 2)} a ${formato(columna.max, 2)}). La cifra es una extrapolación.`
        );
        if (marcar) entrada.classList.add("fuera");
      }
      valores[columna.clave] = numero;
    });
    return { valores, errores, avisos };
  }

  function marcarFallo(entrada, fallo, mensaje, enfocar) {
    fallo.hidden = false;
    fallo.textContent = mensaje;
    entrada.setAttribute("aria-invalid", "true");
    if (enfocar) entrada.focus();
  }

  function guardarBorrador() {
    const forma = cuerpo.querySelector("form");
    const modelo = porClave[activo];
    if (!forma || !modelo) return;
    borradores[activo] = {};
    modelo.columnas.forEach((columna) => {
      borradores[activo][columna.clave] = forma.elements.namedItem(columna.clave)?.value || "";
    });
  }

  function recordar(modelo, prediccion) {
    memoria.unshift({
      escenario: modelo.escenario,
      etiqueta: modelo.etiqueta,
      estimado: prediccion.estimado,
      unidad: modelo.unidad,
      cuando: new Date().toISOString(),
    });
    memoria.splice(8);
    sessionStorage.setItem(CLAVE, JSON.stringify(memoria));
    pintarBitacora();
  }

  function pintarBitacora() {
    if (!bitacora || !lista) return;
    lista.replaceChildren();
    if (!memoria.length) {
      bitacora.hidden = true;
      return;
    }
    bitacora.hidden = false;
    memoria.forEach((item) => {
      const fila = document.createElement("li");
      const hora = new Date(item.cuando);
      const reloj = Number.isNaN(hora.getTime())
        ? ""
        : hora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      fila.textContent = `${reloj} · ${item.etiqueta}: ${formato(item.estimado, 1)} ${item.unidad}`;
      lista.append(fila);
    });
  }

  function leerMemoria() {
    try {
      const guardada = JSON.parse(sessionStorage.getItem(CLAVE) || "[]");
      return Array.isArray(guardada) ? guardada.slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  function fraseCoeficiente(aporte) {
    if (aporte.clave === "Inflacion") {
      const paso = aporte.coeficiente * 0.01;
      return `Con el resto quieto, 0,01 más de inflación ${paso >= 0 ? "suma" : "resta"} ${formato(Math.abs(paso), 2)}. En este caso aporta ${aporte.aporte >= 0 ? "+" : "−"}${formato(Math.abs(aporte.aporte), 1)}.`;
    }
    const sentido = aporte.coeficiente >= 0 ? "suma" : "resta";
    return `Con el resto quieto, una unidad más ${sentido} ${formato(Math.abs(aporte.coeficiente), 2)}. En este caso aporta ${aporte.aporte >= 0 ? "+" : "−"}${formato(Math.abs(aporte.aporte), 1)}.`;
  }

  function fraseLectura(modelo, estimado, puesto, dominante, avisos) {
    const sentido = dominante.aporte >= 0 ? "suma" : "resta";
    let texto = `El modelo estima ${formato(estimado, 1)} ${modelo.unidad}. Quedaría por encima del ${puesto} % de los registros vistos. ${dominante.etiqueta} es el término que más empuja: ${sentido} ${formato(Math.abs(dominante.aporte), 1)}.`;
    if (avisos.length) texto += " Hay valores fuera del rango con el que se entrenó.";
    return texto;
  }

  function frasePercentil(puesto, escenario) {
    const quien = {
      glucosa: "de las personas del archivo",
      energia: "de las lecturas de consumo",
      dolar: "de los días del dólar",
    }[escenario] || "de los registros";
    if (puesto <= 8) return `Entre los valores más bajos: solo el ${puesto} % ${quien} está por debajo.`;
    if (puesto >= 92) return `Entre los valores más altos: por encima del ${puesto} % ${quien}.`;
    return `Por encima del ${puesto} % ${quien}.`;
  }

  function percentil(cortes, estimado) {
    if (!cortes.length) return 0;
    let puesto = 0;
    while (puesto < cortes.length - 1 && cortes[puesto] < estimado) puesto += 1;
    return puesto;
  }

  function sector(cx, cy, externo, interno, a0, a1) {
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + externo * Math.cos(a0);
    const y0 = cy + externo * Math.sin(a0);
    const x1 = cx + externo * Math.cos(a1);
    const y1 = cy + externo * Math.sin(a1);
    const x2 = cx + interno * Math.cos(a1);
    const y2 = cy + interno * Math.sin(a1);
    const x3 = cx + interno * Math.cos(a0);
    const y3 = cy + interno * Math.sin(a0);
    return `M ${x0} ${y0} A ${externo} ${externo} 0 ${grande} 1 ${x1} ${y1} L ${x2} ${y2} A ${interno} ${interno} 0 ${grande} 0 ${x3} ${y3} Z`;
  }

  function parsear(texto) {
    const limpio = texto.replace(/\s/g, "").replace(",", ".");
    if (!/^[+-]?\d+(\.\d+)?$/.test(limpio)) return null;
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : null;
  }

  function formato(numero, decimales) {
    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(Number(numero));
  }

  function formatoEntrada(numero, decimales) {
    return Number(numero).toFixed(decimales).replace(".", ",");
  }

  function acotar(valor) {
    return Math.max(0, Math.min(1, valor));
  }
})();
