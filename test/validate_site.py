"""Offline structure and JavaScript syntax smoke checks; not full HTML validation."""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import tempfile


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.doctype = False
        self.starts = []
        self.ends = []
        self.in_title = False
        self.title = []
        self.current_script = None
        self.scripts = []
        self.iframes = []
        self.buttons = []

    def handle_decl(self, decl):
        if decl.lower() == "doctype html":
            self.doctype = True

    def handle_starttag(self, tag, attrs):
        self.starts.append(tag)
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "script":
            kind = attrs.get("type", "").lower()
            if "src" not in attrs and kind in ("", "text/javascript", "application/javascript", "module"):
                self.current_script = (kind, [])
        if tag == "iframe":
            self.iframes.append(attrs)
        if tag == "button":
            self.buttons.append(attrs)

    def handle_endtag(self, tag):
        self.ends.append(tag)
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.current_script is not None:
            self.scripts.append(self.current_script)
            self.current_script = None

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.current_script is not None:
            self.current_script[1].append(data)


def validate(path):
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    page.close()
    if not page.doctype:
        raise ValueError("Missing HTML5 doctype")
    for tag in ("html", "head", "body", "title"):
        if page.starts.count(tag) != 1 or page.ends.count(tag) != 1:
            raise ValueError(f"Expected one opening and closing {tag} element")
    if not "".join(page.title).strip():
        raise ValueError("Page title is empty")
    for attrs in page.iframes:
        src = attrs.get("src", "")
        if "facebook.com" in src or "iheatmap.pagasa.dost.gov.ph" in src:
            raise ValueError(f"Third-party iframe must not load until the user clicks: {src}")
    loads = {attrs.get("data-embed-load") for attrs in page.buttons if attrs.get("data-embed-load")}
    if loads != {"pagasa", "facebook"}:
        raise ValueError(f"Expected click-to-load buttons for pagasa and facebook, found {loads}")
    root = path.parent
    app = (root / "app.js").read_text(encoding="utf-8")
    if "loading\", \"lazy\"" not in app and "loading', 'lazy'" not in app and 'setAttribute("loading", "lazy")' not in app:
        raise ValueError("app.js must set loading=lazy on created iframes")
    if 'setAttribute("sandbox"' not in app:
        raise ValueError("app.js must set sandbox on created iframes")
    if 'setAttribute("referrerpolicy"' not in app:
        raise ValueError("app.js must set referrerpolicy on created iframes")
    if "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" not in app:
        raise ValueError("app.js must use the minimum sandbox flags for the two embeds")
    if "iheatmap.pagasa.dost.gov.ph" not in app or "www.facebook.com/plugins/post.php" not in app:
        raise ValueError("app.js must keep the official PAGASA and DOLE embed URLs")
    if "autoplay; clipboard-write" in app:
        raise ValueError("Facebook embed must not request autoplay or clipboard-write")
    with tempfile.TemporaryDirectory() as directory:
        for index, (kind, chunks) in enumerate(page.scripts):
            script = Path(directory) / f"inline-{index}.{'mjs' if kind == 'module' else 'js'}"
            script.write_text("".join(chunks), encoding="utf-8")
            # --check parses only: no page code is executed, and no resources are fetched.
            subprocess.run(["node", "--check", str(script)], check=True)
        subprocess.run(["node", "--check", str(root / "app.js")], check=True)
        subprocess.run(["node", "--check", str(root / "sw.js")], check=True)
    sw = (root / "sw.js").read_text(encoding="utf-8")
    if "heat-index-shell-v7" not in sw:
        raise ValueError("Service worker cache must be heat-index-shell-v7")
    print(f"PASS: HTML structure, click-to-load embeds, and {len(page.scripts)} inline plus app.js/sw.js syntax check(s)")


if __name__ == "__main__":
    validate(Path(__file__).resolve().parents[1] / "index.html")
