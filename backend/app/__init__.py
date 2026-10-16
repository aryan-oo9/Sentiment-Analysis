from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import Config
from .database import init_db
from .routers.auth_routes import auth_router
from .routers.project_routes import project_router
from .routers.comment_routes import comment_router
from .routers.insight_routes import insight_router
from .routers.llm_routes import llm_router
from .routers.public_routes import public_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title="TweetSense API",
        description="AI Sentiment Analysis & Feedback Intelligence API",
        version="2.0.0",
        lifespan=lifespan
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=Config.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(public_router)
    app.include_router(auth_router)
    app.include_router(project_router)
    app.include_router(comment_router)
    app.include_router(insight_router)
    app.include_router(llm_router)

    # Standard JSON error responses to maintain identical API contract
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "message": exc.detail,
                "data": None
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        first_err = exc.errors()[0] if exc.errors() else {"msg": "Validation error"}
        msg = first_err.get("msg", "Invalid payload")
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": msg,
                "data": None
            }
        )

    return app

app = create_app()
