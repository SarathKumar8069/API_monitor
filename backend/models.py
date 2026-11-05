
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, func
from sqlalchemy.dialects.mysql import CHAR
import uuid
from sqlalchemy import ForeignKey, Float, Text


# Base class for all database models
class Base(DeclarativeBase):
    pass


# Monitor database model
class Monitor(Base):

    __tablename__ = "monitors"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    url: Mapped[str] = mapped_column(
        String(2048),
        nullable=False
    )

    method: Mapped[str] = mapped_column(
        String(10),
        default="GET"
    )

    interval_seconds: Mapped[int] = mapped_column(
        Integer,
        default=60
    )

    timeout_seconds: Mapped[int] = mapped_column(
        Integer,
        default=10
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now()
    )




class CheckResult(Base):
    __tablename__ = "check_results"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    monitor_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("monitors.id", ondelete="CASCADE"),
        nullable=False
    )

    status_code: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    response_time_ms: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    is_success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    checked_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now()
    )
