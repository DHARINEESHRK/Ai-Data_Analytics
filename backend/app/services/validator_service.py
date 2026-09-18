import io
from pathlib import Path
from fastapi import UploadFile
import pandas as pd
from app.config.settings import settings
from app.utils.exceptions import DatasetValidationError
from app.utils.logger import logger

class ValidatorService:
    @staticmethod
    def validate_file_metadata(file: UploadFile) -> str:
        """Validates filename extension and presence."""
        if not file.filename:
            raise DatasetValidationError("Filename cannot be empty.")

        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise DatasetValidationError(
                f"Unsupported file format '{ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}",
                details={"provided_extension": ext, "allowed_extensions": settings.ALLOWED_EXTENSIONS}
            )
        return ext

    @staticmethod
    def validate_file_content(content: bytes, ext: str) -> pd.DataFrame:
        """Validates file size, non-emptiness, encoding, and parseability."""
        file_size = len(content)
        if file_size == 0:
            raise DatasetValidationError("Uploaded file is empty (0 bytes).")

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise DatasetValidationError(
                f"File size ({file_size / (1024 * 1024):.1f} MB) exceeds maximum allowed limit ({settings.MAX_UPLOAD_SIZE_MB} MB).",
                details={"file_size_bytes": file_size, "max_allowed_mb": settings.MAX_UPLOAD_SIZE_MB}
            )

        # Attempt parsing dataframe to verify structural integrity
        try:
            if ext == ".csv":
                df = ValidatorService._read_csv_with_encoding(content)
            elif ext in [".xlsx", ".xls"]:
                df = pd.read_excel(io.BytesIO(content))
            else:
                raise DatasetValidationError(f"Unsupported format: {ext}")
        except DatasetValidationError:
            raise
        except Exception as e:
            logger.error(f"Failed to parse dataset content: {e}")
            raise DatasetValidationError(
                f"Malformed or corrupted dataset: Unable to parse file as {ext}.",
                details={"error_reason": str(e)}
            )

        if df.empty:
            raise DatasetValidationError("The dataset contains zero data rows.")

        if len(df.columns) == 0:
            raise DatasetValidationError("The dataset contains zero columns.")

        return df

    @staticmethod
    def _read_csv_with_encoding(content: bytes) -> pd.DataFrame:
        """Attempts reading CSV with common encodings: utf-8, latin-1, cp1252, utf-16."""
        encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-16']
        last_err = None

        for enc in encodings:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc)
                return df
            except Exception as e:
                last_err = e
                continue

        raise DatasetValidationError(
            f"Encoding error: Unable to decode CSV with supported encodings ({', '.join(encodings)}).",
            details={"last_error": str(last_err)}
        )

validator_service = ValidatorService()
