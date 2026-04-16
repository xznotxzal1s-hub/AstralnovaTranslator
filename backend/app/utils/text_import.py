from pathlib import Path
import re

FALLBACK_SPLIT_TARGET = 3200
FALLBACK_SPLIT_HARD_LIMIT = 4200


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
    has_heading = any(heading_pattern.match(line.strip()) for line in lines)

    if not has_heading:
        return _split_txt_with_fallback_parts(normalized_text)

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


def _split_txt_with_fallback_parts(normalized_text: str) -> list[dict[str, str]]:
    paragraphs = [paragraph.strip() for paragraph in normalized_text.split("\n\n") if paragraph.strip()]
    chunks: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def flush_current_parts() -> None:
        nonlocal current_parts, current_length
        if current_parts:
            chunks.append("\n\n".join(current_parts).strip())
            current_parts = []
            current_length = 0

    for paragraph in paragraphs:
        paragraph_chunks = _split_large_paragraph(paragraph)
        for paragraph_chunk in paragraph_chunks:
            additional_length = len(paragraph_chunk) if not current_parts else len(paragraph_chunk) + 2
            if current_parts and current_length + additional_length > FALLBACK_SPLIT_TARGET:
                flush_current_parts()

            current_parts.append(paragraph_chunk)
            current_length += additional_length

            if current_length >= FALLBACK_SPLIT_HARD_LIMIT:
                flush_current_parts()

    flush_current_parts()

    if not chunks:
        return []

    return [
        {
            "title": f"第{index}部分",
            "source_text": chunk,
        }
        for index, chunk in enumerate(chunks, start=1)
        if chunk.strip()
    ]


def _split_large_paragraph(paragraph: str) -> list[str]:
    if len(paragraph) <= FALLBACK_SPLIT_HARD_LIMIT:
        return [paragraph]

    sentence_pattern = re.compile(r"(?<=[。！？!?])")
    sentences = [sentence.strip() for sentence in sentence_pattern.split(paragraph) if sentence.strip()]
    if len(sentences) <= 1:
        return _split_text_by_length(paragraph, FALLBACK_SPLIT_TARGET)

    chunks: list[str] = []
    current_chunk = ""

    for sentence in sentences:
        candidate = sentence if not current_chunk else f"{current_chunk}{sentence}"
        if len(candidate) <= FALLBACK_SPLIT_TARGET:
            current_chunk = candidate
            continue

        if current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = ""

        if len(sentence) <= FALLBACK_SPLIT_HARD_LIMIT:
            current_chunk = sentence
            continue

        chunks.extend(_split_text_by_length(sentence, FALLBACK_SPLIT_TARGET))

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def _split_text_by_length(text: str, target_length: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + target_length, len(text))
        chunks.append(text[start:end].strip())
        start = end
    return [chunk for chunk in chunks if chunk]
