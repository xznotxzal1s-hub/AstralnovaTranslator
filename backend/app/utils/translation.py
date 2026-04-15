from hashlib import sha256


def build_prompt(
    prompt_template: str,
    source_text: str,
    translation_mode: str,
    glossary_guidance: str,
) -> str:
    try:
        return prompt_template.format(
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
    if len(normalized_text) <= chunk_size:
        return [normalized_text]

    paragraphs = [paragraph.strip() for paragraph in normalized_text.split("\n\n") if paragraph.strip()]
    chunks: list[str] = []
    current_chunk = ""

    for paragraph in paragraphs:
        candidate = paragraph if not current_chunk else f"{current_chunk}\n\n{paragraph}"
        if len(candidate) <= chunk_size:
            current_chunk = candidate
            continue

        if current_chunk:
            chunks.append(current_chunk)
            current_chunk = ""

        if len(paragraph) <= chunk_size:
            current_chunk = paragraph
            continue

        start = 0
        while start < len(paragraph):
            end = start + chunk_size
            chunks.append(paragraph[start:end])
            start = end

    if current_chunk:
        chunks.append(current_chunk)

    return chunks or [normalized_text]


def calculate_source_hash(source_text: str) -> str:
    return sha256(source_text.encode("utf-8")).hexdigest()


def calculate_text_hash(text: str) -> str:
    return sha256(text.encode("utf-8")).hexdigest()
