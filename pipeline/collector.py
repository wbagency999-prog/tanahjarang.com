"""Fetch news articles from RSS feeds and web sources."""
import asyncio
import hashlib
import logging
import re
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field
import aiohttp
import feedparser

logger = logging.getLogger(__name__)


@dataclass
class CollectedArticle:
    source_name: str
    original_url: str
    title: str
    author: str
    published_at: Optional[datetime]
    content: str
    language: str
    categories: List[str]
    content_hash: str
    image_url: Optional[str] = None


class NewsCollector:
    HEADERS = {"User-Agent": "AINewsBot/1.0 (+https://example.com/bot)"}

    def __init__(self, sources: List[Dict], max_concurrent: int = 5):
        self.sources = sources
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers=self.HEADERS, timeout=aiohttp.ClientTimeout(total=30))
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    async def collect_all(self) -> List[CollectedArticle]:
        tasks = [self._fetch_rss(src) for src in self.sources if src.get("rss_url")]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        all_articles = []
        for r in results:
            if isinstance(r, list):
                all_articles.extend(r)
        logger.info(f"Collected {len(all_articles)} articles from {len(self.sources)} sources")
        return all_articles

    async def _fetch_rss(self, source: Dict) -> List[CollectedArticle]:
        articles = []
        try:
            async with self.semaphore:
                resp = await self.session.get(source["rss_url"])
                content = await resp.text()
            feed = feedparser.parse(content)

            for entry in feed.entries[:15]:
                try:
                    full = await self._extract(entry.get("link", ""))
                    if not full or len(full) < 200:
                        continue

                    # Extract image from RSS entry
                    image_url = self._extract_rss_image(entry)

                    # Fallback: extract og:image from HTML
                    if not image_url:
                        image_url = await self._extract_og_image(entry.get("link", ""))

                    articles.append(CollectedArticle(
                        source_name=source["name"],
                        original_url=entry.get("link", ""),
                        title=entry.get("title", "").strip(),
                        author=entry.get("author", source["name"]),
                        published_at=self._parse_date(entry),
                        content=full,
                        language=source.get("language", "id"),
                        categories=source.get("categories", []),
                        content_hash=hashlib.sha256(full.encode()).hexdigest(),
                        image_url=image_url,
                    ))
                except Exception as e:
                    logger.warning(f"Failed entry: {e}")
        except Exception as e:
            logger.error(f"RSS failed for {source['name']}: {e}")
        return articles

    def _extract_rss_image(self, entry) -> Optional[str]:
        """Extract image URL from RSS entry (media_content, thumbnail, enclosure)."""
        # media_content
        if hasattr(entry, 'media_content') and entry.media_content:
            for media in entry.media_content:
                if media.get('medium') == 'image' or media.get('url', '').lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    return media.get('url')
        # media_thumbnail
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            return entry.media_thumbnail[0].get('url')
        # enclosure
        if hasattr(entry, 'enclosures') and entry.enclosures:
            for enc in entry.enclosures:
                if 'image' in enc.get('type', ''):
                    return enc.get('href') or enc.get('url')
        # summary (some RSS include <img> in summary)
        summary = entry.get('summary', '')
        if summary:
            m = re.search(r'<img[^>]+src=["\']([^"\']+)', summary)
            if m:
                return m.group(1)
        return None

    async def _extract_og_image(self, url: str) -> Optional[str]:
        """Extract og:image from HTML meta tags."""
        async with self.semaphore:
            try:
                resp = await self.session.get(url)
                html = await resp.text()
                # og:image
                m = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)', html)
                if m:
                    return m.group(1)
                m = re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html)
                if m:
                    return m.group(1)
                # twitter:image
                m = re.search(r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)', html)
                if m:
                    return m.group(1)
                return None
            except:
                return None

    async def _extract(self, url: str) -> str:
        """Extract article text from URL using trafilatura with fallback."""
        async with self.semaphore:
            try:
                resp = await self.session.get(url)
                html = await resp.text()
                # Try trafilatura first (best content extraction)
                try:
                    import trafilatura
                    extracted = trafilatura.extract(
                        html,
                        include_comments=False,
                        favor_precision=True,
                    )
                    if extracted and len(extracted) > 100:
                        return extracted
                except ImportError:
                    logger.warning("trafilatura not installed, using raw HTML")
                # Fallback: strip tags from HTML
                import re
                text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
                text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                return text
            except Exception as e:
                logger.debug(f"Extract failed for {url}: {e}")
                return ""

    def _parse_date(self, entry) -> Optional[datetime]:
        from time import mktime
        for key in ("published_parsed", "updated_parsed"):
            p = entry.get(key)
            if p:
                return datetime.fromtimestamp(mktime(p))
        return None
