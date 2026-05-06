"""
Claude API клиент для всех AI модулей ST8 Dark.
"""
import anthropic
import time
import logging
from app.config import settings

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def get_completion(
    user: str,
    system: str = "",
    max_tokens: int = 500,
    model: str = "claude-sonnet-4-20250514",
) -> str:
    """Базовый вызов Claude API с логированием."""
    start = time.time()
    try:
        message = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        elapsed = time.time() - start
        logger.info(
            f"Claude API: tokens={message.usage.input_tokens}+{message.usage.output_tokens} "
            f"latency={elapsed:.2f}s model={model}"
        )
        return message.content[0].text
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        raise


async def get_json_completion(
    user: str,
    system: str = "",
    max_tokens: int = 1000,
) -> dict:
    """Вызов Claude API с ожиданием JSON ответа."""
    json_system = system + "\n\nОтвечай ТОЛЬКО валидным JSON без markdown-блоков и пояснений."
    result = await get_completion(user=user, system=json_system, max_tokens=max_tokens)
    import json
    try:
        return json.loads(result.strip())
    except json.JSONDecodeError:
        # Попытка извлечь JSON из текста
        import re
        match = re.search(r'\{.*\}', result, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Claude вернул не JSON: {result[:200]}")
