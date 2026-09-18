from fastapi import APIRouter, status
from typing import Optional

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.nim_service import nim_service
from app.services.dataset_service import dataset_service
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["AI Chat"])

@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask AI Analyst",
    description="Conversational endpoint powered by NVIDIA NIM, grounded strictly in dataset schema."
)
async def ask_chat(request: ChatRequest) -> ChatResponse:
    dataset = None
    if request.dataset_id:
        try:
            dataset = dataset_service.get_dataset(request.dataset_id)
        except Exception as e:
            logger.warning(f"Could not load dataset {request.dataset_id} for chat context: {e}")

    logger.info(f"Received chat request: '{request.question}' (Dataset: {dataset.name if dataset else 'None'})")

    response = await nim_service.generate_response(
        question=request.question,
        dataset=dataset,
        conversation_history=request.conversation_history,
        model_override=request.model
    )

    return response
