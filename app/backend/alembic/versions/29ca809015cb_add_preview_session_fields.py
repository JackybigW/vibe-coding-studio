"""add_preview_session_fields

Revision ID: 29ca809015cb
Revises: 563d9c23867f
Create Date: 2026-04-21 12:27:43.793743

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "29ca809015cb"
down_revision: Union[str, Sequence[str], None] = "563d9c23867f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "workspace_runtime_sessions"
PREVIEW_INDEX = "ix_workspace_runtime_sessions_preview_session_key"


def _table_exists(inspector: sa.Inspector) -> bool:
    return TABLE_NAME in inspector.get_table_names()


def _column_names(inspector: sa.Inspector) -> set[str]:
    return {column["name"] for column in inspector.get_columns(TABLE_NAME)}


def _index_names(inspector: sa.Inspector) -> set[str]:
    return {index["name"] for index in inspector.get_indexes(TABLE_NAME)}


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector):
        op.create_table(
            TABLE_NAME,
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("project_id", sa.Integer(), nullable=False),
            sa.Column("container_name", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("preview_port", sa.Integer(), nullable=True),
            sa.Column("frontend_port", sa.Integer(), nullable=True),
            sa.Column("backend_port", sa.Integer(), nullable=True),
            sa.Column("preview_session_key", sa.String(), nullable=True),
            sa.Column("preview_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("frontend_status", sa.String(), nullable=True),
            sa.Column("backend_status", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "project_id", name="uq_workspace_runtime_sessions_user_project"),
        )
        op.create_index(op.f("ix_workspace_runtime_sessions_id"), TABLE_NAME, ["id"], unique=False)
        op.create_index(PREVIEW_INDEX, TABLE_NAME, ["preview_session_key"], unique=False)
        return

    existing_columns = _column_names(inspector)
    new_columns = [
        ("preview_session_key", sa.Column("preview_session_key", sa.String(), nullable=True)),
        ("preview_expires_at", sa.Column("preview_expires_at", sa.DateTime(timezone=True), nullable=True)),
        ("frontend_status", sa.Column("frontend_status", sa.String(), nullable=True)),
        ("backend_status", sa.Column("backend_status", sa.String(), nullable=True)),
    ]
    for column_name, column in new_columns:
        if column_name not in existing_columns:
            op.add_column(TABLE_NAME, column)

    inspector = sa.inspect(bind)
    if PREVIEW_INDEX not in _index_names(inspector):
        op.create_index(PREVIEW_INDEX, TABLE_NAME, ["preview_session_key"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not _table_exists(inspector):
        return

    if PREVIEW_INDEX in _index_names(inspector):
        op.drop_index(PREVIEW_INDEX, table_name=TABLE_NAME)

    existing_columns = _column_names(sa.inspect(bind))
    columns_to_drop = [
        "backend_status",
        "frontend_status",
        "preview_expires_at",
        "preview_session_key",
    ]
    for column_name in columns_to_drop:
        if column_name in existing_columns:
            with op.batch_alter_table(TABLE_NAME) as batch_op:
                batch_op.drop_column(column_name)
            existing_columns.remove(column_name)
