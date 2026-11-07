import asyncio

from app.analyzers.intel import OpenPhish
from app.core.config import Settings
from app.core.db import open_database


async def main():
    engine = open_database(Settings().database_url)
    try:
        entries = await OpenPhish(engine).snapshot(force=True)
        print(f"OpenPhish cache refreshed ({len(entries['urls'])} URL entries).")
    except Exception:
        raise SystemExit("OpenPhish refresh failed. Existing cache retained.") from None
    finally:
        engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
