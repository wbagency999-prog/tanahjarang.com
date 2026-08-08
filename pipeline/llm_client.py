"""LLM Client — Anthropic Claude with gateway support using httpx."""
import asyncio
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self, config: dict):
        self.provider = config.get("provider", "anthropic")
        self.model = config.get("model", "claude-sonnet-4-20250514")
        self.temperature = config.get("temperature", 0.3)
        self.max_tokens = config.get("max_tokens", 2000)
        self.retry_attempts = config.get("retry_attempts", 3)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        import httpx
        import json

        api_key = os.getenv("ANTHROPIC_API_KEY", "sk-gw-6-kbupJamM04S03ZpgiBNeVHxVuj-Vei")
        base_url = os.getenv("ANTHROPIC_BASE_URL", "https://api.syncera.id/anthropic")
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens

        messages = [{"role": "user", "content": prompt}]
        if system_prompt:
            messages.insert(0, {"role": "user", "content": system_prompt})

        payload = {
            "model": self.model,
            "max_tokens": tokens,
            "temperature": temp,
            "messages": messages,
        }

        for attempt in range(self.retry_attempts):
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        f"{base_url}/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json=payload,
                    )
                    data = response.json()
                    logger.debug(f"API response keys: {list(data.keys())}")
                    
                    # Handle different response formats
                    if "content" in data and len(data["content"]) > 0:
                        content = data["content"][0]
                        if isinstance(content, dict):
                            text = content.get("text", "")
                            if text:
                                return text
                            # Maybe it's a different structure
                            return str(content)
                        elif isinstance(content, str):
                            return content
                        return str(content)
                    elif "text" in data:
                        return data["text"]
                    elif "choices" in data and len(data["choices"]) > 0:
                        return data["choices"][0].get("message", {}).get("content", "")
                    else:
                        logger.error(f"Unexpected response format: {list(data.keys())}")
                        raise Exception(f"Unexpected response: {str(data)[:200]}")

            except Exception as e:
                logger.warning(f"LLM attempt {attempt+1} failed: {e}")
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(2 ** attempt)

        raise RuntimeError(f"LLM failed after {self.retry_attempts} attempts")
