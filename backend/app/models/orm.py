from sqlalchemy import JSON, DateTime, String, ForeignKey, Index
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


class IndicatorRow(Base):
    __tablename__ = "indicators"
    __table_args__ = (Index("ix_indicators_match", "type", "value", "report_id"),)

    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), primary_key=True)
    type: Mapped[str] = mapped_column(String(32), primary_key=True)
    value: Mapped[str] = mapped_column(String(255), primary_key=True)


class CorrelationSalt(Base):
    __tablename__ = "correlation_salt"

    id: Mapped[int] = mapped_column(primary_key=True)
    salt: Mapped[str] = mapped_column(String(64))
