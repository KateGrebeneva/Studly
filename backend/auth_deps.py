"""Auth dependencies for role-based access"""
from fastapi import Depends, HTTPException, status
from auth import get_current_user

async def require_parent(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("parent", "admin"):
        raise HTTPException(status_code=403, detail="Parent access required")
    return current_user

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
