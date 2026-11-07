"""C0 has no outbound transport. Future network analyzers must use this boundary."""


class FetchDisabled(RuntimeError):
    pass


async def fetch_url(url: str) -> bytes:
    raise FetchDisabled("Outbound fetching is disabled in the scaffold.")
