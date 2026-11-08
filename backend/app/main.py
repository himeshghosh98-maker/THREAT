import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api import routes_health, routes_intel, routes_reports, routes_scan
from app.core.config import Settings
from app.core.db import open_database
from app.web3.registry import ChainUnavailable, NotPublished
from app.models.schemas import ErrorDetail, ErrorResponse


def error(status: int, code: str, message: str, headers=None):
    body = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()

    @asynccontextmanager
    async def lifespan(app):
        # Uvicorn access logs include query strings on both successful and failed requests.
        logging.getLogger("uvicorn.access").disabled = True
        for name in ("httpx", "httpcore", "slowapi", "anthropic", "openai", "google_genai", "web3", "urllib3"):
            logging.getLogger(name).setLevel(logging.ERROR)
        app.state.engine = open_database(settings.database_url)
        try:
            yield
        finally:
            app.state.engine.dispose()

    app = FastAPI(lifespan=lifespan)
    app.state.settings = settings
    app.state.limiter = routes_scan.limiter
    app.add_middleware(CORSMiddleware, allow_origins=settings.origins,
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
    for router in (routes_health.router, routes_scan.router, routes_reports.router, routes_intel.router):
        app.include_router(router, prefix="/api/v1")

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        return error(422, "validation_error", "Invalid request parameters or body.")

    @app.exception_handler(ChainUnavailable)
    async def chain_unavailable(request, exc):
        return error(503, "chain_unavailable", "The configured registry could not complete the chain request.")

    @app.exception_handler(NotPublished)
    async def not_published(request, exc):
        return error(409, "not_published", "This report has not been published to the registry.")

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        codes = {404: "not_found", 405: "method_not_allowed", 422: "validation_error", 429: "rate_limited"}
        return error(exc.status_code, codes.get(exc.status_code, "http_error"), str(exc.detail), exc.headers)

    @app.exception_handler(Exception)
    async def server_error(request, exc):
        return error(500, "internal_error", "The request could not be completed.")

    return app


app = create_app()
