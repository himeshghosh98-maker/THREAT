from pydantic import HttpUrl


def display_url(url: HttpUrl) -> str:
    # Omit userinfo, port, path, query and fragment, which can contain secrets.
    scheme = "hxxps" if url.scheme == "https" else "hxxp"
    return f"{scheme}://{url.host.replace('.', '[.]')}"
