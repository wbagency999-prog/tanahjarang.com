"""Content Rewriter — Creates original articles from verified facts."""
import json
import logging
from dataclasses import dataclass
from typing import List, Dict

logger = logging.getLogger(__name__)


@dataclass
class RewrittenArticle:
    title: str
    subtitle: str
    lead_paragraph: str
    body: str
    conclusion: str
    seo_title: str
    seo_description: str
    word_count: int
    sources_used: List[Dict]


class ContentRewriter:
    """Rewrites news content into original articles from verified facts."""

    def __init__(self, llm_client):
        self.llm = llm_client

    async def rewrite(self, fact_summary, verified_facts, original_articles, language="id"):
        angle = await self._determine_angle(fact_summary, original_articles)
        article = await self._write_article(fact_summary, verified_facts, original_articles, angle, language)
        seo = await self._optimize_seo(article, fact_summary)

        return RewrittenArticle(
            title=article["title"],
            subtitle=article.get("subtitle", ""),
            lead_paragraph=article["lead"],
            body=article["body"],
            conclusion=article.get("conclusion", ""),
            seo_title=seo["title"],
            seo_description=seo["description"],
            word_count=len(article["body"].split()),
            sources_used=[{"name": a.get("source_name"), "url": a.get("original_url")} for a in original_articles],
        )

    async def _determine_angle(self, fact_summary, articles):
        original_angles = [a.get("title", "") for a in articles[:5]]
        prompt = f"""Tentukan sudut pandang UNIK untuk artikel berita.
Fakta: {fact_summary[:2000]}
HINDARI sudut pandang sumber: {chr(10).join(f"- {a}" for a in original_angles)}
Return JSON: {{"angle_type": "...", "unique_angle": "...", "tone": "informative"}}"""
        response = await self.llm.generate(prompt=prompt, temperature=0.4, max_tokens=500)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"angle_type": "contextual", "unique_angle": "Comprehensive overview", "tone": "informative"}

    async def _write_article(self, fact_summary, verified_facts, original_articles, angle, language):
        lang_inst = "Tulis dalam bahasa Indonesia yang baik dan benar." if language == "id" else "Write in English."
        prompt = f"""Anda adalah jurnalis ahli. Tulis artikel BERITA ORIGINAL dari fakta yang terverifikasi.

ATURAN KRITIS:
1. Tulis SETIAP kalimat SENDIRI — JANGAN copy-paste atau paraphrase dekat dari sumber
2. Gunakan STRUKTUR dan NARASI YANG BERBEDA total dari sumber
3. Hanya gunakan fakta dari verified facts di bawah
4. JANGAN menambahkan opini, spekulasi, atau informasi yang belum diverifikasi
5. Sertakan atribusi sumber secara inline
6. {lang_inst}

Sudut pandang: {angle.get('unique_angle', 'Contextual overview')}
Gaya: {angle.get('tone', 'informative')}

FAKTA TERVERIFIKASI:
{fact_summary[:4000]}

Sumber:
{json.dumps([{"name": a.get("source_name"), "title": a.get("title", ""), "url": a.get("original_url")} for a in original_articles[:5]], indent=2, ensure_ascii=False)}

Tulis artikel lengkap dengan: JUDUL ORIGINAL, SUB JUDUL, LEAD, BODY, KESIMPULAN.
Return JSON: {{"title": "...", "subtitle": "...", "lead": "...", "body": "...", "conclusion": "..."}}"""
        response = await self.llm.generate(prompt=prompt, temperature=0.35, max_tokens=3000)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"title": "Judul", "subtitle": "", "lead": response[:200], "body": response, "conclusion": ""}

    async def _optimize_seo(self, article, fact_summary):
        prompt = f"""Buat metadata SEO untuk artikel ini.
Judul: {article.get('title', '')}
Lead: {article.get('lead', '')[:200]}
Return JSON: {{"title": "SEO title (max 60 chars)", "description": "Meta desc (max 160 chars)"}}"""
        response = await self.llm.generate(prompt=prompt, temperature=0.2, max_tokens=300)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"title": article.get("title", "")[:60], "description": article.get("lead", "")[:160]}
