// Nuna Photo Studio: comportamiento compartido por todas las páginas.
// Cada bloque comprueba que sus elementos existan, porque no todas las páginas los tienen.
(function () {
  var PLANS = [
    { name: "Individual Básico", price: 950, tag: "1 persona · 30 min",
      items: ["3 imágenes digitales", "1 persona", "30 minutos de sesión"] },
    { name: "Individual Complementario", price: 1800, tag: "2 personas · 30 min",
      items: ["5 imágenes digitales", "2 personas", "30 minutos de sesión"] },
    { name: "Individual Max", price: 2500, tag: "3 personas · 45 min", feature: true,
      items: ["7 imágenes digitales", "3 personas", "1 cambio de vestuario", "45 minutos de sesión"] },
    { name: "Familiar", price: 3800, tag: "5 personas · 1 hora",
      items: ["10 imágenes digitales", "5 personas", "1 cambio de vestuario", "1 hora de sesión"] }
  ];
  var WA = "18493778517";
  var fmt = function (n) { return n.toLocaleString("es-DO"); };

  // Tarjetas de planes
  document.querySelectorAll("[data-plans]").forEach(function (box) {
    var full = box.getAttribute("data-plans") === "full";
    box.innerHTML = PLANS.map(function (p) {
      return '<article class="plan' + (p.feature ? ' feature' : '') + '">' +
        '<p class="meta">' + p.tag + '</p>' +
        '<h3>' + p.name + '</h3>' +
        '<p class="price"><small>RD$</small>' + fmt(p.price) + '</p>' +
        (full ? '<ul>' + p.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' : '<div></div>') +
        '<a class="btn' + (p.feature ? '' : ' ghost') + '" href="/contacto/?plan=' + encodeURIComponent(p.name) + '">Reservar</a>' +
        '</article>';
    }).join('');
  });

  // Menú móvil
  var header = document.querySelector("header.site"), menuBtn = document.getElementById("menu-btn");
  function setMenu(open) {
    header.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  menuBtn.addEventListener("click", function () { setMenu(!header.classList.contains("open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // Avisos breves
  var toast = document.getElementById("toast"), toastTimer;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  // Copiar
  function copy(text, done, fail) {
    try { navigator.clipboard.writeText(text).then(done, fail); } catch (err) { fail(); }
  }
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      copy(b.getAttribute("data-copy"),
        function () { var t = b.textContent; b.textContent = "Copiado"; setTimeout(function () { b.textContent = t; }, 1500); },
        function () { showToast(b.getAttribute("data-copy")); });
    });
  });

  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  // Formulario de cita (solo en Contacto)
  var sel = document.getElementById("f-servicio");
  if (sel) (function () {
    var opts = PLANS.map(function (p) { return p.name + " (RD$" + fmt(p.price) + ")"; })
      .concat(["Cobertura de evento (cotización)", "Alquiler de estudio (cotización)", "Otro / no estoy seguro"]);
    sel.innerHTML = opts.map(function (o) { return "<option>" + o + "</option>"; }).join("");

    // Preselección desde los botones "Reservar" y "Pedir cotización": /contacto/?plan=… o ?servicio=…
    var params = new URLSearchParams(location.search);
    var plan = params.get("plan"), service = params.get("servicio");
    if (plan) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text.indexOf(plan + " (") === 0) sel.selectedIndex = i;
    if (service && opts.indexOf(service) >= 0) sel.value = service;

    var f = { nombre: "f-nombre", tel: "f-tel", fecha: "f-fecha", hora: "f-hora", msg: "f-msg" };
    Object.keys(f).forEach(function (k) { f[k] = document.getElementById(f[k]); });

    // Horario: citas de 1 hora. L-V 10:00-19:00, S-D 16:00-20:00 (hora de inicio de cada cita)
    function hourLabel(h) {
      var ampm = h < 12 ? "a. m." : "p. m.";
      return ((h + 11) % 12 + 1) + ":00 " + ampm;
    }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var now = new Date();
    var todayStr = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
    f.fecha.min = todayStr;
    function fillHours() {
      var prev = f.hora.value;
      if (!f.fecha.value) {
        f.hora.innerHTML = '<option value="">Elige primero la fecha</option>';
        f.hora.disabled = true;
        return;
      }
      var day = new Date(f.fecha.value + "T12:00:00").getDay();
      var weekend = day === 0 || day === 6;
      var start = weekend ? 16 : 10, end = weekend ? 20 : 19;
      var isToday = f.fecha.value === todayStr;
      var hours = [];
      for (var h = start; h < end; h++) {
        if (isToday && h <= new Date().getHours()) continue;
        hours.push('<option value="' + h + '">' + hourLabel(h) + " – " + hourLabel(h + 1) + "</option>");
      }
      if (f.fecha.value < todayStr) hours = [];
      f.hora.innerHTML = hours.length ? '<option value="">Elige una hora</option>' + hours.join("")
        : '<option value="">No quedan horas este día</option>';
      f.hora.disabled = !hours.length;
      f.hora.value = prev;
      if (f.hora.value !== prev) f.hora.value = "";
    }
    f.fecha.addEventListener("change", function () { fillHours(); update(); });
    var preview = document.getElementById("f-preview");
    var send = document.getElementById("wa-send");
    var status = document.getElementById("f-status");
    function message() {
      var lines = ["Hola Nuna Photo Studio, quiero pedir una cita."];
      if (f.nombre.value.trim()) lines.push("Nombre: " + f.nombre.value.trim());
      if (f.tel.value.trim()) lines.push("Teléfono: " + f.tel.value.trim());
      lines.push("Servicio: " + sel.value);
      if (f.fecha.value) {
        var d = new Date(f.fecha.value + "T12:00:00");
        lines.push("Fecha: " + d.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      }
      if (f.hora.value) { var h = +f.hora.value; lines.push("Hora: " + hourLabel(h) + " – " + hourLabel(h + 1)); }
      if (f.msg.value.trim()) lines.push("Mensaje: " + f.msg.value.trim());
      return lines.join("\n");
    }
    function update() {
      var m = message();
      preview.textContent = m;
      send.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(m);
    }
    var form = document.getElementById("booking");
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    fillHours();
    send.addEventListener("click", function (e) {
      var missing = !f.nombre.value.trim() ? [f.nombre, "Escribe tu nombre para enviar la solicitud."]
        : !f.fecha.value ? [f.fecha, "Elige la fecha de tu cita."]
        : !f.hora.value ? [f.hora, "Elige la hora de tu cita."] : null;
      if (missing) {
        e.preventDefault();
        status.textContent = missing[1];
        if (!missing[0].disabled) missing[0].focus();
        return;
      }
      status.textContent = "Se abrirá WhatsApp con tu mensaje listo. Si no se abre, copia el mensaje y envíalo al 849-377-8517.";
      track("WhatsApp: formulario de cita", { servicio: sel.value });
    });
    document.getElementById("copy-msg").addEventListener("click", function () {
      copy(message(), function () { status.textContent = "Mensaje copiado."; },
        function () { status.textContent = "No se pudo copiar automáticamente. Selecciona el texto y cópialo."; });
    });
    update();
  })();

  // Portafolio (solo en Portafolio). Cada trabajo apunta a su foto en la carpeta fotos/.
  // Tamaños: "" normal, "w" ancho, "t" alto, "xl" destacado (2 columnas x 3 filas).
  // Las categorías sin fotos no aparecen en los filtros.
  var CATS = [
    { id: "estudio", label: "Retrato de estudio" },
    { id: "ninos", label: "Niños" },
    { id: "bodas", label: "Bodas" },
    { id: "quince", label: "Quinceaños" },
    { id: "grad", label: "Graduaciones" },
    { id: "eventos", label: "Eventos" }
  ];
  var WORKS = [
    { cat: "quince", title: "Corona y rosas", src: "/fotos/retrato-quincenanera-3.jpg", size: "xl" },
    { cat: "estudio", title: "Flores y color", src: "/fotos/retrato-modelo-femenina-4.jpg", size: "t" },
    { cat: "bodas", title: "Los novios", src: "/fotos/boda-1.jpg", size: "t" },
    { cat: "grad", title: "Graduada", src: "/fotos/graduacion-1.jpg", size: "t" },
    { cat: "estudio", title: "Sesión de pareja", src: "/fotos/foto-de-pareja.jpg", size: "t" },
    { cat: "quince", title: "En las escalinatas", src: "/fotos/retrato-quincenanera-2.jpg", size: "w" },
    { cat: "estudio", title: "Sesión de maternidad", src: "/fotos/retrato-de-embarazada.jpg", size: "t" },
    { cat: "estudio", title: "Rojo intenso", src: "/fotos/retrato-modelo-femenina-5.jpg", size: "t" },
    { cat: "grad", title: "El anillo", src: "/fotos/graduacion-3.jpg", size: "t" },
    { cat: "estudio", title: "Editorial con globos", src: "/fotos/retrato-modelo-femenina-1.jpg", size: "w" },
    { cat: "estudio", title: "En familia", src: "/fotos/foto-familiar.jpg", size: "xl" },
    { cat: "estudio", title: "Retrato masculino", src: "/fotos/retrato-masculino-1.jpg", size: "t" },
    { cat: "bodas", title: "La novia", src: "/fotos/boda-5.jpg", size: "t" },
    { cat: "bodas", title: "El ramo", src: "/fotos/boda-2.jpg", size: "t" },
    { cat: "ninos", title: "Primeros meses", src: "/fotos/retrato-de-nino-1.jpg", size: "t" },
    { cat: "ninos", title: "Hermanitas", src: "/fotos/retrato-de-nino-2.jpg", size: "w" },
    { cat: "ninos", title: "Cake smash", src: "/fotos/retrato-de-nino-3.jpg", size: "w" },
    { cat: "bodas", title: "Los anillos", src: "/fotos/boda-4.jpg", size: "w" },
    { cat: "bodas", title: "La recepción", src: "/fotos/boda-3.jpg", size: "t" },
    { cat: "bodas", title: "La invitación", src: "/fotos/eventos.jpg", size: "w" },
    { cat: "quince", title: "Quinceañera", src: "/fotos/retrato-quincenanera-1.jpg", size: "t" },
    { cat: "estudio", title: "Elegancia en negro", src: "/fotos/retrato-modelo-femenina-3.jpg", size: "t" },
    { cat: "grad", title: "Toga y birrete", src: "/fotos/graduacion-2.jpg", size: "t" },
    { cat: "estudio", title: "Mamá e hijo", src: "/fotos/foto-familiar-2.jpg", size: "t" },
    { cat: "estudio", title: "Estilo urbano", src: "/fotos/retrato-masculino-2.jpg", size: "t" },
    { cat: "estudio", title: "Entre rosas", src: "/fotos/retrato-modelo-femenina-5-b.jpg", size: "t" },
    { cat: "estudio", title: "Pose en estudio", src: "/fotos/retrato-modelo-femenina-2.jpg", size: "t" }
  ];
  var grid = document.getElementById("pf-grid");
  if (grid) (function () {
    var catLabel = {}; CATS.forEach(function (c) { catLabel[c.id] = c.label; });
    grid.innerHTML = WORKS.map(function (w, i) {
      return '<figure class="pf ' + w.size + '" data-cat="' + w.cat + '" data-i="' + i + '" tabindex="0" role="button" aria-label="Ver ' + w.title + '">' +
        (w.src ? '<img src="' + w.src + '" alt="' + w.title + '" loading="lazy" draggable="false">' : '') +
        '<figcaption><span>' + catLabel[w.cat] + '</span><b>' + w.title + '</b></figcaption></figure>';
    }).join("");
    var filters = document.getElementById("filters");
    var count = function (id) { return WORKS.filter(function (w) { return id === "all" || w.cat === id; }).length; };
    filters.innerHTML = [{ id: "all", label: "Todos" }].concat(CATS.filter(function (c) { return count(c.id) > 0; })).map(function (c, i) {
      return '<button class="chip" type="button" data-filter="' + c.id + '" aria-pressed="' + (i === 0) + '">' + c.label + '<span class="n">' + count(c.id) + '</span></button>';
    }).join("");
    function applyFilter(id) {
      filters.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === id); });
      var shown = 0;
      grid.querySelectorAll(".pf").forEach(function (el) {
        var on = id === "all" || el.getAttribute("data-cat") === id;
        el.hidden = !on;
        el.classList.remove("in");
        if (on) { el.style.setProperty("--i", shown++); void el.offsetWidth; el.classList.add("in"); }
      });
      document.getElementById("pf-empty").hidden = shown > 0;
    }
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (b) applyFilter(b.getAttribute("data-filter"));
    });

    // Visor de fotos (respeta el filtro activo)
    var lb = document.getElementById("lb"), lbImg = document.getElementById("lb-img"), lbCap = document.getElementById("lb-cap"), lbCount = document.getElementById("lb-count");
    var lbList = [], lbPos = 0, lbReturn = null;
    function lbShow() {
      var w = WORKS[lbList[lbPos]];
      lbImg.src = w.src; lbImg.alt = w.title;
      lbCap.textContent = w.title;
      lbCount.textContent = catLabel[w.cat] + " · " + (lbPos + 1) + " / " + lbList.length;
    }
    function lbOpen(i) {
      lbList = Array.prototype.filter.call(grid.querySelectorAll(".pf"), function (el) { return !el.hidden; })
        .map(function (el) { return +el.getAttribute("data-i"); });
      lbPos = Math.max(0, lbList.indexOf(i));
      lbReturn = document.activeElement;
      lb.hidden = false; document.body.classList.add("lb-open");
      lbShow(); document.getElementById("lb-close").focus();
    }
    function lbClose() { lb.hidden = true; document.body.classList.remove("lb-open"); if (lbReturn) lbReturn.focus(); }
    function lbStep(d) { lbPos = (lbPos + d + lbList.length) % lbList.length; lbShow(); }
    grid.addEventListener("click", function (e) { var f = e.target.closest(".pf"); if (f) lbOpen(+f.getAttribute("data-i")); });
    grid.addEventListener("keydown", function (e) { var f = e.target.closest(".pf"); if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); lbOpen(+f.getAttribute("data-i")); } });
    document.getElementById("lb-close").addEventListener("click", lbClose);
    document.getElementById("lb-prev").addEventListener("click", function () { lbStep(-1); });
    document.getElementById("lb-next").addEventListener("click", function () { lbStep(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) lbClose(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") lbClose();
      if (e.key === "ArrowLeft") lbStep(-1);
      if (e.key === "ArrowRight") lbStep(1);
    });
    var touchX = null;
    lb.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    });
  })();

  // Protección: bloquea clic derecho, arrastre y pulsación larga sobre las fotos
  ["contextmenu", "dragstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (e.target.closest(".pf, .lb-stage, .frame")) { e.preventDefault(); if (ev === "contextmenu") showToast("Las fotos de Nuna Photo Studio están protegidas"); }
    });
  });

  // Redes sociales: barra flotante, contacto y pie
  var SOCIAL = [
    { id: "wa", label: "WhatsApp", href: "https://wa.me/" + WA },
    { id: "ig", label: "Instagram", href: "https://www.instagram.com/nunaphotostudio" },
    { id: "fb", label: "Facebook", href: "https://www.facebook.com/profile.php?id=100063495369437" },
    { id: "tt", label: "TikTok", href: "https://www.tiktok.com/@nunaphotostudio" },
    { id: "x", label: "X", href: "https://x.com/nunaphotostudio" },
    { id: "mail", label: "nunaphotostudio@gmail.com", href: "mailto:nunaphotostudio@gmail.com", copy: "nunaphotostudio@gmail.com" }
  ];
  document.querySelectorAll("[data-social]").forEach(function (box) {
    box.innerHTML = SOCIAL.map(function (s, i) {
      var ext = s.copy ? "" : ' target="_blank" rel="noopener"';
      return '<a class="soc" style="--i:' + i + '" href="' + s.href + '"' + ext + ' data-label="' + s.label + '" aria-label="' + s.label + '"' +
        (s.copy ? ' data-mail="' + s.copy + '"' : ' data-track="' + s.label + ': iconos"') + '><svg aria-hidden="true"><use href="#i-' + s.id + '"/></svg></a>';
    }).join("");
  });
  document.addEventListener("click", function (e) {
    var m = e.target.closest("[data-mail]");
    if (!m) return;
    var addr = m.getAttribute("data-mail");
    copy(addr, function () { showToast("Correo copiado: " + addr); }, function () { showToast(addr); });
  });
  var sf = document.getElementById("social-float"), sfBtn = document.getElementById("sf-toggle");
  sfBtn.addEventListener("click", function () {
    var open = sf.classList.toggle("open");
    sfBtn.setAttribute("aria-expanded", open);
    sfBtn.setAttribute("aria-label", open ? "Ocultar redes sociales" : "Mostrar redes sociales");
  });

  // Contador de visitas (Umami): registra los clics en enlaces marcados con data-track.
  // Si el contador no está activado, no hace nada.
  function track(name, data) {
    if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-track]");
    if (a) track(a.getAttribute("data-track"));
  });

  // Slide de fotos del hero (solo en Inicio). Las demás fotos se cargan después de la página.
  var slides = document.querySelectorAll(".hero-slides img");
  if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener("load", function () {
      slides.forEach(function (img) { if (img.dataset.src) img.src = img.dataset.src; });
    });
    var si = 0;
    setInterval(function () {
      if (document.hidden) return;
      var next = (si + 1) % slides.length;
      if (!slides[next].complete || !slides[next].naturalWidth) return;
      slides[si].classList.remove("on");
      slides[next].classList.add("on");
      si = next;
    }, 5000);
  }

  // Lectura de exposición del hero (solo en Inicio)
  var readout = document.getElementById("readout");
  if (readout && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var EXP = ["85mm · f/2.8 · 1/160 · ISO 100", "50mm · f/4 · 1/200 · ISO 100", "35mm · f/1.8 · 1/125 · ISO 800", "70mm · f/8 · 1/200 · ISO 100"];
    var ei = 0;
    setInterval(function () { ei = (ei + 1) % EXP.length; readout.textContent = EXP[ei]; }, 2600);
  }
})();
