import os
import unittest
from pathlib import Path

from sqlalchemy import create_engine


_TEST_ROOT = Path(__file__).resolve().parent / ".tmp"
os.environ["DATA_DIR"] = str(_TEST_ROOT / "data")
os.environ["UPLOADS_DIR"] = str(_TEST_ROOT / "uploads")

from app.core.database import Base  # noqa: E402
from app.core.migrations import MIGRATIONS, run_schema_migrations  # noqa: E402


class SchemaMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    def tearDown(self) -> None:
        self.engine.dispose()

    def _applied_versions(self) -> list[str]:
        with self.engine.begin() as connection:
            rows = connection.exec_driver_sql("SELECT version FROM schema_migrations ORDER BY version ASC").fetchall()
        return [row[0] for row in rows]

    def test_run_schema_migrations_records_each_migration_once(self) -> None:
        Base.metadata.create_all(bind=self.engine)

        run_schema_migrations(self.engine)
        first_run_versions = self._applied_versions()
        run_schema_migrations(self.engine)
        second_run_versions = self._applied_versions()

        expected_versions = [migration.version for migration in MIGRATIONS]
        self.assertEqual(first_run_versions, expected_versions)
        self.assertEqual(second_run_versions, expected_versions)

    def test_run_schema_migrations_upgrades_legacy_sqlite_schema(self) -> None:
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                """
                CREATE TABLE chapters (
                    id INTEGER PRIMARY KEY,
                    book_id INTEGER NOT NULL,
                    index_in_book INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    source_text TEXT NOT NULL,
                    created_at DATETIME NOT NULL
                )
                """,
            )
            connection.exec_driver_sql(
                """
                INSERT INTO chapters (id, book_id, index_in_book, title, source_text, created_at)
                VALUES
                    (1, 1, 1, 'First', 'source', '2024-01-01 00:00:00'),
                    (2, 1, 1, 'Duplicate', 'source', '2024-01-02 00:00:00'),
                    (3, 1, 2, 'Third', 'source', '2024-01-03 00:00:00')
                """,
            )
            connection.exec_driver_sql(
                """
                CREATE TABLE translation_records (
                    id INTEGER PRIMARY KEY,
                    chapter_id INTEGER NOT NULL,
                    provider_type VARCHAR(50) NOT NULL,
                    model_name VARCHAR(255) NOT NULL,
                    prompt_hash VARCHAR(128) NOT NULL,
                    source_hash VARCHAR(128) NOT NULL,
                    translated_text TEXT NOT NULL
                )
                """,
            )
            connection.exec_driver_sql(
                """
                INSERT INTO translation_records (
                    id, chapter_id, provider_type, model_name, prompt_hash, source_hash, translated_text
                )
                VALUES
                    (1, 1, 'gemini', 'model', 'prompt', 'source', 'old'),
                    (2, 1, 'gemini', 'model', 'prompt', 'source', 'latest')
                """
            )
            connection.exec_driver_sql(
                """
                CREATE TABLE glossary_entries (
                    id INTEGER PRIMARY KEY,
                    source_term VARCHAR(255) NOT NULL,
                    target_term VARCHAR(255) NOT NULL,
                    note TEXT
                )
                """,
            )
            connection.exec_driver_sql(
                """
                CREATE TABLE translation_configs (
                    id INTEGER PRIMARY KEY,
                    provider_type VARCHAR(50) NOT NULL,
                    api_base_url VARCHAR(500) NOT NULL,
                    model_name VARCHAR(255) NOT NULL,
                    api_key TEXT NOT NULL,
                    prompt_template TEXT NOT NULL,
                    chunk_size INTEGER NOT NULL,
                    translation_mode VARCHAR(50) NOT NULL,
                    updated_at DATETIME NOT NULL
                )
                """,
            )
            connection.exec_driver_sql(
                """
                INSERT INTO translation_configs (
                    id, provider_type, api_base_url, model_name, api_key, prompt_template,
                    chunk_size, translation_mode, updated_at
                )
                VALUES (
                    1, 'openai_compatible', 'https://example.com/v1', 'model', '',
                    'Translate {source_text}', 1500, 'natural', '2024-01-01 00:00:00'
                )
                """,
            )

        run_schema_migrations(self.engine)

        with self.engine.begin() as connection:
            chapter_indexes = connection.exec_driver_sql(
                "SELECT index_in_book FROM chapters ORDER BY id ASC",
            ).fetchall()
            chapter_index_names = {
                row[1] for row in connection.exec_driver_sql("PRAGMA index_list(chapters)").fetchall()
            }
            translation_records = connection.exec_driver_sql(
                "SELECT id, translated_text FROM translation_records",
            ).fetchall()
            translation_index_names = {
                row[1] for row in connection.exec_driver_sql("PRAGMA index_list(translation_records)").fetchall()
            }
            glossary_columns = {
                row[1] for row in connection.exec_driver_sql("PRAGMA table_info(glossary_entries)").fetchall()
            }
            translation_config_columns = {
                row[1] for row in connection.exec_driver_sql("PRAGMA table_info(translation_configs)").fetchall()
            }
            active_count = connection.exec_driver_sql(
                "SELECT COUNT(*) FROM translation_configs WHERE is_active = 1",
            ).scalar_one()
            reading_progress_columns = {
                row[1] for row in connection.exec_driver_sql("PRAGMA table_info(reading_progress)").fetchall()
            }
            reading_progress_index_names = {
                row[1] for row in connection.exec_driver_sql("PRAGMA index_list(reading_progress)").fetchall()
            }

        self.assertEqual([row[0] for row in chapter_indexes], [1, 2, 3])
        self.assertIn("uq_chapters_book_index", chapter_index_names)
        self.assertEqual(translation_records, [(2, "latest")])
        self.assertIn("uq_translation_records_cache_key", translation_index_names)
        self.assertIn("book_id", glossary_columns)
        self.assertIn("name", translation_config_columns)
        self.assertIn("is_active", translation_config_columns)
        self.assertEqual(active_count, 1)
        self.assertIn("book_id", reading_progress_columns)
        self.assertIn("chapter_id", reading_progress_columns)
        self.assertIn("progress_percent", reading_progress_columns)
        self.assertIn("uq_reading_progress_book_id", reading_progress_index_names)
        self.assertIn("request_timeout_seconds", translation_config_columns)
        self.assertIn("retry_count", translation_config_columns)
        self.assertIn("retry_backoff_seconds", translation_config_columns)
        self.assertIn("rate_limit_delay_ms", translation_config_columns)
        self.assertIn("temperature", translation_config_columns)
        self.assertIn("max_output_tokens", translation_config_columns)
        with self.engine.begin() as connection:
            provider_options = connection.exec_driver_sql(
                """
                SELECT request_timeout_seconds, retry_count, retry_backoff_seconds,
                       rate_limit_delay_ms, temperature, max_output_tokens
                FROM translation_configs WHERE id = 1
                """,
            ).first()
        self.assertEqual(provider_options, (60, 1, 2, 0, 0.3, None))
        self.assertEqual(self._applied_versions(), [migration.version for migration in MIGRATIONS])


if __name__ == "__main__":
    unittest.main()
