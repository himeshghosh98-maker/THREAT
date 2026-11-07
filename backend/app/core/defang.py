from pydantic import HttpUrl


def display_url(url: HttpUrl) -> str:
    """Display only the defanged origin. Paths, credentials and queries can contain secrets."""
    scheme = "hxxps" if url.scheme == "https" else "hxxp"
    port = f":{url.port}" if url.port != {"https": 443, "http": 80}[url.scheme] else ""
    return f"{scheme}://{url.host.replace('.', '[.]')}{port}"
