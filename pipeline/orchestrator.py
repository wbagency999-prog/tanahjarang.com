"""Main pipeline orchestrator — coordinates all stages."""
import asyncio
import logging
from datetime import datetime
from typing import Dict, List

from pipeline.config import PipelineConfig
from pipeline.collector import NewsCollector
from pipeline.deduplicator import Deduplicator
from pipeline.fact_checker import FactChecker
from pipeline.rewriter import ContentRewriter
from pipeline.ethics_gate import EthicsGate
from pipeline.sanity_client import SanityClient
from pipeline.llm_client import LLMClient

logger = logging.getLogger(__name__)


class PipelineOrchestrator:
    def __init__(self, config: PipelineConfig, sanity: SanityClient):
        self.config = config
        self.sanity = sanity
        self.llm = LLMClient({
            "provider": "anthropic",
            "model": config.llm_model,
            "temperature": config.llm_temperature,
        })
        self.collector = NewsCollector(config.sources)
        self.deduplicator = Deduplicator()
        self.fact_checker = FactChecker(self.llm)
        self.rewriter = ContentRewriter(self.llm)
        self.ethics_gate = EthicsGate(self.llm)

    async def run_cycle(self) -> Dict:
        start = datetime.utcnow()
        stats = {"articles_collected": 0, "clusters_formed": 0, "articles_approved": 0, "articles_rejected": 0, "errors": []}

        logger.info("=" * 50 + "\nPipeline cycle starting")

        # 1. Collect from RSS feeds
        logger.info("[1/5] Collecting from RSS feeds...")
        async with self.collector:
            raw = await self.collector.collect_all()
        stats["articles_collected"] = len(raw)

        # Filter: only articles with enough content
        valid_articles = [a for a in raw if a.content and len(a.content) > 100]
        logger.info(f"[2/5] {len(valid_articles)} articles with sufficient content")

        # 2. Store raw articles and cluster duplicates
        logger.info("[3/5] Clustering similar articles...")
        raw_dicts = []
        for a in valid_articles[:self.config.max_articles_per_cycle]:
            d = {
                "source_name": a.source_name,
                "original_url": a.original_url,
                "title": a.title,
                "author": a.author,
                "published_at": a.published_at.isoformat() if a.published_at else "",
                "content": a.content,
                "language": a.language,
                "categories": a.categories,
                "content_hash": a.content_hash,
                "image_url": a.image_url,
            }
            raw_dicts.append(d)

        clusters = self.deduplicator.cluster(raw_dicts)
        stats["clusters_formed"] = len(clusters)
        logger.info(f"  → {len(clusters)} clusters from {len(raw_dicts)} articles")

        # 3. Process each cluster
        for i, cluster in enumerate(clusters):
            if cluster.source_count < 1:
                continue

            logger.info(f"\n[Cluster {i+1}/{len(clusters)}] {len(cluster.articles)} articles, {cluster.source_count} sources")
            try:
                result = await self._process_cluster(cluster)
                if result.get("approved"):
                    stats["articles_approved"] += 1
                else:
                    stats["articles_rejected"] += 1
            except Exception as e:
                logger.error(f"Error processing cluster: {e}")
                stats["errors"].append(str(e))

        stats["duration_seconds"] = (datetime.utcnow() - start).total_seconds()
        logger.info(f"\nCycle complete: {stats}")
        return stats

    async def _process_cluster(self, cluster) -> Dict:
        articles = cluster.articles

        # Fact check across sources
        logger.info("  [4/5] Fact checking...")
        fc = await self.fact_checker.check_cluster(articles)
        logger.info(f"    Fact score: {fc['fact_check_score']}/100 | Claims: {fc['total_claims']}")

        if fc["fact_check_score"] < 50 and cluster.source_count > 1:
            logger.info("    Skipped: low fact-check score with multiple sources")
            return {"approved": False, "reason": "low_fact_score"}

        # Rewrite article
        logger.info("  [5/5] Rewriting...")
        rewritten = await self.rewriter.rewrite(
            fc["fact_summary"],
            [{"claim": f.claim, "confidence": f.confidence.value} for f in fc["verified_facts"]],
            articles,
        )
        logger.info(f"    Written: '{rewritten.title}' ({rewritten.word_count} words)")

        # Ethics check
        article_dict = {
            "title": rewritten.title,
            "subtitle": rewritten.subtitle,
            "lead_paragraph": rewritten.lead,
            "body": rewritten.body,
            "conclusion": rewritten.conclusion,
        }
        ethics = await self.ethics_gate.check(article_dict, articles, fc)
        logger.info(f"    Ethics: {'PASS' if ethics.passed else 'FAIL'} | Score: {ethics.ethics_score}/100 | Orig: {ethics.originality_score:.0%}")

        if not ethics.passed:
            logger.info(f"    Rejected: {len(ethics.violations)} violations")
            return {"approved": False, "violations": [v["type"] for v in ethics.violations]}

        # Push to Sanity
        logger.info("  Pushing to Sanity...")
        # Pick best image from cluster articles
        best_image = next((a.get("image_url") for a in articles if a.get("image_url")), None)
        doc_id = await self.sanity.create_article(
            article_data={
                "title": rewritten.title,
                "subtitle": rewritten.subtitle,
                "lead": rewritten.lead,
                "body": rewritten.body,
                "conclusion": rewritten.conclusion,
                "seo_title": rewritten.seo_title,
                "seo_description": rewritten.seo_description,
                "fact_score": fc["fact_check_score"],
                "ethics_score": ethics.ethics_score,
                "originality_score": ethics.originality_score,
                "categories": articles[0].get("categories", ["nasional"]),
                "image_url": best_image,
            },
            source_articles=[{
                "source_name": a.get("source_name"),
                "original_url": a.get("original_url"),
            } for a in articles],
        )
        logger.info(f"    Published: {doc_id}")

        return {"approved": True, "doc_id": doc_id}
