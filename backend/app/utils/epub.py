from __future__ import annotations

from html import unescape
from html.parser import HTMLParser
from io import BytesIO
from pathlib import PurePosixPath
import re
import xml.etree.ElementTree as ET
import zipfile


class EPUBTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.heading_text: list[str] = []
        self.capture_heading = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"p", "div", "section", "article", "br", "li", "blockquote"}:
            self.parts.append("\n")
        if tag in {"h1", "h2", "h3"}:
            self.parts.append("\n")
            self.capture_heading = True

    def handle_endtag(self, tag: str) -> None:
        if tag in {"p", "div", "section", "article", "li", "blockquote", "h1", "h2", "h3"}:
            self.parts.append("\n")
        if tag in {"h1", "h2", "h3"}:
            self.capture_heading = False

    def handle_data(self, data: str) -> None:
        if not data.strip():
            return
        cleaned = unescape(data)
        self.parts.append(cleaned)
        if self.capture_heading:
            self.heading_text.append(cleaned)

    def get_text(self) -> tuple[str, str | None]:
        merged_text = "".join(self.parts)
        merged_text = re.sub(r"\n{3,}", "\n\n", merged_text)
        merged_text = "\n".join(line.strip() for line in merged_text.splitlines())
        merged_text = re.sub(r"\n{3,}", "\n\n", merged_text).strip()
        heading = " ".join(part.strip() for part in self.heading_text if part.strip()).strip()
        return merged_text, heading or None


def _read_container_path(epub_zip: zipfile.ZipFile) -> str:
    container_xml = epub_zip.read("META-INF/container.xml")
    root = ET.fromstring(container_xml)
    namespace = {"container": "urn:oasis:names:tc:opendocument:xmlns:container"}
    rootfile = root.find(".//container:rootfile", namespace)
    if rootfile is None:
        raise ValueError("EPUB package file was not found.")
    full_path = rootfile.attrib.get("full-path")
    if not full_path:
        raise ValueError("EPUB package path is missing.")
    return full_path


def _read_opf_metadata(epub_zip: zipfile.ZipFile, opf_path: str) -> tuple[str | None, list[str], dict[str, dict[str, str]]]:
    opf_xml = epub_zip.read(opf_path)
    root = ET.fromstring(opf_xml)

    namespace = {
        "opf": "http://www.idpf.org/2007/opf",
        "dc": "http://purl.org/dc/elements/1.1/",
    }

    title_element = root.find(".//dc:title", namespace)
    book_title = title_element.text.strip() if title_element is not None and title_element.text else None

    manifest: dict[str, dict[str, str]] = {}
    for item in root.findall(".//opf:manifest/opf:item", namespace):
        item_id = item.attrib.get("id")
        if item_id:
            manifest[item_id] = item.attrib

    spine_itemrefs = [item.attrib.get("idref", "") for item in root.findall(".//opf:spine/opf:itemref", namespace)]
    return book_title, spine_itemrefs, manifest


def _should_skip_item(item: dict[str, str], href: str, text: str) -> bool:
    item_id = item.get("id", "").lower()
    properties = item.get("properties", "").lower()
    href_lower = href.lower()

    if "nav" in properties:
        return True
    if any(keyword in href_lower or keyword in item_id for keyword in ("toc", "nav", "cover", "copyright", "title")):
        return True
    return len(text.replace("\n", "").strip()) < 80


def extract_epub_contents(content: bytes, fallback_title: str) -> tuple[str, list[dict[str, str]]]:
    with zipfile.ZipFile(BytesIO(content)) as epub_zip:
        opf_path = _read_container_path(epub_zip)
        opf_directory = PurePosixPath(opf_path).parent
        book_title, spine_itemrefs, manifest = _read_opf_metadata(epub_zip, opf_path)

        chapters: list[dict[str, str]] = []

        for index, itemref in enumerate(spine_itemrefs, start=1):
            manifest_item = manifest.get(itemref)
            if manifest_item is None:
                continue

            href = manifest_item.get("href", "")
            if not href:
                continue

            item_path = str((opf_directory / href).as_posix())
            try:
                html_bytes = epub_zip.read(item_path)
            except KeyError:
                continue

            extractor = EPUBTextExtractor()
            extractor.feed(html_bytes.decode("utf-8", errors="ignore"))
            text, heading = extractor.get_text()

            if _should_skip_item(manifest_item, href, text):
                continue

            chapters.append(
                {
                    "title": heading or f"{book_title or fallback_title} - Chapter {len(chapters) + 1}",
                    "source_text": text,
                }
            )

    if not chapters:
        raise ValueError("No readable chapters were found in the EPUB file.")

    return (book_title or fallback_title, chapters)
