"""Sanity Client — Push processed articles from Python pipeline to Sanity CMS."""
import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List
import aiohttp

logger = logging.getLogger(__name__)


class SanityClient:
    """Async Sanity client using HTTP API."""

    def __init__(
        self,
        project_id: str = None,
        dataset: str = "production",
        api_token: str = None,
    ):
        self.project_id = project_id or os.getenv("SANITY_PROJECT_ID")
        self.dataset = dataset or os.getenv("SANITY_DATASET", "production")
        self.api_token = api_token or os.getenv("SANITY_API_TOKEN")
        self.api_version = "v2021-10-21"
        self.base_url = f"https://{self.project_id}.api.sanity.io/{self.api_version}"

    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    async def create_article(self, article_data: Dict, source_articles: List[Dict]) -> str:
        """Create a new AI article in Sanity. Returns document _id."""
        attributions = []
        for src in source_articles:
            attributions.append({
                "sourceName": src.get("source_name", ""),
                "sourceUrl": src.get("original_url", ""),
                "accessedAt": datetime.utcnow().isoformat(),
            })

        doc = {
            "_type": "post",
            "title": article_data.get("title", ""),
            "slug": {"_type": "slug", "current": self._slugify(article_data.get("title", ""))},
            "subtitle": article_data.get("subtitle", ""),
            "excerpt": article_data.get("lead", "")[:300],
            "body": self._text_to_blocks(article_data.get("body", "")),
            "sourceAttributions": attributions,
            "factCheckScore": article_data.get("fact_score", 0),
            "ethicsScore": article_data.get("ethics_score", 0),
            "originalityScore": article_data.get("originality_score", 0),
            "aiDisclosure": True,
            "seoTitle": article_data.get("seo_title", ""),
            "metaDescription": article_data.get("seo_description", ""),
            "publishedAt": datetime.utcnow().isoformat(),
            "views": 0,
            "aiRewritten": True,
        }

        doc = {k: v for k, v in doc.items() if v is not None}
        result = await self._mutate([{"create": doc}])
        doc_id = result.get("results", [{}])[0].get("id", "")
        logger.info(f"Created article in Sanity: {doc_id}")
        return doc_id

    async def _mutate(self, mutations: List[Dict]) -> Dict:
        """Execute Sanity mutations."""
        url = f"{self.base_url}/data/mutate/{self.dataset}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, json={"mutations": mutations}) as resp:
                if resp.status not in (200, 201):
                    body = await resp.text()
                    raise Exception(f"Sanity mutation failed: {resp.status} {body}")
                return await resp.json()

    def _slugify(self, text: str) -> str:
        """Create URL-friendly slug from title."""
        import re
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_]+', '-', text)
        text = re.sub(r'-+', '-', text)
        return text[:96]

    def _text_to_blocks(self, text: str) -> List[Dict]:
        """Convert plain text to Sanity portable text blocks."""
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        blocks = []
        for para in paragraphs:
            key = hashlib.md5(para.encode()).hexdigest()[:12]
            blocks.append({
                "_type": "block",
                "_key": key,
                "style": "normal",
                "markDefs": [],
                "children": [
                    {
                        "_type": "span",
                        "_key": f"{key}s",
                        "text": para,
                        "marks": [],
                    }
                ],
            })
        return blocks if blocks else [{"_type": "block", "_key": "empty", "style": "normal", "markDefs": [], "children": [{"_type": "span", "_key": "emptys", "text": "", "marks": []}]}]
