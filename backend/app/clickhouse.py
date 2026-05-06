"""
ClickHouse async client — аналитика, события, ML-фичи.
"""
import logging
from aiochclient import ChClient
from aiohttp import ClientSession
from app.config import settings

logger = logging.getLogger(__name__)

_session: ClientSession | None = None
_client: ChClient | None = None


async def get_ch() -> ChClient:
    global _session, _client
    if _client is None:
        _session = ClientSession()
        _client = ChClient(
            _session,
            url=settings.CLICKHOUSE_URL,
            compress_response=True,
        )
    return _client


async def close_ch():
    global _session, _client
    if _session:
        await _session.close()
        _session = None
        _client = None


async def ch_execute(query: str, params: dict | None = None) -> list[dict]:
    client = await get_ch()
    try:
        rows = await client.fetch(query, params=params)
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"ClickHouse query error: {e}\nQuery: {query[:200]}")
        raise


async def ch_insert(table: str, rows: list[dict]):
    client = await get_ch()
    await client.execute(f"INSERT INTO {table} VALUES", *rows)
