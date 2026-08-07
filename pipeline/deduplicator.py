"""Group similar articles into clusters using SimHash."""
import re
import logging
from typing import List
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class SimHash:
    def __init__(self, bits=64):
        self.bits = bits

    def compute(self, text):
        tokens = re.findall(r"\w+", text.lower())
        if not tokens:
            return 0
        v = [0] * self.bits
        for token in tokens:
            h = 0
            for ch in token:
                h = (h * 31 + ord(ch)) & ((1 << self.bits) - 1)
            for i in range(self.bits):
                v[i] += 1 if h & (1 << i) else -1
        fp = 0
        for i in range(self.bits):
            if v[i] > 0:
                fp |= (1 << i)
        return fp

    @staticmethod
    def hamming(h1, h2):
        x = h1 ^ h2
        c = 0
        while x:
            c += 1
            x &= x - 1
        return c


@dataclass
class ArticleCluster:
    id: int
    articles: List[dict] = field(default_factory=list)

    @property
    def source_count(self):
        return len(set(a.get("source_name") for a in self.articles))


class Deduplicator:
    def __init__(self, hamming_thresh=10):
        self.sh = SimHash()
        self.hamming_thresh = hamming_thresh

    def cluster(self, articles):
        if not articles:
            return []
        fps = [self.sh.compute(f"{a.get('title', '')} {a.get('content', '')[:500]}") for a in articles]
        n = len(articles)
        visited = [False] * n
        clusters = []
        for i in range(n):
            if visited[i]:
                continue
            group = [articles[i]]
            visited[i] = True
            for j in range(i + 1, n):
                if not visited[j] and SimHash.hamming(fps[i], fps[j]) <= self.hamming_thresh:
                    group.append(articles[j])
                    visited[j] = True
            clusters.append(ArticleCluster(id=len(clusters), articles=group))
        logger.info(f"Clustered {len(articles)} → {len(clusters)} groups")
        return clusters
