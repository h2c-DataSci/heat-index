"""Offline structure and JavaScript syntax smoke checks; not full HTML validation."""
from html.parser import HTMLParser
from pathlib import Path
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

    def handle_decl(self, decl):
        if decl.lower() == "doctype html":
            self.doctype = True

    def handle_starttag(self, tag, attrs):
        self.starts.append(tag)
        if tag == "title":
            self.in_title = True
        if tag == "script":
            attrs = dict(attrs)
            kind = attrs.get("type", "").lower()
            if "src" not in attrs and kind in ("", "text/javascript", "application/javascript", "module"):
                self.current_script = (kind, [])

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
    with tempfile.TemporaryDirectory() as directory:
        for index, (kind, chunks) in enumerate(page.scripts):
            script = Path(directory) / f"inline-{index}.{'mjs' if kind == 'module' else 'js'}"
            script.write_text("".join(chunks), encoding="utf-8")
            # --check parses only: no page code is executed, and no resources are fetched.
            subprocess.run(["node", "--check", str(script)], check=True)
    print(f"PASS: HTML structure and {len(page.scripts)} inline JavaScript syntax check(s)")


if __name__ == "__main__":
    validate(Path(__file__).resolve().parents[1] / "index.html")
