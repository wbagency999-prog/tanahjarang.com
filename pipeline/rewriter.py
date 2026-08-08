"""Write original articles from verified facts using Claude."""
import json
import re
import logging
from dataclasses import dataclass
from typing import List, Dict

logger = logging.getLogger(__name__)


def _parse_json(text: str) -> dict:
    """Parse JSON from LLM response, stripping markdown code fences."""
    text = text.strip()
    # Remove markdown code fences: ```json ... ``` or ``` ... ```
    text = re.sub(r'^```(?:json)?\s*\n?', '', text)
    text = re.sub(r'\n?```\s*$', '', text)
    text = text.strip()
    return json.loads(text)


@dataclass
class RewrittenArticle:
    title: str
    subtitle: str
    lead: str
    body: str
    conclusion: str
    seo_title: str
    seo_description: str
    word_count: int
    sources_used: List[Dict]


class ContentRewriter:
    def __init__(self, llm_client):
        self.llm = llm_client
        self.model = "claude-sonnet-4-20250514"

    async def rewrite(self, fact_summary: str, verified_facts: List[Dict], original_articles: List[Dict]) -> RewrittenArticle:
        angle = await self._determine_angle(fact_summary, original_articles)
        article = await self._write_article(fact_summary, original_articles, angle)
        seo = await self._get_seo(article)
        check = self._plagiarism_check(article, original_articles)
        if check["needs_revision"]:
            article = await self._revise(article, check["flagged"])

        return RewrittenArticle(
            title=article["title"], subtitle=article.get("subtitle", ""),
            lead=article["lead"], body=article["body"],
            conclusion=article.get("conclusion", ""),
            seo_title=seo["title"], seo_description=seo["description"],
            word_count=len(article["body"].split()),
            sources_used=[{"name": a.get("source_name"), "url": a.get("original_url")} for a in original_articles],
        )

    async def _determine_angle(self, fact_summary, articles):
        original_titles = [a.get("title", "") for a in articles[:5]]
        try:
            resp = await self.llm.generate(
                prompt=f"""Determine a UNIQUE angle for a news article.
Facts: {fact_summary[:2000]}
AVOID these source angles: {chr(10).join(f"- {t}" for t in original_titles)}

Return JSON: {{"angle":"analytical|contextual|impact|chronological", "unique_angle":"...", "tone":"..."}}""",
                temperature=0.4,
                max_tokens=500,
            )
            return _parse_json(resp)
        except:
            return {"angle": "contextual", "unique_angle": "Comprehensive overview", "tone": "informative"}

    async def _write_article(self, fact_summary, articles, angle):
        source_titles = [f"- {a.get('source_name')}: {a.get('title', '')}" for a in articles[:10]]
        try:
            resp = await self.llm.generate(
                prompt=f"""You are an expert journalist. Write an ORIGINAL article from verified facts ONLY.

CRITICAL RULES:
1. Write EVERY sentence yourself — NO copying from sources
2. Use COMPLETELY DIFFERENT structure and narrative
3. Only use facts from the verified facts below
4. Do NOT add opinions or unverified info
5. Include source attribution inline (e.g. "Dilansir dari BBC...")
6. Write in Bahasa Indonesia

Angle: {angle.get('unique_angle', 'Overview')}
Tone: {angle.get('tone', 'informative')}

VERIFIED FACTS:
{fact_summary[:4000]}

SOURCE TITLES (avoid copying these):
{chr(10).join(source_titles)}

Return JSON: {{"title":"Original headline", "subtitle":"Dek", "lead":"Opening 2-3 sentences", "body":"Full body paragraphs", "conclusion":"Closing"}}""",
                temperature=0.35,
                max_tokens=2500,
            )
            return _parse_json(resp)
        except Exception as e:
            logger.warning(f"Article write failed, using raw response: {e}")
            # Try to salvage what we can from the response
            try:
                cleaned = re.sub(r'^```(?:json)?\s*\n?', '', resp.strip())
                cleaned = re.sub(r'\n?```\s*$', '', cleaned).strip()
                return {"title": cleaned[:100].split('\n')[0], "subtitle": "", "lead": cleaned[:300], "body": cleaned, "conclusion": ""}
            except:
                return {"title": "Artikel", "subtitle": "", "lead": "", "body": "", "conclusion": ""}

    async def _get_seo(self, article):
        try:
            resp = await self.llm.generate(
                prompt=f"""Create SEO metadata.
Title: {article.get('title', '')}
Lead: {article.get('lead', '')[:200]}
Return JSON: {{"title":"max 60 chars", "description":"max 160 chars"}}""",
                temperature=0.2,
                max_tokens=200,
            )
            return _parse_json(resp)
        except:
            return {"title": article.get("title", "")[:60], "description": article.get("lead", "")[:160]}

    def _plagiarism_check(self, article, sources):
        text = f"{article.get('title', '')} {article.get('lead', '')} {article.get('body', '')}"
        sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 20]
        flagged = []
        for src in sources:
            src_sents = [s.strip() for s in src.get("content", "")[:3000].split(".") if len(s.strip()) > 20]
            for sent in sentences[:50]:
                for src_s in src_sents[:100]:
                    words1, words2 = set(sent.lower().split()), set(src_s.lower().split())
                    if words1 and words2:
                        sim = len(words1 & words2) / len(words1 | words2)
                        if sim > 0.75:
                            flagged.append({"sent": sent, "source": src_s, "from": src.get("source_name")})
        return {"needs_revision": len(flagged) > 0, "flagged": flagged}

    async def _revise(self, article, flagged):
        flagged_text = "\n".join(f"- \"{f['sent']}\" (from {f['from']})" for f in flagged[:5])
        try:
            resp = await self.llm.generate(
                prompt=f"""Rewrite these flagged sentences to be completely original while keeping the same facts.

FLAGGED:
{flagged_text}

Current body: {article.get('body', '')[:3000]}

Return JSON: {{"body":"Complete revised body"}}""",
                temperature=0.4,
                max_tokens=2500,
            )
            return _parse_json(resp)
        except:
            return article
