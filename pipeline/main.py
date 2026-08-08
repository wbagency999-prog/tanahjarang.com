"""FastAPI server — trigger pipeline and manage articles."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from pipeline.config import PipelineConfig
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.sanity_client import SanityClient

logger = logging.getLogger(__name__)
config = PipelineConfig()
sanity = SanityClient()
orchestrator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    orchestrator = PipelineOrchestrator(config, sanity)
    yield


app = FastAPI(title="AI News Pipeline", lifespan=lifespan)


@app.post("/run-cycle")
async def run_cycle():
    if not orchestrator:
        raise HTTPException(503, "Not initialized")
    result = await orchestrator.run_cycle()
    return {"status": "completed", **result}


@app.get("/pending-articles")
async def get_pending():
    articles = await sanity.get_pending_articles()
    return {"articles": articles, "count": len(articles)}


@app.post("/articles/{doc_id}/review")
async def review(doc_id: str, action: str, notes: str = ""):
    if action not in ("published", "rejected"):
        raise HTTPException(400, "Action must be published or rejected")
    await sanity.update_status(doc_id, action, notes)
    return {"status": "ok", "article": doc_id, "action": action}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# Auto-run on startup
@app.on_event("startup")
async def start():
    async def loop():
        while True:
            await asyncio.sleep(config.cycle_interval_minutes * 60)
            try:
                await orchestrator.run_cycle()
            except Exception as e:
                logger.error(f"Scheduled cycle failed: {e}")
    asyncio.create_task(loop())


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    uvicorn.run("pipeline.main:app", host="0.0.0.0", port=8080, reload=True)
