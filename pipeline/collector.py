"""News Collector — Fetch articles from RSS feeds with rate limiting."""
import asyncio
import hashlib
import logging
from datetime import datetime
from typing import List, Optional, Dict
from dataclasses import dataclass
import aiohttp
import feedparser

logger = logging.getLogger(__name__)


@dataclass
class CollectedArticle:
    source_name: str
    source_url: str
    original_url: str
    title: str
    author: str
    published_at: Optional[datetime]
    content: str
    language: str
    categories: List[str]
    image_url: Optional[str] = None
    content_hash: str = ""


class NewsCollector:
    """Async news collector with rate limiting."""

    HEADERS = {
        "User-Agent": "AINewsBot/1.0 (Educational + News Aggregation)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }

    def __init__(self, sources_config: List[Dict], max_concurrent: int = 5):
        self.sources = sources_config
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(headers=self.HEADERS, timeout=timeout)
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    async def collect_all(self) -> List[CollectedArticle]:
        """Fetch articles from all configured sources concurrently."""
        tasks = [self._collect_source(src) for src in self.sources]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        all_articles = []
        for result in results:
            if isinstance(result, list):
                all_articles.extend(result)
        logger.info(f"Collected {len(all_articles)} articles total")
        return all_articles

    async def _collect_source(self, source: Dict) -> List[CollectedArticle]:
        try:
            return await self._fetch_rss(source)
        except Exception as e:
            logger.error(f"Error collecting from {source['name']}: {e}")
        return []

    async def _fetch_rss(self, source: Dict) -> List[CollectedArticle]:
        articles = []
        async with self.semaphore:
            resp = await self.session.get(source["rss_url"])
            content = await resp.text()

        feed = feedparser.parse(content)
        for entry in feed.entries[:source.get("max_entries", 20)]:
            try:
                article = CollectedArticle(
                    source_name=source["name"],
                    source_url=source.get("rss_url", ""),
                    original_url=entry.get("link", ""),
                    title=entry.get("title", "").strip(),
                    author=entry.get("author", source["name"]),
                    published_at=self._parse_date(entry),
                    content=clean_html(entry.get("summary", "")),
                    language=source.get("language", "id"),
                    categories=source.get("categories", []),
                    image_url=self._extract_image(entry),
                    content_hash=hashlib.sha256(
                        (entry.get("title", "") + entry.get("summary", "")).encode()
                    ).hexdigest(),
                )
                if article.content and len(article.content) > 50:
                    articles.append(article)
            except Exception as e:
                logger.warning(f"Failed to process entry: {e}")

        logger.info(f"Fetched {len(articles)} from {source['name']} RSS")
        return articles

    def _parse_date(self, entry) -> Optional[datetime]:
        from time import mktime
        for key in ("published_parsed", "updated_parsed"):
            parsed = entry.get(key)
            if parsed:
                return datetime.fromtimestamp(mktime(parsed))
        return None

    def _extract_image(self, entry) -> Optional[str]:
        media = entry.get("media_content", [])
        if media:
            return media[0].get("url")
        for enc in entry.get("enclosures", []):
            if enc.get("type", "").startswith("image"):
                return enc.get("href")
        return None


def clean_html(text: str) -> str:
    """Remove HTML tags and clean text."""
    import re
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&#039;', "'", text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&#\d+;', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text
