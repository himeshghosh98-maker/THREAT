"""HTTP boundaries and an allowlist-only request log."""
import json
import logging
from time import monotonic

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address, key_style="endpoint")
BODY_LIMIT = 64 * 1024
audit = logging.getLogger("threat_intel.requests")


def configure_logging():
    if not audit.handlers:
        audit.addHandler(logging.StreamHandler())
    audit.setLevel(logging.INFO)
    audit.propagate = False


class HttpBoundary:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        start = monotonic()
        status = 500
        started = False

        async def secure_send(event):
            nonlocal status, started
            if event["type"] == "http.response.start":
                started = True
                status = event["status"]
                headers = MutableHeaders(scope=event)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["X-Frame-Options"] = "DENY"
                headers["Referrer-Policy"] = "no-referrer"
                headers["Cache-Control"] = "no-store"
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
                policy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                if scope["path"] in {"/docs", "/redoc", "/docs/oauth2-redirect"}:
                    policy = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; "
                              "frame-ancestors 'none'; base-uri 'none'")
                headers["Content-Security-Policy"] = policy
                if scope["scheme"] == "https":
                    headers["Strict-Transport-Security"] = "max-age=31536000"
            await send(event)

        async def reject(code, name, detail):
            await JSONResponse({"error": {"code": name, "message": detail}}, status_code=code)(scope, receive, secure_send)

        try:
            declared = Headers(scope=scope).get("content-length")
            if declared is not None and (not declared.isascii() or not declared.isdigit() or len(declared) > 20):
                return await reject(400, "bad_request", "Invalid content length.")
            if declared and int(declared) > BODY_LIMIT:
                return await reject(413, "body_too_large", "Request body exceeds 64 KiB.")
            body = bytearray()
            while True:
                event = await receive()
                if event["type"] == "http.disconnect":
                    return
                chunk = event.get("body", b"")
                if len(body) + len(chunk) > BODY_LIMIT:
                    return await reject(413, "body_too_large", "Request body exceeds 64 KiB.")
                body.extend(chunk)
                if not event.get("more_body", False):
                    break
            replayed = False

            async def replay():
                nonlocal replayed
                if replayed:
                    return await receive()
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}

            await self.app(scope, replay, secure_send)
        except Exception:
            if started:
                raise
            await reject(500, "internal_error", "The request could not be completed.")
        finally:
            method = scope["method"] if scope["method"] in {"GET", "POST", "OPTIONS", "HEAD"} else "OTHER"
            audit.info(json.dumps({"event": "api_request", "method": method, "status": status,
                                   "duration_ms": round((monotonic() - start) * 1000)}))
