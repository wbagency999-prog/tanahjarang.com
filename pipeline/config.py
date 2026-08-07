"""Pipeline configuration from environment variables."""
import os
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class PipelineConfig:
    # LLM
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o")
    llm_temperature: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Sanity
    sanity_project_id: str = os.getenv("SANITY_PROJECT_ID", "")
    sanity_dataset: str = os.getenv("SANITY_DATASET", "production")
    sanity_api_token: str = os.getenv("SANITY_API_TOKEN", "")

    # Pipeline
    cycle_interval_minutes: int = int(os.getenv("CYCLE_INTERVAL", "15"))
    max_articles_per_cycle: int = int(os.getenv("MAX_ARTICLES", "50"))
    min_fact_corroboration: int = int(os.getenv("MIN_FACT_CORROBORATION", "2"))
    max_plagiarism: float = float(os.getenv("MAX_PLAGIARISM", "0.25"))
    min_originality: float = float(os.getenv("MIN_ORIGINALITY", "0.75"))

    # News Sources
    sources: List[Dict] = field(default_factory=lambda: [
        {"name": "CNN Indonesia", "rss_url": "https://www.cnnindonesia.com/nasional/rss", "credibility": 85, "categories": ["nasional", "internasional"]},
        {"name": "CNN Tekno", "rss_url": "https://www.cnnindonesia.com/teknologi/rss", "credibility": 85, "categories": ["teknologi"]},
        {"name": "CNN Olahraga", "rss_url": "https://www.cnnindonesia.com/olahraga/rss", "credibility": 85, "categories": ["olahraga"]},
        {"name": "Tempo", "rss_url": "https://rss.tempo.co/nasional", "credibility": 82, "categories": ["nasional", "internasional"]},
        {"name": "Antara", "rss_url": "https://www.antaranews.com/rss/terkini", "credibility": 90, "categories": ["nasional", "internasional"]},
        {"name": "Antara Internasional", "rss_url": "https://www.antaranews.com/rss/internasional", "credibility": 90, "categories": ["internasional"]},
        {"name": "CNBC Bisnis", "rss_url": "https://www.cnbcindonesia.com/market/rss", "credibility": 80, "categories": ["bisnis", "ekonomi"]},
        {"name": "CNBC Tekno", "rss_url": "https://www.cnbcindonesia.com/tech/rss", "credibility": 80, "categories": ["teknologi"]},
    ])

    @property
    def llm_config(self):
        return {
            "provider": self.llm_provider,
            "model": self.llm_model,
            "temperature": self.llm_temperature,
            "openai_api_key": self.openai_api_key,
            "anthropic_api_key": self.anthropic_api_key,
        }
