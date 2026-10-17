from typing import List, Optional
from pydantic import BaseModel, Field

EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

class RegisterSchema(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="Valid email address")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class LoginSchema(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="Valid email address")
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str = Field(..., pattern=EMAIL_REGEX, description="Valid email address")

class ResetPasswordSchema(BaseModel):
    token: str = Field(..., min_length=16, description="Cryptographic reset token")
    new_password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class ProjectCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=500)
    neutral_band: Optional[float] = Field(default=0.10, ge=0.0, le=0.5)

class ProjectUpdateSchema(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    neutral_band: Optional[float] = Field(default=None, ge=0.0, le=0.5)

class SingleCommentItem(BaseModel):
    text: str = Field(..., min_length=2, max_length=2000)
    source: Optional[str] = Field(default="paste")

class IngestCommentsSchema(BaseModel):
    comments: List[SingleCommentItem] = Field(..., min_length=1, max_length=500)

class CorrectionSchema(BaseModel):
    corrected_sentiment: str = Field(..., pattern="^(Positive|Negative|Neutral)$")

class TicketUpdateSchema(BaseModel):
    status: str = Field(..., pattern="^(New|In progress|Resolved)$")
    note: Optional[str] = None

class ReplyDraftRequestSchema(BaseModel):
    tone: Optional[str] = Field(default="warm", pattern="^(warm|brief|formal)$")

class ReplyDraftUpdateSchema(BaseModel):
    body: str
    status: str = Field(..., pattern="^(draft|approved|copied)$")

class DemoAnalyzeSchema(BaseModel):
    text: str = Field(..., min_length=2, max_length=1000)

class PullRequestSchema(BaseModel):
    source: str = Field(..., pattern="^hn$")
    query: str = Field(..., min_length=1, max_length=100)
    limit: Optional[int] = Field(20, ge=1, le=50)

