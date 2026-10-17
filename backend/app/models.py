import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    corrections = relationship("Correction", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=True)
    neutral_band = Column(Float, default=0.10, nullable=False)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    comments = relationship("Comment", back_populates="project", cascade="all, delete-orphan")
    themes = relationship("Theme", back_populates="project", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="project", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), default="paste", nullable=False)
    text = Column(Text, nullable=False)
    posted_at = Column(DateTime, default=utcnow, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    project = relationship("Project", back_populates="comments")
    analysis = relationship("Analysis", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    correction = relationship("Correction", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    ticket = relationship("Ticket", back_populates="comment", uselist=False, cascade="all, delete-orphan")
    reply_drafts = relationship("ReplyDraft", back_populates="comment", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"

    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True)
    sentiment = Column(String(20), nullable=False)  # Positive, Negative, Neutral
    confidence = Column(Float, nullable=False)
    polarity = Column(Float, nullable=False)
    priority = Column(String(30), nullable=False)   # High Priority, Medium Priority, Low Priority
    priority_reason = Column(Text, nullable=True)
    priority_source = Column(String(20), default="rules")  # llm or rules
    top_words_json = Column(Text, default="{}", nullable=False)
    latency_ms = Column(Float, default=0.0)
    model_version = Column(String(50), default="v2.0-linear")

    comment = relationship("Comment", back_populates="analysis")

    @property
    def top_words(self):
        try:
            return json.loads(self.top_words_json)
        except Exception:
            return {"negative": [], "positive": []}

    @top_words.setter
    def top_words(self, value):
        self.top_words_json = json.dumps(value)

class Correction(Base):
    __tablename__ = "corrections"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    corrected_sentiment = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    comment = relationship("Comment", back_populates="correction")
    user = relationship("User", back_populates="corrections")

class Theme(Base):
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(255), nullable=False)
    keywords_json = Column(Text, default="[]", nullable=False)
    size = Column(Integer, default=0)
    representative_comments_json = Column(Text, default="[]", nullable=False)

    project = relationship("Project", back_populates="themes")

    @property
    def keywords(self):
        try:
            return json.loads(self.keywords_json)
        except Exception:
            return []

    @keywords.setter
    def keywords(self, value):
        self.keywords_json = json.dumps(value)

    @property
    def representative_comments(self):
        try:
            return json.loads(self.representative_comments_json)
        except Exception:
            return []

    @representative_comments.setter
    def representative_comments(self, value):
        self.representative_comments_json = json.dumps(value)

class Ticket(Base):
    __tablename__ = "tickets"

    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(30), default="New", nullable=False)  # New, In progress, Resolved
    note = Column(Text, nullable=True)
    position = Column(Integer, default=0)

    comment = relationship("Comment", back_populates="ticket")

class ReplyDraft(Base):
    __tablename__ = "reply_drafts"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, index=True)
    tone = Column(String(30), default="warm", nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(30), default="draft", nullable=False)  # draft, approved, copied
    created_at = Column(DateTime, default=utcnow, nullable=False)

    comment = relationship("Comment", back_populates="reply_drafts")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(50), nullable=False)  # clustering, ingest, briefing
    status = Column(String(30), default="pending", nullable=False)  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    project = relationship("Project", back_populates="jobs")
 
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")
