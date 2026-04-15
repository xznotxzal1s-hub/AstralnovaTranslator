from pathlib import Path
import re


def infer_book_title_from_filename(filename: str) -> str:
    stem = Path(filename).stem.strip()
    return stem or "Imported Book"


def decode_txt_bytes(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise ValueError("Could not decode the TXT file as UTF-8.")


def split_txt_into_chapters(source_text: str, fallback_title: str) -> list[dict[str, str]]:
    normalized_text = source_text.replace("\r\n", "\n").strip()
    if not normalized_text:
        return []

    heading_pattern = re.compile(r"^(第.+?(?:章|话|話|节|節)|chapter\s+\d+.*)$", re.IGNORECASE)
    lines = normalized_text.split("\n")

    chapter_blocks: list[dict[str, str]] = []
    current_title: str | None = None
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if heading_pattern.match(stripped):
            if current_lines:
                chapter_blocks.append(
                    {
                        "title": current_title or f"{fallback_title} - Part {len(chapter_blocks) + 1}",
                        "source_text": "\n".join(current_lines).strip(),
                    }
                )
                current_lines = []
            current_title = stripped
            continue

        current_lines.append(line)

    if current_lines:
        chapter_blocks.append(
            {
                "title": current_title or f"{fallback_title} - Chapter 1",
                "source_text": "\n".join(current_lines).strip(),
            }
        )

    return [block for block in chapter_blocks if block["source_text"]]
