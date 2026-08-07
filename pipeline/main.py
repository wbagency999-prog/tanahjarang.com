"""Pipeline Server — FastAPI endpoint untuk trigger pipeline."""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from pipeline.config import PipelineConfig
from pipeline.orchestrator import PipelineOrchestrator
from pipeline.sanity_client import SanityClient

logger = logging.getLogger(__name__)

# Globals
config = PipelineConfig()
sanity = SanityClient()
orchestrator: Optional[PipelineOrchestrator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    orchestrator = PipelineOrchestrator(config, sanity)
    logger.info("Pipeline server started")
    yield
    logger.info("Pipeline server stopped")


app = FastAPI(
    title="AI News Pipeline Server",
    version="1.0.0",
    lifespan=lifespan,
)


class RunCycleResponse(BaseModel):
    status: str
    articles_collected: int
    articles_rewritten: int
    articles_published: int
    articles_rejected: int
    duration_seconds: float


@app.post("/run-cycle", response_model=RunCycleResponse)
async def run_cycle():
    """Trigger a full pipeline cycle."""
    if orchestrator is None:
        raise HTTPException(503, "Pipeline not initialized")
    result = await orchestrator.run_cycle()
    return RunCycleResponse(status="completed", **result)


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.on_event("startup")
async def start_scheduler():
    """Run pipeline every N minutes."""
    interval = config.cycle_interval_minutes

    async def _loop():
        while True:
            await asyncio.sleep(interval * 60)
            try:
                if orchestrator:
                    logger.info("Scheduled pipeline cycle starting...")
                    await orchestrator.run_cycle()
            except Exception as e:
                logger.error(f"Scheduled cycle failed: {e}")

    asyncio.create_task(_loop())
    logger.info(f"Scheduler started: cycle every {interval} minutes")


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("pipeline.main:app", host="0.0.0.0", port=8080, reload=True)
