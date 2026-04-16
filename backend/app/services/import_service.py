from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.book import Book
from app.models.chapter import Chapter
from app.schemas.imports import ImportResponse
from app.utils.epub import extract_epub_contents
from app.utils.text_import import decode_txt_bytes, infer_book_title_from_filename, split_txt_into_chapters
from app.utils.webpage_import import extract_webpage_import_content, fetch_webpage_html


@dataclass
class ImportServiceError(Exception):
    message: str
    status_code: int = 400


def _sanitize_filename(filename: str) -> str:
    safe_name = "".join(character for character in filename if character.isalnum() or character in {".", "-", "_"})
    return safe_name or "upload.bin"


def _build_upload_destination(filename: str) -> Path:
    imports_directory = settings.uploads_dir / "imports"
    imports_directory.mkdir(parents=True, exist_ok=True)
    return imports_directory / f"{uuid4().hex}_{_sanitize_filename(filename)}"


def _create_book_with_chapters(db: Session, book_title: str, chapter_payloads: list[dict[str, str]]) -> ImportResponse:
    if not chapter_payloads:
        raise ImportServiceError("No readable chapter content was found in the uploaded file.", status_code=400)

    book = Book(title=book_title)
    db.add(book)
    db.flush()

    chapters: list[Chapter] = []
    for index, chapter_payload in enumerate(chapter_payloads, start=1):
        chapter = Chapter(
            book_id=book.id,
            index_in_book=index,
            title=chapter_payload["title"],
            source_text=chapter_payload["source_text"],
        )
        db.add(chapter)
        chapters.append(chapter)

    db.commit()

    for chapter in chapters:
        db.refresh(chapter)

    return ImportResponse(
        book_id=book.id,
        book_title=book.title,
        chapter_count=len(chapters),
        chapters=chapters,
    )


async def _save_upload(upload: UploadFile) -> bytes:
    if not upload.filename:
        raise ImportServiceError("The uploaded file must have a filename.", status_code=400)

    content = await upload.read()
    destination = _build_upload_destination(upload.filename)
    destination.write_bytes(content)
    return content


async def import_txt_file(
    db: Session,
    upload: UploadFile,
    provided_book_title: str | None,
) -> ImportResponse:
    filename = upload.filename or ""
    if not filename.lower().endswith(".txt"):
        raise ImportServiceError("Please upload a .txt file.", status_code=400)

    content = await _save_upload(upload)
    try:
        decoded_text = decode_txt_bytes(content)
    except ValueError as exc:
        raise ImportServiceError(str(exc), status_code=400) from exc
    book_title = (provided_book_title or "").strip() or infer_book_title_from_filename(filename)
    chapter_payloads = split_txt_into_chapters(decoded_text, fallback_title=book_title)
    return _create_book_with_chapters(db, book_title=book_title, chapter_payloads=chapter_payloads)


async def import_epub_file(
    db: Session,
    upload: UploadFile,
    provided_book_title: str | None,
) -> ImportResponse:
    filename = upload.filename or ""
    if not filename.lower().endswith(".epub"):
        raise ImportServiceError("Please upload an .epub file.", status_code=400)

    content = await _save_upload(upload)
    try:
        extracted_book_title, chapter_payloads = extract_epub_contents(
            content,
            fallback_title=infer_book_title_from_filename(filename),
        )
    except ValueError as exc:
        raise ImportServiceError(str(exc), status_code=400) from exc
    book_title = (provided_book_title or "").strip() or extracted_book_title
    return _create_book_with_chapters(db, book_title=book_title, chapter_payloads=chapter_payloads)


async def import_webpage_url(
    db: Session,
    url: str,
    provided_book_title: str | None,
) -> ImportResponse:
    try:
        html = await fetch_webpage_html(url)
        imported_content = extract_webpage_import_content(html, url=url, provided_book_title=provided_book_title)
    except httpx.HTTPError as exc:
        raise ImportServiceError(f"Failed to fetch the webpage: {exc}") from exc
    except ValueError as exc:
        raise ImportServiceError(str(exc), status_code=400) from exc

    return _create_book_with_chapters(
        db,
        book_title=imported_content.title,
        chapter_payloads=imported_content.chapter_payloads,
    )
