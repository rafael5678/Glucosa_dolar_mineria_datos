const D = window.VETA;

const TONO = {
  glucosa: "#ff6b4a",
  energia: "#d6f25c",
  dolar: "#e8b86d",
};

const papel = "rgba(244,239,230,0.08)";
const tintaSuave = "#b3aa9e";
const tintaEje = "#7d756b";

function num(valor, decimales = 1) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

function numCorto(valor) {
  const abs = Math.abs(valor);
  const decimales = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return num(valor, decimales);
}

function firma(r) {
  const texto = num(Math.abs(r), 3);
  return r < 0 ? "−" + texto : "+" + texto;
}

function svg(nombre, attrs) {
  const nodo = document.createElementNS("http://www.w3.org/2000/svg", nombre);
  for (const [clave, valor] of Object.entries(attrs)) nodo.setAttribute(clave, valor);
  return nodo;
}

function escala(valor, origen, destino, a, b) {
  if (destino === origen) return (a + b) / 2;
  return a + ((valor - origen) / (destino - origen)) * (b - a);
}

function ticks(minimo, maximo, cantidad) {
  const marcas = [];
  for (let i = 0; i < cantidad; i += 1) {
    marcas.push(minimo + ((maximo - minimo) * i) / (cantidad - 1));
  }
  return marcas;
}

function prepararLienzo(host, w, h) {
  host.replaceChildren();
  const nodo = svg("svg", {
    viewBox: `0 0 ${w} ${h}`,
    role: "img",
  });
  host.appendChild(nodo);
  return nodo;
}

function ejeY(lienzo, marcas, yPara, x, xFin, formato) {
  marcas.forEach((marca) => {
    const y = yPara(marca);
    lienzo.append(
      svg("line", { x1: x, y1: y, x2: xFin, y2: y, stroke: papel, "stroke-width": 1 }),
      texto(x - 10, y + 4, formato(marca), "end")
    );
  });
}

function texto(x, y, contenido, ancla = "start", color = tintaEje) {
  const nodo = svg("text", {
    x,
    y,
    fill: color,
    "font-size": 11,
    "font-family": "Outfit, sans-serif",
    "text-anchor": ancla,
  });
  nodo.textContent = contenido;
  return nodo;
}

function pintarDispersion(id, dispersion, color, formatoX, formatoY) {
  const host = document.getElementById(id);
  const w = 640;
  const h = 360;
  const pad = { l: 52, r: 18, t: 16, b: 36 };
  const puntos = dispersion.puntos;
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const xMin = Math.min(...xs, dispersion.linea.x1);
  const xMax = Math.max(...xs, dispersion.linea.x2);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const x0 = xMin - (xMax - xMin) * 0.04;
  const x1 = xMax + (xMax - xMin) * 0.04;
  const y0 = yMin - (yMax - yMin) * 0.06;
  const y1 = yMax + (yMax - yMin) * 0.08;
  const X = (v) => escala(v, x0, x1, pad.l, w - pad.r);
  const Y = (v) => escala(v, y0, y1, h - pad.b, pad.t);
  const lienzo = prepararLienzo(host, w, h);
  ejeY(lienzo, ticks(y0, y1, 4), Y, pad.l, w - pad.r, formatoY);
  ticks(x0, x1, 5).forEach((marca) => {
    lienzo.append(texto(X(marca), h - 12, formatoX(marca), "middle"));
  });
  puntos.forEach(([x, y]) => {
    const punto = svg("circle", {
      cx: X(x),
      cy: Y(y),
      r: 3.2,
      fill: color,
      opacity: 0.45,
    });
    punto.dataset.x = String(x);
    lienzo.append(punto);
  });
  const linea = dispersion.linea;
  lienzo.append(
    svg("line", {
      x1: X(linea.x1),
      y1: Y(linea.y1),
      x2: X(linea.x2),
      y2: Y(linea.y2),
      stroke: "#f4efe6",
      "stroke-width": 1.6,
    })
  );
}

function pintarBarras(id, items, color, formato, recortar, w = 640) {
  const host = document.getElementById(id);
  const h = 320;
  const pad = { l: 48, r: 12, t: 16, b: 36 };
  const valores = items.map((item) => item.media);
  let y0 = 0;
  let y1 = Math.max(...valores) * 1.08;
  if (recortar) {
    y0 = Math.min(...valores) * 0.94;
    y1 = Math.max(...valores) * 1.03;
  }
  const ancho = (w - pad.l - pad.r) / items.length;
  const Y = (v) => escala(v, y0, y1, h - pad.b, pad.t);
  const lienzo = prepararLienzo(host, w, h);
  ejeY(lienzo, ticks(y0, y1, 4), Y, pad.l, w - pad.r, formato);
  items.forEach((item, i) => {
    const x = pad.l + i * ancho + ancho * 0.22;
    const bw = ancho * 0.56;
    const y = Y(item.media);
    const base = Y(y0);
    const rect = svg("rect", {
      x,
      y,
      width: bw,
      height: Math.max(0, base - y),
      rx: 6,
      fill: color,
    });
    const titulo = svg("title", {});
    titulo.textContent = `${item.etiqueta}: ${formato(item.media)} · n = ${item.n}`;
    rect.append(titulo);
    lienzo.append(rect, texto(x + bw / 2, h - 14, item.etiqueta, "middle"));
  });
}

function pintarArea(id, puntos, color, formatoX, formatoY, guia) {
  const host = document.getElementById(id);
  const w = 640;
  const h = 360;
  const pad = { l: 58, r: 16, t: 18, b: 36 };
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const yMin = Math.min(...ys, guia ? guia.y1 : Infinity, guia ? guia.y2 : Infinity);
  const yMax = Math.max(...ys, guia ? guia.y1 : -Infinity, guia ? guia.y2 : -Infinity);
  const y0 = yMin - (yMax - yMin) * 0.08;
  const y1 = yMax + (yMax - yMin) * 0.1;
  const X = (v) => escala(v, x0, x1, pad.l, w - pad.r);
  const Y = (v) => escala(v, y0, y1, h - pad.b, pad.t);
  const lienzo = prepararLienzo(host, w, h);
  ejeY(lienzo, ticks(y0, y1, 4), Y, pad.l, w - pad.r, formatoY);
  const idGrad = "grad-" + id;
  const defs = svg("defs", {});
  const grad = svg("linearGradient", { id: idGrad, x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.append(
    svg("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.35" }),
    svg("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" })
  );
  defs.append(grad);
  lienzo.append(defs);
  ticks(x0, x1, 5).forEach((marca) => {
    lienzo.append(texto(X(marca), h - 12, formatoX(marca), "middle"));
  });
  const linea = puntos
    .map((p, i) => `${i === 0 ? "M" : "L"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`)
    .join(" ");
  const cierre = `${linea} L${X(puntos[puntos.length - 1].x).toFixed(1)},${h - pad.b} L${X(puntos[0].x).toFixed(1)},${h - pad.b} Z`;
  lienzo.append(
    svg("path", { d: cierre, fill: `url(#${idGrad})` }),
    svg("path", { d: linea, fill: "none", stroke: color, "stroke-width": 1.7 })
  );
  if (guia) {
    lienzo.append(
      svg("line", {
        x1: X(guia.x1),
        y1: Y(guia.y1),
        x2: X(guia.x2),
        y2: Y(guia.y2),
        stroke: "#f4efe6",
        "stroke-width": 1.4,
        "stroke-dasharray": "5 5",
      })
    );
  }
  return { lienzo, X, Y };
}

function pintarCorrelaciones(id, items) {
  const host = document.getElementById(id);
  host.replaceChildren();
  items.forEach((item) => {
    const fila = document.createElement("div");
    fila.className = "corr-fila";
    const nombre = document.createElement("b");
    nombre.textContent = item.etiqueta;
    const pista = document.createElement("div");
    pista.className = "corr-pista";
    pista.append(document.createElement("i"));
    const barra = document.createElement("span");
    barra.className = "corr-barra";
    const ancho = Math.abs(item.r) * 50;
    barra.style.width = ancho + "%";
    barra.style.left = item.r >= 0 ? "50%" : 50 - ancho + "%";
    pista.append(barra);
    const valor = document.createElement("span");
    valor.className = "corr-valor";
    valor.textContent = firma(item.r);
    fila.append(nombre, pista, valor);
    host.append(fila);
  });
}

function metricas(id, celdas) {
  const host = document.getElementById(id);
  host.replaceChildren();
  celdas.forEach((celda) => {
    const articulo = document.createElement("article");
    articulo.className = "metrica";
    const etiqueta = document.createElement("span");
    etiqueta.textContent = celda.etiqueta;
    const fuerte = document.createElement("strong");
    fuerte.textContent = celda.valor;
    const detalle = document.createElement("em");
    detalle.textContent = celda.detalle;
    articulo.append(etiqueta, fuerte, detalle);
    host.append(articulo);
  });
}

function actividad(id, grupos, unidad) {
  const host = document.getElementById(id);
  host.replaceChildren();
  grupos.forEach((grupo) => {
    const caja = document.createElement("div");
    const etiqueta = document.createElement("span");
    etiqueta.textContent = grupo.etiqueta;
    const fuerte = document.createElement("strong");
    fuerte.textContent = num(grupo.media, 0);
    const detalle = document.createElement("em");
    detalle.textContent = `${unidad} · ${num(grupo.n, 0)} registros`;
    caja.append(etiqueta, fuerte, detalle);
    host.append(caja);
  });
}

function ecuacion(modelo) {
  let texto = num(modelo.intercepto, 1);
  modelo.terminos.forEach((termino) => {
    const signo = termino.coef < 0 ? " − " : " + ";
    texto += signo + num(Math.abs(termino.coef), 2) + "·" + termino.etiqueta;
  });
  return texto;
}

function predecir(modelo, valores) {
  return modelo.terminos.reduce((suma, termino) => suma + termino.coef * valores[termino.clave], modelo.intercepto);
}

function percentil(cuantiles, valor) {
  let puesto = 0;
  while (puesto < cuantiles.length - 1 && cuantiles[puesto] < valor) puesto += 1;
  return puesto;
}

function frasePercentil(puesto, vena) {
  const quien = {
    glucosa: "de las personas del archivo",
    energia: "de las lecturas de consumo",
    dolar: "de los días del dólar",
  }[vena];
  if (puesto <= 8) {
    return `Esta estimación queda entre los valores más bajos: solo el ${puesto} % ${quien} está por debajo.`;
  }
  if (puesto >= 92) {
    return `Esta estimación queda entre los valores más altos: por encima del ${puesto} % ${quien}.`;
  }
  return `Esta estimación queda por encima del ${puesto} % ${quien}.`;
}

function enlazarConsolas() {
  document.querySelectorAll("form.consola").forEach((form) => {
    const modelo = D[form.dataset.modelo].modelo;
    const salida = form.querySelector("[data-salida]");
    const formula = form.querySelector("[data-ecuacion]");
    formula.textContent = ecuacion(modelo);

    const cinta = document.createElement("div");
    cinta.className = "cinta";
    const pista = document.createElement("div");
    pista.className = "cinta-pista";
    const marca = document.createElement("i");
    pista.append(marca);
    const lectura = document.createElement("p");
    cinta.append(pista, lectura);
    form.append(cinta);

    const calcular = () => {
      const valores = {};
      form.querySelectorAll("input[type=range]").forEach((input) => {
        const crudo = Number(input.value);
        valores[input.dataset.clave] = crudo;
        const decimales = Number(input.dataset.decimales || 0);
        const escalaVista = Number(input.dataset.escala || 1);
        const sufijo = input.dataset.sufijo || "";
        input.previousElementSibling.querySelector("output").textContent =
          num(crudo * escalaVista, decimales) + sufijo;
      });
      const estimado = predecir(modelo, valores);
      const decimales = Math.abs(estimado) >= 100 ? 0 : 1;
      salida.textContent = num(estimado, decimales);
      const puesto = percentil(D[form.dataset.modelo].cuantiles, estimado);
      marca.style.left = puesto + "%";
      lectura.textContent = frasePercentil(puesto, form.dataset.modelo);
    };

    form.addEventListener("input", calcular);
    calcular();
  });
}

function franjaHora(hora) {
  if (hora <= 6) return "Madrugada";
  if (hora < 12) return "Mañana";
  if (hora === 12) return "Mediodía";
  if (hora <= 18) return "Tarde";
  return "Cierre del día";
}

function textoReloj(hora, dato) {
  const media = num(dato.media, 0);
  const temp = num(dato.temperatura, 1);
  if (hora <= 6) {
    return `A las ${hora} el consumo medio es ${media}, de lo más bajo del día. La temperatura de esas lecturas ronda ${temp}°.`;
  }
  if (hora < 12) {
    return `La mañana ya empuja. A las ${hora} la media llega a ${media}, con una temperatura cercana a ${temp}°.`;
  }
  if (hora === 12) {
    return `Mediodía. La media llega a ${media}, con una temperatura cercana a ${temp}°.`;
  }
  if (hora <= 18) {
    return `Tarde. La veta sigue abriéndose: ${media} de media a las ${hora}. La temperatura de esa hora ronda ${temp}°.`;
  }
  return `Cierre del día. La hora ${hora} es de las más altas del reloj, con ${media} de media.`;
}

function pintarReloj() {
  const host = document.getElementById("reloj");
  const horas = D.energia.porHora;
  const medias = horas.map((hora) => hora.media);
  const minimo = Math.min(...medias);
  const maximo = Math.max(...medias);
  const lado = 320;
  const centro = 160;
  const lienzo = prepararLienzo(host, lado, lado);
  lienzo.setAttribute("role", "slider");
  lienzo.setAttribute("aria-label", "Hora del día según el consumo medio");
  lienzo.setAttribute("aria-valuemin", "1");
  lienzo.setAttribute("aria-valuemax", "24");
  lienzo.setAttribute("tabindex", "0");

  const rayos = horas.map((hora, indice) => {
    const angulo = (indice / 24) * Math.PI * 2 - Math.PI / 2;
    const t = (hora.media - minimo) / (maximo - minimo || 1);
    const radio = 78 + t * 62;
    const linea = svg("line", {
      x1: centro + Math.cos(angulo) * 64,
      y1: centro + Math.sin(angulo) * 64,
      x2: centro + Math.cos(angulo) * radio,
      y2: centro + Math.sin(angulo) * radio,
      stroke: TONO.energia,
      "stroke-width": 7,
      "stroke-linecap": "round",
      opacity: 0.4,
    });
    return linea;
  });
  rayos.forEach((rayo) => lienzo.append(rayo));
  [1, 7, 13, 19].forEach((hora) => {
    const angulo = ((hora - 1) / 24) * Math.PI * 2 - Math.PI / 2;
    lienzo.append(
      texto(
        centro + Math.cos(angulo) * 148,
        centro + Math.sin(angulo) * 148 + 4,
        String(hora),
        "middle",
        tintaSuave
      )
    );
  });

  const input = document.getElementById("e-hora");

  const fijar = (hora, emitir) => {
    const elegida = Math.min(24, Math.max(1, hora));
    rayos.forEach((rayo, indice) => {
      const activo = indice + 1 === elegida;
      rayo.setAttribute("opacity", activo ? "1" : "0.32");
      rayo.setAttribute("stroke-width", activo ? "9" : "7");
    });
    lienzo.setAttribute("aria-valuenow", String(elegida));
    const dato = horas[elegida - 1];
    document.getElementById("reloj-consumo").textContent = num(dato.media, 0);
    document.getElementById("reloj-franja").textContent = franjaHora(elegida);
    document.getElementById("reloj-texto").textContent = textoReloj(elegida, dato);
    if (emitir && Number(input.value) !== elegida) {
      input.value = String(elegida);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const horaDesde = (evento) => {
    const rect = lienzo.getBoundingClientRect();
    const x = ((evento.clientX - rect.left) / rect.width) * lado - centro;
    const y = ((evento.clientY - rect.top) / rect.height) * lado - centro;
    let angulo = Math.atan2(y, x) + Math.PI / 2;
    if (angulo < 0) angulo += Math.PI * 2;
    return Math.min(24, Math.floor((angulo / (Math.PI * 2)) * 24) + 1);
  };

  lienzo.addEventListener("pointerdown", (evento) => {
    lienzo.setPointerCapture(evento.pointerId);
    fijar(horaDesde(evento), true);
  });
  lienzo.addEventListener("pointermove", (evento) => {
    if (evento.buttons !== 1) return;
    fijar(horaDesde(evento), true);
  });
  lienzo.addEventListener("keydown", (evento) => {
    const actual = Number(input.value);
    if (evento.key === "ArrowRight" || evento.key === "ArrowUp") {
      evento.preventDefault();
      fijar(actual + 1, true);
    }
    if (evento.key === "ArrowLeft" || evento.key === "ArrowDown") {
      evento.preventDefault();
      fijar(actual - 1, true);
    }
  });
  input.addEventListener("input", () => fijar(Number(input.value), false));
  fijar(Number(input.value) || 12, false);
}

function enlazarDecadas() {
  const circulos = [...document.querySelectorAll("#chart-g-scatter circle")];
  const barras = [...document.querySelectorAll("#chart-g-edad rect")];
  const nota = document.getElementById("nota-decada");
  const base = nota.textContent;
  let activa = -1;
  barras.forEach((barra, indice) => {
    barra.addEventListener("click", () => {
      if (activa === indice) {
        activa = -1;
        circulos.forEach((circulo) => circulo.setAttribute("opacity", "0.45"));
        barras.forEach((otra) => otra.setAttribute("opacity", "1"));
        nota.textContent = base;
        return;
      }
      activa = indice;
      const banda = D.glucosa.porEdad[indice];
      const [desde, hasta] = banda.etiqueta.split("–").map(Number);
      circulos.forEach((circulo) => {
        const edad = Number(circulo.dataset.x);
        circulo.setAttribute("opacity", edad >= desde && edad <= hasta ? "0.95" : "0.07");
      });
      barras.forEach((otra, j) => otra.setAttribute("opacity", j === indice ? "1" : "0.28"));
      nota.textContent = `Década ${banda.etiqueta}: ${num(banda.n, 0)} personas y glucosa media de ${num(banda.media, 0)} mg/dL. El resto de la nube quedó en segundo plano. Toca la misma barra para volver a verlas todas.`;
    });
  });
}

function enlazarLupa(mapa) {
  const serie = D.dolar.serie;
  const modelo = D.dolar.modelo;
  const cinta = document.getElementById("lupa-cinta");
  const precios = serie.map((punto) => punto.precio);
  const minimo = Math.min(...precios);
  const maximo = Math.max(...precios);
  const xCinta = (indice) => 8 + (indice / (serie.length - 1)) * 624;
  const yCinta = (valor) => 64 - ((valor - minimo) / (maximo - minimo)) * 52;
  const trazo = serie
    .map((punto, indice) => `${indice ? "L" : "M"}${xCinta(indice).toFixed(1)},${yCinta(punto.precio).toFixed(1)}`)
    .join(" ");
  cinta.append(svg("path", { d: trazo, fill: "none", stroke: TONO.dolar, "stroke-width": 1.5 }));
  const guia = svg("line", { y1: 6, y2: 66, stroke: "#f4efe6", "stroke-width": 1 });
  cinta.append(guia);
  const marca = svg("circle", {
    r: 5.5,
    fill: "#0c0b09",
    stroke: "#f4efe6",
    "stroke-width": 2,
  });
  mapa.lienzo.append(marca);

  const input = document.getElementById("lupa-dia");
  const pintar = () => {
    const dia = Number(input.value);
    const punto = serie[dia - 1];
    document.getElementById("lupa-dia-out").textContent = String(dia);
    const esperado = predecir(modelo, {
      Dia: punto.dia,
      Inflacion: punto.inflacion,
      Tasa_interes: punto.tasa,
    });
    const diferencia = punto.precio - esperado;
    document.getElementById("lupa-precio").textContent = num(punto.precio, 0);
    document.getElementById("lupa-modelo").textContent = num(esperado, 0);
    const signo = diferencia >= 0 ? "+" : "−";
    const error = document.getElementById("lupa-error");
    error.textContent = signo + num(Math.abs(diferencia), 0);
    error.style.color = Math.abs(diferencia) > modelo.rmse ? "#ff6b4a" : "#d6f25c";
    const ayer = dia > 1 ? serie[dia - 2].precio : null;
    const salto = ayer == null ? "" : ` Frente al día anterior, el precio ${punto.precio - ayer >= 0 ? "subió" : "bajó"} ${num(Math.abs(punto.precio - ayer), 0)}.`;
    const juicio = Math.abs(diferencia) <= modelo.rmse
      ? `La diferencia cabe en el error típico del modelo, de ${num(modelo.rmse, 0)}.`
      : `La diferencia se sale del error típico del modelo, de ${num(modelo.rmse, 0)}.`;
    document.getElementById("lupa-relato").textContent =
      `El día ${dia} el archivo marca ${num(punto.precio, 0)}. Con la inflación y la tasa de ese mismo día, el modelo esperaba ${num(esperado, 0)}. ${juicio}${salto}`;
    guia.setAttribute("x1", xCinta(dia - 1));
    guia.setAttribute("x2", xCinta(dia - 1));
    marca.setAttribute("cx", mapa.X(punto.dia));
    marca.setAttribute("cy", mapa.Y(punto.precio));
  };
  input.addEventListener("input", pintar);
  pintar();
}

const FICHAS = [
  {
    id: "glucosa",
    nombre: "Glucosa",
    unidad: "mg/dL",
    campos: [
      ["Edad", "Edad", 0, 1, ""],
      ["IMC", "IMC", 1, 1, ""],
      ["Actividad_Fisica", "Actividad", 0, 1, ""],
    ],
  },
  {
    id: "energia",
    nombre: "Energía",
    unidad: "unidades",
    campos: [
      ["Temperatura", "Temperatura", 1, 1, "°"],
      ["Hora", "Hora", 0, 1, " h"],
      ["Dia_Semana", "Día", 0, 1, ""],
    ],
  },
  {
    id: "dolar",
    nombre: "Dólar",
    unidad: "",
    campos: [
      ["Dia", "Día", 0, 1, ""],
      ["Inflacion", "Inflación", 2, 100, " %"],
      ["Tasa_interes", "Tasa", 2, 1, ""],
    ],
  },
];

function pintarEspecimenes(paso) {
  const host = document.getElementById("especimenes");
  host.replaceChildren();
  document.getElementById("corte-num").textContent = "Corte " + String((paso % 36) + 1).padStart(2, "0");
  FICHAS.forEach((ficha, indice) => {
    const lista = D[ficha.id].muestras;
    const muestra = lista[(paso + indice * 7) % lista.length];
    const esperado = predecir(D[ficha.id].modelo, muestra);
    const error = muestra.real - esperado;
    const dentro = Math.abs(error) <= D[ficha.id].modelo.rmse;
    const tarjeta = document.createElement("article");
    tarjeta.className = "especimen entra";
    tarjeta.dataset.tono = ficha.id;

    const kicker = document.createElement("p");
    kicker.className = "ficha-kicker";
    kicker.textContent = "Registro " + num(muestra.registro, 0);
    const titulo = document.createElement("h3");
    titulo.textContent = ficha.nombre;
    const rasgos = document.createElement("ul");
    rasgos.className = "rasgos";
    ficha.campos.forEach(([clave, etiqueta, decimales, escala, sufijo]) => {
      const item = document.createElement("li");
      item.textContent = etiqueta + " " + num(muestra[clave] * (escala || 1), decimales) + (sufijo || "");
      rasgos.append(item);
    });

    const par = document.createElement("div");
    par.className = "par-medicion";
    [
      ["En el archivo", muestra.real],
      ["Según el modelo", esperado],
    ].forEach(([etiqueta, valor]) => {
      const caja = document.createElement("div");
      const nombre = document.createElement("span");
      nombre.textContent = etiqueta;
      const fuerte = document.createElement("strong");
      fuerte.textContent = num(valor, 0);
      caja.append(nombre, fuerte);
      par.append(caja);
    });

    const veredicto = document.createElement("p");
    veredicto.className = "veredicto";
    const sentido = error >= 0 ? "por encima" : "por debajo";
    veredicto.textContent = `El valor real está ${num(Math.abs(error), 0)} ${sentido} de lo que el modelo esperaba.`;
    const sello = document.createElement("p");
    sello.className = "sello";
    sello.textContent = dentro
      ? `Dentro del error típico · RMSE ${num(D[ficha.id].modelo.rmse, 1)}${ficha.unidad ? " " + ficha.unidad : ""}`
      : `Se sale del error típico · RMSE ${num(D[ficha.id].modelo.rmse, 1)}${ficha.unidad ? " " + ficha.unidad : ""}`;

    tarjeta.append(kicker, titulo, rasgos, par, veredicto, sello);
    host.append(tarjeta);
  });
}

function enlazarEspecimenes() {
  let paso = 0;
  const sacar = () => {
    pintarEspecimenes(paso);
    paso += 1;
  };
  document.getElementById("extraer").addEventListener("click", sacar);
  sacar();
}

function marcarNavegacion() {
  const enlaces = [...document.querySelectorAll(".nav-links a")];
  const secciones = enlaces
    .map((enlace) => document.querySelector(enlace.getAttribute("href")))
    .filter(Boolean);
  const barra = document.getElementById("progreso");

  const alMover = () => {
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    barra.style.width = (alto > 0 ? (window.scrollY / alto) * 100 : 0) + "%";
    let actual = secciones[0];
    secciones.forEach((seccion) => {
      if (seccion.getBoundingClientRect().top < 140) actual = seccion;
    });
    enlaces.forEach((enlace) => {
      enlace.classList.toggle("activo", enlace.getAttribute("href") === "#" + actual.id);
    });
  };

  window.addEventListener("scroll", alMover, { passive: true });
  alMover();
}

function iniciar() {
  document.getElementById("hero-trazo").setAttribute("d", D.hero);

  const g = D.glucosa;
  metricas("metricas-glucosa", [
    { etiqueta: "Media", valor: num(g.objetivo.media, 1), detalle: "mg/dL" },
    { etiqueta: "Mediana", valor: num(g.objetivo.mediana, 1), detalle: "mg/dL" },
    { etiqueta: "Desviación", valor: num(g.objetivo.sd, 1), detalle: "mg/dL" },
    { etiqueta: "R² del modelo", valor: num(g.modelo.r2, 3), detalle: "tres variables" },
  ]);
  pintarDispersion("chart-g-scatter", g.dispersion, TONO.glucosa, (v) => num(v, 0), (v) => num(v, 0));
  pintarCorrelaciones("corr-glucosa", g.correlaciones);
  pintarBarras("chart-g-edad", g.porEdad, TONO.glucosa, (v) => num(v, 0), true);
  actividad("act-glucosa", g.porActividad, "mg/dL");

  const e = D.energia;
  metricas("metricas-energia", [
    { etiqueta: "Media", valor: num(e.objetivo.media, 0), detalle: "unidades" },
    { etiqueta: "Madrugada", valor: num(e.franjas.manana, 0), detalle: "horas 1 a 6" },
    { etiqueta: "Cierre del día", valor: num(e.franjas.tarde, 0), detalle: "horas 18 a 24" },
    { etiqueta: "R² del modelo", valor: num(e.modelo.r2, 3), detalle: "tres variables" },
  ]);
  pintarDispersion(
    "chart-e-scatter",
    e.dispersion,
    TONO.energia,
    (v) => num(v, 0) + "°",
    (v) => num(v, 0)
  );
  pintarCorrelaciones("corr-energia", e.correlaciones);
  pintarArea(
    "chart-e-hora",
    e.porHora.map((hora) => ({ x: Number(hora.etiqueta), y: hora.media })),
    TONO.energia,
    (v) => num(v, 0) + "h",
    (v) => num(v, 0)
  );
  pintarBarras(
    "chart-e-dia",
    e.porDia.map((dia) => ({ ...dia, etiqueta: dia.etiqueta.replace("Día ", "") })),
    TONO.energia,
    (v) => num(v, 0),
    true,
    420
  );

  const d = D.dolar;
  metricas("metricas-dolar", [
    { etiqueta: "Inicio", valor: num(d.inicio, 0), detalle: "día 1" },
    { etiqueta: "Cierre", valor: num(d.fin, 0), detalle: "día 500" },
    { etiqueta: "Subida", valor: num(d.fin - d.inicio, 0), detalle: "en el periodo" },
    { etiqueta: "R² del modelo", valor: num(d.modelo.r2, 3), detalle: "lo explica el día" },
  ]);
  const mapaDolar = pintarArea(
    "chart-d-serie",
    d.serie.map((punto) => ({ x: punto.dia, y: punto.precio })),
    TONO.dolar,
    (v) => "d " + num(v, 0),
    (v) => num(v, 0),
    d.linea
  );
  pintarCorrelaciones("corr-dolar", d.correlaciones);

  enlazarConsolas();
  pintarReloj();
  enlazarLupa(mapaDolar);
  enlazarDecadas();
  enlazarEspecimenes();
  marcarNavegacion();
}

iniciar();
