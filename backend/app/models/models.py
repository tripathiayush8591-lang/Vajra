from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Ward(Base):
    __tablename__ = "wards"

    id: Mapped[int] = mapped_column(primary_key=True)
    ward_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    ward_name: Mapped[str] = mapped_column(String(100), nullable=False)
    zone_name: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    population_estimate: Mapped[int] = mapped_column(Integer, default=35000)
    infra_gap_index: Mapped[float] = mapped_column(Float, default=0.5)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="ward")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True)
    tracking_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    submission_id: Mapped[str] = mapped_column(String(32), nullable=False, default="", index=True)
    channel: Mapped[str] = mapped_column(String(20), default="text")
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_language: Mapped[str] = mapped_column(String(30), default="English")
    standardized_summary: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="Other")
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    severity_score: Mapped[int] = mapped_column(Integer, default=3)
    urgency_level: Mapped[str] = mapped_column(String(20), default="Medium")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    ward_id: Mapped[int] = mapped_column(ForeignKey("wards.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="Reported")
    citizen_phone_masked: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cluster_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    ai_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    ward: Mapped["Ward"] = relationship(back_populates="complaints")


class Hotspot(Base):
    __tablename__ = "demand_hotspots"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    ward_id: Mapped[int] = mapped_column(ForeignKey("wards.id"), nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, default=250.0)
    complaint_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_severity: Mapped[float] = mapped_column(Float, default=0.0)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_summary: Mapped[str] = mapped_column(Text, default="")
    temporal: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sample_audio_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    ward: Mapped["Ward"] = relationship()
    actions: Mapped[list["AdminAction"]] = relationship(back_populates="hotspot")


class AdminAction(Base):
    __tablename__ = "admin_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    hotspot_id: Mapped[int] = mapped_column(ForeignKey("demand_hotspots.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    officer_name: Mapped[str] = mapped_column(String(100), default="Municipal Officer")
    budget_allocated: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    hotspot: Mapped["Hotspot"] = relationship(back_populates="actions")
