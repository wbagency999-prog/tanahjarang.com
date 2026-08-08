"""Final ethics check before publication."""
import json
import re
import logging
from typing import List, Dict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


def _parse_json(text: str):
    """Parse JSON from LLM response, stripping markdown code fences."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*\n?', '', text)
    text = re.sub(r'\n?```\s*$', '', text)
    text = text.strip()
    return json.loads(text)


@dataclass
class EthicsReport:
    passed: bool
    plagiarism_score: float
    originality_score: float
    ethics_score: float
    violations: List[Dict]


class EthicsGate:
    MAX_PLAGIARISM = 0.25

    def __init__(self, llm_client):
        self.llm = llm_client
        self.model = "claude-sonnet-4-20250514"

    async def check(self, article: Dict, source_articles: List[Dict], fact_result: Dict) -> EthicsReport:
        violations = []

        # 1. Plagiarism check
        text = self._full(article)
        max_sim = 0
        for src in source_articles:
            sim = self._ngram_sim(text, src.get("content", "")[:5000])
            max_sim = max(max_sim, sim)
        if max_sim > self.MAX_PLAGIARISM:
            violations.append({"type": "plagiarism", "severity": "critical", "score": max_sim})

        # 2. Attribution check
        text_lower = text.lower()
        has_attr = any(kw in text_lower for kw in ["menurut", "dilaporkan", "sumber", "dilansir", "according to", "reported by"])
        if not has_attr:
            violations.append({"type": "missing_attribution", "severity": "critical"})

        # 3. AI disclosure
        if "ai" not in text_lower and "artificial" not in text_lower and "disusun" not in text_lower:
            violations.append({"type": "ai_disclosure_missing", "severity": "high"})

        # 4. Headline accuracy via LLM
        try:
            resp = await self.llm.generate(
                prompt=f"""Does this headline accurately reflect the content?
Title: {article.get('title', '')}
Content: {article.get('body', '')[:500]}
Return JSON: {{"accurate": true/false}}""",
                temperature=0.1,
                max_tokens=200,
            )
            check = _parse_json(resp)
            if not check.get("accurate", True):
                violations.append({"type": "headline_mismatch", "severity": "medium"})
        except Exception as e:
            logger.debug(f"Headline check failed: {e}")

        # 5. Sensationalism check
        try:
            resp = await self.llm.generate(
                prompt=f"""Check for sensationalism/clickbait.
Title: {article.get('title', '')}
Content: {article.get('body', '')[:1000]}
Return JSON: {{"flagged": true/false, "issues": ["..."]}}""",
                temperature=0.1,
                max_tokens=200,
            )
            sens = _parse_json(resp)
            if sens.get("flagged"):
                violations.append({"type": "sensationalism", "severity": "medium"})
        except Exception as e:
            logger.debug(f"Sensationalism check failed: {e}")

        # Calculate scores
        orig_score = 1.0 - max_sim
        weights = {"critical": 30, "high": 20, "medium": 10}
        penalty = sum(weights.get(v["severity"], 5) for v in violations)
        ethics_score = max(0, 100 - penalty)
        critical = [v for v in violations if v["severity"] in ("critical", "high")]
        passed = len(critical) == 0 and ethics_score >= 70 and orig_score >= 0.75

        return EthicsReport(passed=passed, plagiarism_score=max_sim, originality_score=orig_score, ethics_score=ethics_score, violations=violations)

    def _ngram_sim(self, t1, t2, n=3):
        def ngrams(text):
            words = text.lower().split()
            return set(tuple(words[i:i+n]) for i in range(len(words)-n+1))
        ng1, ng2 = ngrams(t1), ngrams(t2)
        return len(ng1 & ng2) / len(ng1 | ng2) if ng1 and ng2 else 0

    def _full(self, a):
        return " ".join(str(a.get(k, "")) for k in ["title", "subtitle", "lead_paragraph", "body", "conclusion"])
