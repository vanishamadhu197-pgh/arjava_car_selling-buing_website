import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from backend.config import settings

router = APIRouter(prefix="/upload", tags=["Media Uploads"])

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_car_photos(files: List[UploadFile] = File(...)):
    """Uploads multiple vehicle photos with type & size validation to persistent storage."""
    uploaded_items = []
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    for file in files:
        # Validate MIME type
        if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' rejected. Allowed formats: JPG, JPEG, PNG, WebP."
            )

        # Generate unique filename
        ext = os.path.splitext(file.filename)[1].lower()
        if not ext:
            ext = ".jpg"
        unique_name = f"ak_{uuid.uuid4().hex[:12]}{ext}"
        destination_path = os.path.join(settings.UPLOAD_DIR, unique_name)

        # Write stream to disk
        try:
            with open(destination_path, "wb") as buffer:
                size = 0
                while content := await file.read(1024 * 1024): # 1MB chunk
                    size += len(content)
                    if size > max_bytes:
                        # Clean up and raise
                        buffer.close()
                        os.remove(destination_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File '{file.filename}' exceeds {settings.MAX_FILE_SIZE_MB}MB limit."
                        )
                    buffer.write(content)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )

        # Public relative URL served via FastAPI static mount
        storage_url = f"/uploads/{unique_name}"
        uploaded_items.append({
            "filename": file.filename,
            "unique_filename": unique_name,
            "storage_url": storage_url,
            "media_type": "image",
            "content_type": file.content_type
        })

    return {
        "success": True,
        "count": len(uploaded_items),
        "files": uploaded_items
    }
