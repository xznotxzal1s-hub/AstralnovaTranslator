from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.uploads_dir.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def ensure_schema() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        glossary_table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='glossary_entries'",
        ).first()
        if glossary_table is None:
            return

        columns = connection.exec_driver_sql("PRAGMA table_info(glossary_entries)").fetchall()
        column_names = {column[1] for column in columns}
        if "book_id" not in column_names:
            connection.exec_driver_sql("ALTER TABLE glossary_entries ADD COLUMN book_id INTEGER")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
