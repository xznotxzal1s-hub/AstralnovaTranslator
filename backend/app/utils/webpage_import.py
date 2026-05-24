from __future__ import annotations

from dataclasses import dataclass
from ipaddress import ip_address
from socket import getaddrinfo
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

from app.core.config import settings
from app.utils.text_import import split_txt_into_chapters

CONTENT_SELECTORS = (
    "article",
    "main",
    "[role='main']",
    ".entry-content",
    ".post-content",
    ".article-content",
    ".novel_view",
    ".novel-body",
    ".honbun",
    "#content",
    "#main",
)
BLOCK_TAGS = ("h1", "h2", "h3", "h4", "p", "li", "blockquote", "pre")
NOISE_TAGS = ("script", "style", "noscript", "header", "footer", "nav", "aside", "form", "iframe", "svg", "canvas")


@dataclass
class WebpageImportContent:
    title: str
    chapter_payloads: list[dict[str, str]]


def _is_blocked_ip(value: str) -> bool:
    parsed_ip = ip_address(value)
    return (
        parsed_ip.is_loopback
        or parsed_ip.is_private
        or parsed_ip.is_link_local
        or parsed_ip.is_unspecified
        or parsed_ip.is_multicast
        or parsed_ip.is_reserved
    )


def _resolve_hostname(hostname: str) -> set[str]:
    resolved_addresses: set[str] = set()
    for result in getaddrinfo(hostname, None):
        resolved_addresses.add(result[4][0])
    return resolved_addresses


def validate_webpage_url(url: str) -> str:
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"}:
        raise ValueError("Only http and https webpage URLs are supported.")

    hostname = parsed_url.hostname
    if not hostname:
        raise ValueError("The webpage URL must include a hostname.")

    normalized_hostname = hostname.strip().lower().rstrip(".")
    if normalized_hostname == "localhost" or normalized_hostname.endswith(".localhost"):
        raise ValueError("Localhost URLs are not allowed for webpage import.")

    try:
        addresses = {str(ip_address(normalized_hostname))}
    except ValueError:
        try:
            addresses = _resolve_hostname(normalized_hostname)
        except OSError as exc:
            raise ValueError("The webpage URL hostname could not be resolved.") from exc

    if not addresses:
        raise ValueError("The webpage URL hostname could not be resolved.")

    for address in addresses:
        if _is_blocked_ip(address):
            raise ValueError("Private, local, link-local, and reserved network addresses are not allowed.")

    return url


async def fetch_webpage_html(url: str) -> str:
    current_url = validate_webpage_url(url)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36"
        )
    }
    timeout = httpx.Timeout(20.0, connect=10.0)

    async with httpx.AsyncClient(follow_redirects=False, headers=headers, timeout=timeout) as client:
        for _ in range(5):
            async with client.stream("GET", current_url) as response:
                if response.is_redirect:
                    location = response.headers.get("location")
                    if not location:
                        raise ValueError("The webpage redirected without a Location header.")
                    current_url = validate_webpage_url(urljoin(str(response.url), location))
                    continue

                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                if content_type and "text/html" not in content_type and "application/xhtml+xml" not in content_type:
                    raise ValueError("The webpage did not return HTML content.")

                content = bytearray()
                async for chunk in response.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > settings.max_webpage_bytes:
                        raise ValueError(f"The webpage is larger than the {settings.max_webpage_mb} MB import limit.")

                encoding = response.encoding or "utf-8"
                return bytes(content).decode(encoding, errors="replace")

        raise ValueError("The webpage redirected too many times.")


def extract_webpage_import_content(html: str, url: str, provided_book_title: str | None = None) -> WebpageImportContent:
    soup = BeautifulSoup(html, "html.parser")

    for element in soup(NOISE_TAGS):
        element.decompose()

    container = _select_best_content_container(soup)
    title = (provided_book_title or "").strip() or _extract_title(soup, container, url)
    text = _extract_container_text(container, title=title)
    if not text:
        raise ValueError("No readable main text could be extracted from the webpage.")

    chapter_payloads = split_txt_into_chapters(text, fallback_title=title)
    return WebpageImportContent(title=title, chapter_payloads=chapter_payloads)


def _select_best_content_container(soup: BeautifulSoup) -> Tag:
    candidates = [candidate for selector in CONTENT_SELECTORS for candidate in soup.select(selector)]
    if not candidates and soup.body:
        return soup.body
    if not candidates:
        raise ValueError("The webpage did not contain a readable body.")

    best_candidate: Tag | None = None
    best_score = -1

    for candidate in candidates:
        score = _score_candidate(candidate)
        if score > best_score:
            best_candidate = candidate
            best_score = score

    if best_candidate is None:
        raise ValueError("No readable main text could be extracted from the webpage.")

    return best_candidate


def _score_candidate(candidate: Tag) -> int:
    blocks = _collect_blocks(candidate)
    if not blocks:
        return 0

    text_length = sum(len(block) for block in blocks)
    paragraph_bonus = len(blocks) * 80
    heading_bonus = sum(120 for heading in candidate.find_all(("h1", "h2", "h3")) if heading.get_text(strip=True))
    return text_length + paragraph_bonus + heading_bonus


def _extract_container_text(container: Tag, title: str) -> str:
    blocks = _collect_blocks(container)
    deduped_blocks: list[str] = []
    previous_block = ""

    for block in blocks:
        if block == previous_block:
            continue
        deduped_blocks.append(block)
        previous_block = block

    if deduped_blocks and deduped_blocks[0] == title:
        deduped_blocks = deduped_blocks[1:]

    return "\n\n".join(deduped_blocks).strip()


def _collect_blocks(container: Tag) -> list[str]:
    blocks: list[str] = []
    for element in container.find_all(BLOCK_TAGS):
        if _should_skip_block(element):
            continue

        text = element.get_text(" ", strip=True)
        normalized = " ".join(text.split())
        if len(normalized) < 2:
            continue
        blocks.append(normalized)

    return blocks


def _should_skip_block(element: Tag) -> bool:
    if element.find_parent(NOISE_TAGS):
        return True

    classes = " ".join(element.get("class", [])).lower()
    identifiers = (element.get("id") or "").lower()
    noisy_markers = ("nav", "menu", "breadcrumb", "share", "comment", "footer", "header", "sidebar", "related")
    return any(marker in classes or marker in identifiers for marker in noisy_markers)


def _extract_title(soup: BeautifulSoup, container: Tag, url: str) -> str:
    meta_title = soup.find("meta", property="og:title")
    if meta_title and meta_title.get("content"):
        return meta_title["content"].strip()

    heading = container.find(("h1", "h2"))
    if heading and heading.get_text(strip=True):
        return heading.get_text(strip=True)

    if soup.title and soup.title.string:
        title = soup.title.string.strip()
        if title:
            return title

    parsed_url = urlparse(url)
    return parsed_url.netloc or "Imported Webpage"
