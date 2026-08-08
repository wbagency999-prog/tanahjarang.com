"""Push processed articles from Python to Sanity CMS via HTTP API."""
import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional
import aiohttp

logger = logging.getLogger(__name__)


class SanityClient:
    def __init__(self):
        self.project_id = os.getenv("SANITY_PROJECT_ID")
        self.dataset = os.getenv("SANITY_DATASET", "production")
        self.api_token = os.getenv("SANITY_API_TOKEN")
        self.base_url = f"https://{self.project_id}.api.sanity.io/v2021-10-21"

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.api_token}", "Content-Type": "application/json"}

    async def upload_image(self, image_url: str) -> Optional[str]:
        """Download image from URL and upload to Sanity. Returns asset _ref or None."""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15), headers={"User-Agent": "Mozilla/5.0"}) as session:
                async with session.get(image_url) as resp:
                    if resp.status != 200:
                        logger.warning(f"Image download failed ({resp.status}): {image_url}")
                        return None
                    content_type = resp.headers.get('Content-Type', 'image/jpeg')
                    if 'image' not in content_type:
                        logger.warning(f"Not an image: {content_type} from {image_url}")
                        return None
                    data = await resp.read()
                    if len(data) < 1000:
                        logger.warning(f"Image too small ({len(data)} bytes): {image_url}")
                        return None

            # Determine extension from content type
            ext_map = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif'}
            ext = ext_map.get(content_type.split(';')[0].strip(), 'jpg')
            filename = f"ai-article-{hashlib.md5(image_url.encode()).hexdigest()[:12]}.{ext}"

            # Upload to Sanity - raw binary body
            url = f"{self.base_url}/assets/images/{self.dataset}?filename={filename}"
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                async with session.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.api_token}",
                        "Content-Type": content_type.split(';')[0].strip(),
                    },
                    data=data,
                ) as resp:
                    result = await resp.json()
                    if resp.status == 200 and "document" in result:
                        doc = result["document"]
                        asset_id = doc.get("_id")
                        if asset_id:
                            logger.info(f"Uploaded image: {asset_id}")
                            return asset_id
                    logger.warning(f"Image upload failed ({resp.status}): {result}")
                    return None
        except Exception as e:
            logger.warning(f"Image upload failed for {image_url}: {e}")
            return None

    async def create_article(self, article_data: Dict, source_articles: List[Dict]) -> str:
        """Create AI article in Sanity. Returns doc _id."""
        attributions = [{
            "sourceName": s.get("source_name", ""),
            "sourceUrl": s.get("original_url", ""),
            "accessedAt": datetime.utcnow().isoformat(),
        } for s in source_articles]

        slug = self._slugify(article_data.get("title", ""))

        doc = {
            "_type": "aiArticle",
            "title": article_data.get("title", ""),
            "slug": {"_type": "slug", "current": slug},
            "subtitle": article_data.get("subtitle", ""),
            "leadParagraph": article_data.get("lead", ""),
            "body": self._text_to_blocks(article_data.get("body", "")),
            "conclusion": article_data.get("conclusion", ""),
            "categories": article_data.get("categories", ["nasional"]),
            "tags": article_data.get("tags", []),
            "sourceAttributions": attributions,
            "factCheckScore": article_data.get("fact_score", 0),
            "ethicsScore": article_data.get("ethics_score", 0),
            "originalityScore": article_data.get("originality_score", 0),
            "status": article_data.get("status", "pending_review"),
            "aiDisclosure": True,
            "seoTitle": article_data.get("seo_title", ""),
            "seoDescription": article_data.get("seo_description", ""),
            "createdAt": datetime.utcnow().isoformat(),
        }

        # Set publishedAt if status is published
        if doc.get("status") == "published":
            doc["publishedAt"] = datetime.utcnow().isoformat()

        # Upload image if URL provided
        image_url = article_data.get("image_url")
        if image_url:
            asset_id = await self.upload_image(image_url)
            if asset_id:
                doc["mainImage"] = {
                    "_type": "image",
                    "asset": {"_type": "reference", "_ref": asset_id}
                }

        doc = {k: v for k, v in doc.items() if v is not None}

        result = await self._mutate([{"create": doc}])
        doc_id = result.get("results", [{}])[0].get("id", "")
        logger.info(f"Created article: {doc_id}")
        return doc_id

    async def create_raw_article(self, article: Dict) -> str:
        doc = {
            "_type": "rawArticle",
            "sourceName": article.get("source_name", ""),
            "originalUrl": article.get("original_url", ""),
            "title": article.get("title", ""),
            "author": article.get("author", ""),
            "publishedAt": article.get("published_at", datetime.utcnow().isoformat()),
            "content": article.get("content", "")[:10000],
            "language": article.get("language", "id"),
            "contentHash": article.get("content_hash", ""),
            "fetchedAt": datetime.utcnow().isoformat(),
        }
        result = await self._mutate([{"create": doc}])
        return result.get("results", [{}])[0].get("id", "")

    async def get_pending_articles(self) -> List[Dict]:
        query = '*[_type == "aiArticle" && status == "pending_review"] | order(factCheckScore desc) [0...50]'
        return await self._query(query)

    async def update_status(self, doc_id: str, status: str, notes: str = ""):
        patches = {"status": status, "editorNotes": notes}
        if status == "published":
            patches["publishedAt"] = datetime.utcnow().isoformat()
        await self._mutate([{"patch": {"id": doc_id, "set": patches}}])

    async def _mutate(self, mutations):
        url = f"{self.base_url}/data/mutate/{self.dataset}"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, json={"mutations": mutations}) as resp:
                return await resp.json()

    async def _query(self, query):
        url = f"{self.base_url}/data/query/{self.dataset}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers, params={"query": query}) as resp:
                data = await resp.json()
                return data.get("result", [])

    def _slugify(self, text):
        import re
        text = re.sub(r'[^\w\s-]', '', text.lower().strip())
        return re.sub(r'[\s_]+', '-', text)[:96]

    def _text_to_blocks(self, text):
        blocks = []
        for para in text.split('\n\n'):
            para = para.strip()
            if not para:
                continue
            key = hashlib.md5(para.encode()).hexdigest()[:12]
            blocks.append({
                "_type": "block", "_key": key, "style": "normal",
                "markDefs": [],
                "children": [{"_type": "span", "_key": f"{key}s", "text": para, "marks": []}],
            })
        return blocks or [{"_type": "block", "_key": "empty", "style": "normal", "markDefs": [], "children": [{"_type": "span", "_key": "e", "text": "", "marks": []}]}]
