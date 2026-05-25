from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import Engine
from sqlalchemy.engine import Connection


@dataclass(frozen=True)
class SchemaMigration:
    version: str
    description: str
    apply: Callable[[Connection], None]


def _table_exists(connection: Connection, table_name: str) -> bool:
    return (
        connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        ).first()
        is not None
    )


def _column_names(connection: Connection, table_name: str) -> set[str]:
    columns = connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()
    return {column[1] for column in columns}


def _normalize_chapter_indexes(connection: Connection) -> None:
    if not _table_exists(connection, "chapters"):
        return

    chapter_rows = connection.exec_driver_sql(
        "SELECT id, book_id FROM chapters ORDER BY book_id ASC, index_in_book ASC, created_at ASC, id ASC",
    ).fetchall()
    next_indexes: dict[int, int] = {}
    for chapter_id, book_id in chapter_rows:
        next_index = next_indexes.get(book_id, 1)
        connection.exec_driver_sql(
            "UPDATE chapters SET index_in_book = ? WHERE id = ?",
            (next_index, chapter_id),
        )
        next_indexes[book_id] = next_index + 1


def _add_chapter_index_unique_constraint(connection: Connection) -> None:
    if not _table_exists(connection, "chapters"):
        return

    _normalize_chapter_indexes(connection)
    connection.exec_driver_sql(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_chapters_book_index ON chapters (book_id, index_in_book)",
    )


def _add_translation_record_cache_unique_constraint(connection: Connection) -> None:
    if not _table_exists(connection, "translation_records"):
        return

    connection.exec_driver_sql(
        """
        DELETE FROM translation_records
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM translation_records
            GROUP BY chapter_id, provider_type, model_name, prompt_hash, source_hash
        )
        """,
    )
    connection.exec_driver_sql(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_translation_records_cache_key
        ON translation_records (chapter_id, provider_type, model_name, prompt_hash, source_hash)
        """,
    )


def _add_glossary_book_scope(connection: Connection) -> None:
    if not _table_exists(connection, "glossary_entries"):
        return

    if "book_id" not in _column_names(connection, "glossary_entries"):
        connection.exec_driver_sql("ALTER TABLE glossary_entries ADD COLUMN book_id INTEGER")


def _add_translation_preset_fields(connection: Connection) -> None:
    if not _table_exists(connection, "translation_configs"):
        return

    translation_column_names = _column_names(connection, "translation_configs")
    if "name" not in translation_column_names:
        connection.exec_driver_sql(
            "ALTER TABLE translation_configs ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '默认预设'",
        )
    if "is_active" not in translation_column_names:
        connection.exec_driver_sql(
            "ALTER TABLE translation_configs ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 0",
        )

    active_count = connection.exec_driver_sql(
        "SELECT COUNT(*) FROM translation_configs WHERE is_active = 1",
    ).scalar_one()
    if active_count == 0:
        connection.exec_driver_sql(
            "UPDATE translation_configs SET is_active = 1 WHERE id = (SELECT id FROM translation_configs ORDER BY id ASC LIMIT 1)",
        )


def _create_translation_jobs_table(connection: Connection) -> None:
    connection.exec_driver_sql(
        """
        CREATE TABLE IF NOT EXISTS translation_jobs (
            id INTEGER NOT NULL PRIMARY KEY,
            book_id INTEGER,
            chapter_id INTEGER,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            total_items INTEGER NOT NULL DEFAULT 0,
            completed_items INTEGER NOT NULL DEFAULT 0,
            current_item_label VARCHAR(255),
            error_message TEXT,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE,
            FOREIGN KEY(chapter_id) REFERENCES chapters (id) ON DELETE CASCADE
        )
        """,
    )
    connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_translation_jobs_book_id ON translation_jobs (book_id)")
    connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_translation_jobs_chapter_id ON translation_jobs (chapter_id)")


def _create_reading_progress_table(connection: Connection) -> None:
    connection.exec_driver_sql(
        """
        CREATE TABLE IF NOT EXISTS reading_progress (
            id INTEGER NOT NULL PRIMARY KEY,
            book_id INTEGER NOT NULL,
            chapter_id INTEGER,
            progress_percent INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE,
            FOREIGN KEY(chapter_id) REFERENCES chapters (id) ON DELETE SET NULL
        )
        """,
    )
    connection.exec_driver_sql("CREATE UNIQUE INDEX IF NOT EXISTS uq_reading_progress_book_id ON reading_progress (book_id)")
    connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_reading_progress_chapter_id ON reading_progress (chapter_id)")


def _add_provider_request_options(connection: Connection) -> None:
    if not _table_exists(connection, "translation_configs"):
        return

    translation_column_names = _column_names(connection, "translation_configs")
    if "request_timeout_seconds" not in translation_column_names:
        connection.exec_driver_sql(
            "ALTER TABLE translation_configs ADD COLUMN request_timeout_seconds INTEGER NOT NULL DEFAULT 60",
        )
    if "retry_count" not in translation_column_names:
        connection.exec_driver_sql("ALTER TABLE translation_configs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 1")
    if "retry_backoff_seconds" not in translation_column_names:
        connection.exec_driver_sql(
            "ALTER TABLE translation_configs ADD COLUMN retry_backoff_seconds INTEGER NOT NULL DEFAULT 2",
        )
    if "rate_limit_delay_ms" not in translation_column_names:
        connection.exec_driver_sql(
            "ALTER TABLE translation_configs ADD COLUMN rate_limit_delay_ms INTEGER NOT NULL DEFAULT 0",
        )
    if "temperature" not in translation_column_names:
        connection.exec_driver_sql("ALTER TABLE translation_configs ADD COLUMN temperature FLOAT DEFAULT 0.3")
    if "max_output_tokens" not in translation_column_names:
        connection.exec_driver_sql("ALTER TABLE translation_configs ADD COLUMN max_output_tokens INTEGER")


MIGRATIONS: tuple[SchemaMigration, ...] = (
    SchemaMigration(
        version="001_chapter_index_unique_constraint",
        description="Normalize chapter indexes and add a per-book unique index.",
        apply=_add_chapter_index_unique_constraint,
    ),
    SchemaMigration(
        version="002_translation_record_cache_unique_constraint",
        description="Deduplicate translation records and add the cache-key unique index.",
        apply=_add_translation_record_cache_unique_constraint,
    ),
    SchemaMigration(
        version="003_glossary_book_scope",
        description="Add optional book scope to glossary entries.",
        apply=_add_glossary_book_scope,
    ),
    SchemaMigration(
        version="004_translation_preset_fields",
        description="Add translation preset name and active marker fields.",
        apply=_add_translation_preset_fields,
    ),
    SchemaMigration(
        version="005_translation_jobs",
        description="Add simple persisted translation jobs.",
        apply=_create_translation_jobs_table,
    ),
    SchemaMigration(
        version="006_reading_progress",
        description="Add per-book reading progress.",
        apply=_create_reading_progress_table,
    ),
    SchemaMigration(
        version="007_provider_request_options",
        description="Add advanced provider request options to translation presets.",
        apply=_add_provider_request_options,
    ),
)


def _ensure_migration_table(connection: Connection) -> None:
    connection.exec_driver_sql(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
    )


def _get_applied_versions(connection: Connection) -> set[str]:
    rows = connection.exec_driver_sql("SELECT version FROM schema_migrations").fetchall()
    return {row[0] for row in rows}


def run_schema_migrations(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        _ensure_migration_table(connection)
        applied_versions = _get_applied_versions(connection)
        for migration in MIGRATIONS:
            if migration.version in applied_versions:
                continue

            migration.apply(connection)
            connection.exec_driver_sql(
                "INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
                (migration.version, migration.description),
            )
