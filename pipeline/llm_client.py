"""LLM Client — Multi-provider abstraction with retries."""
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class LLMClient:
    def __init__(self, config: dict):
        self.provider = config.get("provider", "openai")
        self.model = config.get("model", "gpt-4o")
        self.temperature = config.get("temperature", 0.3)
        self.max_tokens = config.get("max_tokens", 2000)
        self.retry_attempts = config.get("retry_attempts", 3)
        self._client = None

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        temp = temperature if temperature is not None else self.temperature
        tokens = max_tokens if max_tokens is not None else self.max_tokens

        for attempt in range(self.retry_attempts):
            try:
                if self.provider == "openai":
                    return await self._gen_openai(prompt, system_prompt, temp, tokens)
                elif self.provider == "anthropic":
                    return await self._gen_anthropic(prompt, system_prompt, temp, tokens)
                elif self.provider == "local":
                    return await self._gen_local(prompt, system_prompt, temp, tokens)
            except Exception as e:
                logger.warning(f"LLM attempt {attempt+1} failed: {e}")
                await asyncio.sleep(2 ** attempt)

        raise RuntimeError(f"LLM failed after {self.retry_attempts} attempts")

    async def _gen_openai(self, prompt, system, temp, tokens):
        from openai import AsyncOpenAI
        if not self._client:
            self._client = AsyncOpenAI()
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        r = await self._client.chat.completions.create(
            model=self.model,
            messages=msgs,
            temperature=temp,
            max_tokens=tokens,
        )
        return r.choices[0].message.content

    async def _gen_anthropic(self, prompt, system, temp, tokens):
        from anthropic import AsyncAnthropic
        if not self._client:
            self._client = AsyncAnthropic()
        kwargs = {"model": self.model, "max_tokens": tokens, "temperature": temp}
        if system:
            kwargs["system"] = system
        r = await self._client.messages.create(**kwargs)
        return r.content[0].text

    async def _gen_local(self, prompt, system, temp, tokens):
        import aiohttp
        if not self._client:
            self._client = aiohttp.ClientSession()
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        async with self._client.post(
            "http://localhost:11434/api/generate",
            json={"model": self.model, "prompt": full_prompt, "stream": False,
                  "options": {"temperature": temp, "num_predict": tokens}}
        ) as r:
            resp = await r.json()
            return resp.get("response", "")
