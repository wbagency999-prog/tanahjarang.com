"""Cross-reference facts across sources using Claude."""
import json
import logging
from dataclasses import dataclass, field
from typing import List, Dict
from enum import Enum

logger = logging.getLogger(__name__)


class FactConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNVERIFIED = "unverified"


@dataclass
class VerifiedFact:
    claim: str
    confidence: FactConfidence
    supporting_sources: List[Dict]
    entities: List[str] = field(default_factory=list)


class FactChecker:
    def __init__(self, anthropic_client):
        self.client = anthropic_client
        self.model = "claude-sonnet-4-20250514"

    async def check_cluster(self, articles: List[Dict]) -> Dict:
        all_claims = await self._extract_claims(articles)
        verified = self._cross_reference(all_claims)
        score = self._calculate_score(verified)
        summary = await self._generate_summary(verified, articles)

        return {
            "verified_facts": verified,
            "total_claims": len(all_claims),
            "fact_check_score": score,
            "fact_summary": summary,
            "high_confidence": sum(1 for f in verified if f.confidence == FactConfidence.HIGH),
            "medium_confidence": sum(1 for f in verified if f.confidence == FactConfidence.MEDIUM),
        }

    async def _extract_claims(self, articles):
        all_claims = []
        for article in articles:
            content = article.get("content", "")[:3000]
            resp = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": f"""Extract ALL factual claims from this news article.
Focus on: names, dates, locations, numbers, actions, quotes.

Source: {article.get('source_name')}
Title: {article.get('title')}
Content: {content}

Return ONLY a JSON array: [{{"claim":"...", "type":"person|event|number", "quote":"...", "entities":["..."]}}]"""
                }]
            )
            text = resp.content[0].text
            try:
                claims = json.loads(text)
                for c in claims:
                    c["source_name"] = article.get("source_name")
                    c["source_url"] = article.get("original_url")
                all_claims.extend(claims)
            except json.JSONDecodeError:
                pass
        return all_claims

    def _cross_reference(self, claims):
        from collections import defaultdict
        grouped = defaultdict(list)

        for claim in claims:
            key = claim.get("claim", "").lower().strip()[:100]
            grouped[key].append(claim)

        verified = []
        for key, sources in grouped.items():
            source_count = len(set(s.get("source_name", "") for s in sources))
            if source_count >= 3:
                conf = FactConfidence.HIGH
            elif source_count >= 2:
                conf = FactConfidence.MEDIUM
            elif source_count == 1:
                conf = FactConfidence.LOW
            else:
                conf = FactConfidence.UNVERIFIED

            verified.append(VerifiedFact(
                claim=key,
                confidence=conf,
                supporting_sources=[{"name": s["source_name"], "url": s["source_url"]} for s in sources],
                entities=sources[0].get("entities", []),
            ))
        return verified

    def _calculate_score(self, facts):
        if not facts:
            return 0
        weights = {FactConfidence.HIGH: 1.0, FactConfidence.MEDIUM: 0.7, FactConfidence.LOW: 0.3, FactConfidence.UNVERIFIED: 0.0}
        score = sum(weights[f.confidence] for f in facts) / len(facts) * 100
        penalty = sum(1 for f in facts if f.confidence == FactConfidence.UNVERIFIED) / len(facts) * 20
        return max(0, round(score - penalty, 1))

    async def _generate_summary(self, facts, articles):
        verified = [f for f in facts if f.confidence in (FactConfidence.HIGH, FactConfidence.MEDIUM)]
        resp = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            temperature=0.2,
            messages=[{
                "role": "user",
                "content": f"""Create a factual summary from verified facts. Include source attribution.

Verified facts:
{json.dumps([{"claim": f.claim, "confidence": f.confidence.value, "sources": [s["name"] for s in f.supporting_sources]} for f in verified[:20]], indent=2, ensure_ascii=False)}

Sources:
{chr(10).join(f"- {a.get('source_name')}: {a.get('title', '')}" for a in articles[:10])}

Output: Structured summary in Indonesian with source attribution for each fact."""
            }]
        )
        return resp.content[0].text
