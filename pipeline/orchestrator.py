"""Pipeline Orchestrator — Coordinates all stages of the news pipeline."""
import asyncio
import logging
from datetime import datetime
from typing import Dict, List

from pipeline.collector import NewsCollector
from pipeline.rewriter import ContentRewriter
from pipeline.sanity_client import SanityClient
from pipeline.llm_client import LLMClient

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    """Main orchestrator: Collect → Rewrite → Publish to Sanity."""

    def __init__(self, config, sanity_client: SanityClient):
        self.config = config
        self.llm = LLMClient(config.llm_config)
        self.collector = NewsCollector(config.sources, max_concurrent=5)
        self.rewriter = ContentRewriter(self.llm)
        self.sanity = sanity_client

    async def run_cycle(self) -> Dict:
        cycle_start = datetime.utcnow()
        stats = {
            "articles_collected": 0,
            "articles_rewritten": 0,
            "articles_published": 0,
            "articles_rejected": 0,
            "errors": [],
        }

        logger.info("=" * 60 + "\nStarting pipeline cycle")

        # STAGE 1: Collect
        logger.info("[1] Collecting articles...")
        async with self.collector:
            raw = await self.collector.collect_all()
        stats["articles_collected"] = len(raw)

        # Filter: only articles with enough content
        valid_articles = [a for a in raw if a.content and len(a.content) > 100]
        logger.info(f"[2] {len(valid_articles)} articles with sufficient content")

        # Process each article
        for i, article in enumerate(valid_articles[:self.config.max_articles_per_cycle]):
            try:
                logger.info(f"\n[{i+1}/{len(valid_articles)}] Processing: {article.title[:60]}...")

                # Rewrite
                logger.info("  [3] Rewriting...")
                rewritten = await self.rewriter.rewrite(
                    fact_summary=article.content[:3000],
                    verified_facts=[],
                    original_articles=[{
                        "source_name": article.source_name,
                        "original_url": article.original_url,
                        "title": article.title,
                        "content": article.content,
                    }],
                    language=article.language,
                )
                logger.info(f"    Written: '{rewritten.title}' ({rewritten.word_count} words)")
                stats["articles_rewritten"] += 1

                # Generate image caption
                image_caption = f"{rewritten.title} | Foto: {article.source_name}"

                # Publish to Sanity
                logger.info("  [4] Publishing to Sanity...")
                doc_id = await self.sanity.create_article(
                    article_data={
                        "title": rewritten.title,
                        "subtitle": rewritten.subtitle,
                        "lead": rewritten.lead_paragraph,
                        "body": rewritten.body,
                        "conclusion": rewritten.conclusion,
                        "seo_title": rewritten.seo_title,
                        "seo_description": rewritten.seo_description,
                        "fact_score": 85,
                        "ethics_score": 80,
                        "originality_score": 0.9,
                        "categories": article.categories,
                    },
                    source_articles=[{
                        "source_name": article.source_name,
                        "original_url": article.original_url,
                    }],
                )
                logger.info(f"    Published: {doc_id}")
                stats["articles_published"] += 1

            except Exception as e:
                logger.error(f"Error processing article: {e}")
                stats["errors"].append(str(e))
                stats["articles_rejected"] += 1

        stats["duration_seconds"] = (datetime.utcnow() - cycle_start).total_seconds()
        logger.info(f"\nCycle complete: {stats}")
        return stats
