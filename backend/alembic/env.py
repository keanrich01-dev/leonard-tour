from alembic import context
from sqlalchemy import create_engine

from app.core.config import settings
from app.core.db import Base
import app.models  # noqa: F401

target_metadata = Base.metadata


def run_migrations_online():
    migration_url = settings.direct_database_url or settings.database_url
    engine = create_engine(migration_url, pool_pre_ping=True)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
