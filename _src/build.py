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
      lightbox: yes     incluye el visor de fotos (opcional)
  ---
  (HTML de la página)

Genera index.html, una carpeta por página (servicios/index.html…) y sitemap.xml.
También crea en fotos/webp/ versiones WebP de cada foto de fotos/ en varios anchos (necesita Pillow),
y cambia cada <img src="/fotos/…jpg"> por esas versiones con srcset, para que el celular baje la más
pequeña que le sirva. Un atributo sizes="…" escrito en la página se respeta; si no hay, se usa SIZES.
Los archivos generados no se editan a mano: se cambian aquí y se vuelve a armar.
"""
import datetime
import hashlib
import html
import os
import re

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
SITE = "https://nunaphotostudio.com"

# Contador de visitas de Umami (umami.is). Pega aquí el "Website ID" para activarlo.
UMAMI_WEBSITE_ID = "00bdd712-a1aa-4d67-a3c3-d39706f41eab"

NAV = [("/", "Inicio"), ("/servicios/", "Servicios"), ("/portafolio/", "Portafolio"),
       ("/planes/", "Planes"), ("/nosotros/", "Sobre nosotros"), ("/contacto/", "Contacto")]
ORDER = ["inicio", "servicios", "portafolio", "planes", "nosotros", "contacto", "terminos"]

# Anchos de las versiones WebP. Si la foto original es más pequeña, se guarda a su tamaño.
WIDTHS = (480, 800, 1200, 1600)
WEBP_QUALITY = 78
SIZES = "(min-width: 900px) 50vw, 100vw"

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


def make_webp():
    from PIL import Image, ImageOps
    fotos = os.path.join(ROOT, "fotos")
    out = os.path.join(fotos, "webp")
    os.makedirs(out, exist_ok=True)
    made = 0
    for name in sorted(os.listdir(fotos)):
        if not name.endswith(".jpg"):
            continue
        src = os.path.join(fotos, name)
        targets = [os.path.join(out, "%s-%d.webp" % (name[:-4], w)) for w in WIDTHS]
        if all(os.path.exists(t) and os.path.getmtime(t) >= os.path.getmtime(src) for t in targets):
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        for w, target in zip(WIDTHS, targets):
            copy = im.copy()
            copy.thumbnail((w, w * 4), Image.LANCZOS)
            copy.save(target, "WEBP", quality=WEBP_QUALITY, method=6)
        made += 1
    return made


def webp_attrs(base):
    srcset = ", ".join("/fotos/webp/%s-%d.webp %dw" % (base, w, w) for w in WIDTHS)
    return "/fotos/webp/%s-1200.webp" % base, srcset


def responsive(page):
    def img(m):
        tag = m.group(0)
        lazy = re.search(r'data-src="/fotos/([\w-]+)\.jpg"', tag)
        base = (lazy or re.search(r'\bsrc="/fotos/([\w-]+)\.jpg"', tag)).group(1)
        src, srcset = webp_attrs(base)
        if lazy:
            tag = tag.replace(lazy.group(0), 'data-src="%s" data-srcset="%s"' % (src, srcset))
        else:
            tag = re.sub(r'\bsrc="/fotos/[\w-]+\.jpg"', 'src="%s" srcset="%s"' % (src, srcset), tag)
        if " sizes=" not in tag:
            tag = tag.replace("<img ", '<img sizes="%s" ' % SIZES, 1)
        return tag
    return re.sub(r'<img [^>]*?(?:data-)?src="/fotos/[\w-]+\.jpg"[^>]*>', img, page)


def nav_html(path):
    items = []
    for href, label in NAV:
        current = ' aria-current="page"' if href == path else ""
        items.append('        <li><a href="%s"%s>%s</a></li>' % (href, current, label))
    return "\n".join(items)


def build():
    made = make_webp()
    if made:
        print("WebP: %d fotos convertidas" % made)
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
            "lightbox": partials["lightbox"] if meta.get("lightbox") == "yes" else "",
            **{"partial_" + k: v for k, v in partials.items()},
        }.items():
            page = page.replace("{{" + key + "}}", value)
        assert "{{" not in page, name
        page = responsive(page)
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
