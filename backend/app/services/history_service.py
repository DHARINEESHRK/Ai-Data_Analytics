import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config.settings import settings
from app.schemas.history import HistoryItemCreate, HistoryItemResponse, HistoryListResponse
from app.utils.logger import logger

class HistoryService:
    """Manages persistent analysis history without storing bulky dataset records."""

    def __init__(self):
        self.history_file = settings.STORAGE_DIR / "analysis_history.json"
        self._history: List[Dict[str, Any]] = []
        self._load_history()

    def _load_history(self) -> None:
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    self._history = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load analysis history: {e}")
                self._history = []
        else:
            self._history = []

    def _save_history(self) -> None:
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self._history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save analysis history: {e}")

    def add_entry(self, entry: HistoryItemCreate) -> HistoryItemResponse:
        """Appends a new analytical query outcome to history."""
        item_id = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        record = {
            "id": item_id,
            "question": entry.question,
            "dataset_id": entry.dataset_id,
            "dataset_name": entry.dataset_name,
            "timestamp": timestamp_str,
            "answer": entry.answer,
            "direct_answer": entry.direct_answer,
            "key_insight": entry.key_insight,
            "analysis_type": entry.analysis_type or "SQL Aggregation",
            "sql": entry.sql,
            "chart_config": entry.chart_config,
            "duration_ms": entry.duration_ms or 0
        }

        self._history.insert(0, record)
        # Retain last 200 items in history
        if len(self._history) > 200:
            self._history = self._history[:200]
            
        self._save_history()
        return HistoryItemResponse(**record)

    def list_entries(
        self, 
        query: Optional[str] = None, 
        analysis_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> HistoryListResponse:
        """Searches and paginates historical analysis logs."""
        filtered = self._history

        if query:
            q_lower = query.lower()
            filtered = [
                item for item in filtered
                if q_lower in item["question"].lower() 
                or q_lower in item["dataset_name"].lower()
                or q_lower in (item.get("answer") or "").lower()
            ]

        if analysis_type and analysis_type.lower() != "all":
            filtered = [
                item for item in filtered 
                if item.get("analysis_type", "").lower() == analysis_type.lower()
            ]

        total = len(filtered)
        paged = filtered[offset:offset + limit]

        return HistoryListResponse(
            total=total,
            items=[HistoryItemResponse(**item) for item in paged]
        )

    def get_entry(self, item_id: str) -> Optional[HistoryItemResponse]:
        for item in self._history:
            if item["id"] == item_id:
                return HistoryItemResponse(**item)
        return None

    def delete_entry(self, item_id: str) -> bool:
        initial_len = len(self._history)
        self._history = [item for item in self._history if item["id"] != item_id]
        if len(self._history) < initial_len:
            self._save_history()
            return True
        return False

    def clear_all(self) -> None:
        self._history = []
        self._save_history()

history_service = HistoryService()
