from fastapi import APIRouter, Depends

from database.connection import get_db
from auth import get_current_user
from services import achievements_service

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("")
async def get_all_achievements(current_user: dict = Depends(get_current_user)):
    with get_db() as conn:
        return achievements_service.list_for_user(conn.cursor(), current_user["id"])
