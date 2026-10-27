"""Arma las páginas del sitio a partir de _src/.

Uso:  python _src/build.py

- _src/layout.html          diseño común (cabecera, menú, pie)
- _src/partials/*.html      piezas compartidas (iconos, barra de redes, pie…)
- _src/pages/<nombre>.html  contenido de cada página, con sus datos arriba:
      title: …          título en Google y en la pestaña
      description: …    texto que muestra Google bajo el título
      path: /ruta/      dirección de la página
      jsonld: a, b      datos estructurados de _src/ld-<a>.json (opcional)
      cta: no           oculta la franja "¿Listo para tu sesión?" (opcional)
  ---
  (HTML de la página)

Genera index.html, una carpeta por página (servicios/index.html…) y sitemap.xml.
Los archivos generados no se editan a mano: se cambian aquí y se vuelve a armar.
"""
import datetime
import hashlib
import html
import os

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
SITE = "https://nunaphotostudio.com"

# Contador de visitas de Umami (umami.is). Pega aquí el "Website ID" para activarlo.
UMAMI_WEBSITE_ID = "00bdd712-a1aa-4d67-a3c3-d39706f41eab"

NAV = [("/", "Inicio"), ("/servicios/", "Servicios"), ("/portafolio/", "Portafolio"),
       ("/planes/", "Planes"), ("/nosotros/", "Sobre nosotros"), ("/contacto/", "Contacto")]
ORDER = ["inicio", "servicios", "portafolio", "planes", "nosotros", "contacto", "terminos"]

# Enlaces antiguos de la web de una sola página (nunaphotostudio.com/#planes…)
OLD_HASHES = """<script>(function () {
  var h = location.hash.slice(1), pages = ["servicios", "portafolio", "planes", "nosotros", "contacto", "terminos"];
  if (pages.indexOf(h) >= 0) location.replace("/" + h + "/");
  else if (h === "preguntas") location.replace("/planes/#preguntas");
})();</script>"""


def read(*parts):
    with open(os.path.join(SRC, *parts), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def version(rel):
    with open(os.path.join(ROOT, rel), "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:8]


def load_page(name):
    meta_text, body = read("pages", name + ".html").split("\n---\n", 1)
    meta = dict(line.split(": ", 1) for line in meta_text.splitlines() if line.strip())
    return meta, body


def nav_html(path):
    items = []
    for href, label in NAV:
        current = ' aria-current="page"' if href == path else ""
        items.append('        <li><a href="%s"%s>%s</a></li>' % (href, current, label))
    return "\n".join(items)


def build():
    layout = read("layout.html")
    partials = {n[:-5]: read("partials", n).rstrip("\n") for n in os.listdir(os.path.join(SRC, "partials"))}
    css_v, js_v = version("assets/site.css"), version("assets/site.js")
    umami = ""
    if UMAMI_WEBSITE_ID:
        umami = '<script defer src="https://cloud.umami.is/script.js" data-website-id="%s"></script>' % UMAMI_WEBSITE_ID
    urls = []
    for name in ORDER:
        meta, body = load_page(name)
        path = meta["path"]
        extra = []
        if path == "/":
            extra.append(OLD_HASHES)
        for ld in filter(None, (s.strip() for s in meta.get("jsonld", "").split(","))):
            extra.append('<script type="application/ld+json">\n' + read("ld-" + ld + ".json").rstrip("\n") + "\n</script>")
        page = layout
        for key, value in {
            "title": html.escape(meta["title"]),
            "description": html.escape(meta["description"]),
            "url": SITE + path,
            "css_v": css_v,
            "js_v": js_v,
            "umami": umami,
            "head_extra": "\n".join(extra),
            "nav": nav_html(path),
            "name": name,
            "content": body.rstrip("\n"),
            "cta": "" if meta.get("cta") == "no" else partials["cta"],
            **{"partial_" + k: v for k, v in partials.items()},
        }.items():
            page = page.replace("{{" + key + "}}", value)
        assert "{{" not in page, name
        write(("index.html" if path == "/" else path.strip("/") + "/index.html"), page)
        urls.append(path)
    today = datetime.date.today().isoformat()
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in urls:
        sitemap.append("  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>" % (SITE, path, today))
    sitemap.append("</urlset>")
    write("sitemap.xml", "\n".join(sitemap) + "\n")
    print("Listo: %d páginas y sitemap.xml" % len(urls))


if __name__ == "__main__":
    build()
