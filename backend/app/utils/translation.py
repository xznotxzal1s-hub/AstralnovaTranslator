from hashlib import sha256
import re


SENTENCE_ENDINGS = {"。", "！", "？", "!", "?"}
OPENING_MARKS = {"「", "『", "（", "(", "【", "《", "〈", "［", "[", "｛", "{"}
CLOSING_MARKS = {"」", "』", "）", ")", "】", "》", "〉", "］", "]", "｝", "}"}
ELLIPSIS_MARKS = {"…", "‥"}


def build_prompt(
    prompt_template: str,
    source_text: str,
    translation_mode: str,
    glossary_guidance: str,
) -> str:
    try:
        prompt = prompt_template.format(
            source_text=source_text,
            translation_mode=translation_mode,
            glossary_guidance=glossary_guidance,
        )
    except KeyError:
        if glossary_guidance:
            return (
                f"{prompt_template}\n\nTranslation mode: {translation_mode}\n\n"
                f"{glossary_guidance}\n\nJapanese text:\n{source_text}"
            )
        return f"{prompt_template}\n\nTranslation mode: {translation_mode}\n\nJapanese text:\n{source_text}"

    if glossary_guidance and "{glossary_guidance}" not in prompt_template:
        prompt = f"{prompt}\n\n{glossary_guidance}"

    return prompt


def build_glossary_guidance(
    glossary_entries: list[dict[str, str | None]],
) -> str:
    if not glossary_entries:
        return ""

    lines = [
        "Glossary guidance:",
        "Use the preferred translations below when the terms appear. Keep wording consistent.",
    ]

    for entry in glossary_entries:
        note_suffix = f" (note: {entry['note']})" if entry.get("note") else ""
        lines.append(f"- {entry['source_term']} => {entry['target_term']}{note_suffix}")

    return "\n".join(lines)


def split_text_into_chunks(source_text: str, chunk_size: int) -> list[str]:
    normalized_text = source_text.strip()
    if not normalized_text:
        return []

    safe_chunk_size = max(1, chunk_size)

    if len(normalized_text) <= safe_chunk_size:
        return [normalized_text]

    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", normalized_text) if paragraph.strip()]
    chunks: list[str] = []
    current_chunk = ""

    def flush_current_chunk() -> None:
        nonlocal current_chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        current_chunk = ""

    def append_unit(unit: str, separator: str = "\n\n") -> None:
        nonlocal current_chunk
        normalized_unit = unit.strip()
        if not normalized_unit:
            return

        if len(normalized_unit) > safe_chunk_size:
            flush_current_chunk()
            chunks.extend(_hard_split_text(normalized_unit, safe_chunk_size))
            return

        candidate = normalized_unit if not current_chunk else f"{current_chunk}{separator}{normalized_unit}"
        if len(candidate) <= safe_chunk_size:
            current_chunk = candidate
        else:
            flush_current_chunk()
            current_chunk = normalized_unit

    for paragraph in paragraphs:
        if len(paragraph) <= safe_chunk_size:
            append_unit(paragraph)
            continue

        for sentence_index, sentence in enumerate(_split_japanese_sentences(paragraph)):
            append_unit(sentence, separator="\n\n" if sentence_index == 0 else "")

    if current_chunk:
        flush_current_chunk()

    return [chunk for chunk in chunks if chunk.strip()] or [normalized_text]


def _split_japanese_sentences(text: str) -> list[str]:
    sentences: list[str] = []
    start = 0
    index = 0
    quote_depth = 0

    while index < len(text):
        char = text[index]
        if char in OPENING_MARKS:
            quote_depth += 1
            index += 1
            continue
        if char in CLOSING_MARKS and quote_depth > 0:
            quote_depth -= 1

        should_split = char in SENTENCE_ENDINGS
        if char in ELLIPSIS_MARKS:
            should_split = True
            while index + 1 < len(text) and text[index + 1] in ELLIPSIS_MARKS:
                index += 1

        if should_split:
            end = index + 1
            while end < len(text) and text[end] in CLOSING_MARKS:
                end += 1
            if quote_depth > 0 and end == index + 1:
                index += 1
                continue
            for mark in text[index + 1 : end]:
                if mark in CLOSING_MARKS and quote_depth > 0:
                    quote_depth -= 1
            sentence = text[start:end].strip()
            if sentence:
                sentences.append(sentence)
            start = end
            index = end
            continue

        index += 1

    tail = text[start:].strip()
    if tail:
        sentences.append(tail)

    return sentences or [text.strip()]


def _hard_split_text(text: str, chunk_size: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end
    return chunks


def calculate_source_hash(source_text: str) -> str:
    return sha256(source_text.encode("utf-8")).hexdigest()


def calculate_text_hash(text: str) -> str:
    return sha256(text.encode("utf-8")).hexdigest()
