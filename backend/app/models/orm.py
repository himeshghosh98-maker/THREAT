from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from datetime import datetime


class Base(DeclarativeBase):
    pass


class ReportRow(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    classification: Mapped[str] = mapped_column(String(32), index=True)
    report: Mapped[dict] = mapped_column(JSON)
    receipt: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)


class FeedSnapshot(Base):
    __tablename__ = "feed_snapshots"

    source: Mapped[str] = mapped_column(String(40), primary_key=True)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    entries: Mapped[dict] = mapped_column(JSON)
