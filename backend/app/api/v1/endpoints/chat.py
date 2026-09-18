from fastapi import APIRouter, status
from typing import Optional

from app.schemas.chat import ChatRequest, ChatResponse
from app.agents.analyst_agent import analyst_agent
from app.services.dataset_service import dataset_service
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["AI Chat & Agent"])

@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask AI Analyst Agent",
    description="Full agent orchestrator executing intent classification, DuckDB SQL, statistical correlation, and visualization formatting."
)
async def ask_analyst_agent(request: ChatRequest) -> ChatResponse:
    dataset = None
    if request.dataset_id:
        try:
            dataset = dataset_service.get_dataset(request.dataset_id)
        except Exception as e:
            logger.warning(f"Could not load dataset {request.dataset_id} for agent: {e}")

    logger.info(f"Agent executing request: '{request.question}' (Dataset: {dataset.name if dataset else 'None'})")

    response = await analyst_agent.run(
        question=request.question,
        dataset=dataset,
        conversation_history=request.conversation_history,
        model_override=request.model
    )

    return response
