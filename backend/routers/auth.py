from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from database.connection import get_db
from models.user import UserCreate, UserResponse, Token
from auth import verify_password, get_password_hash, create_access_token

# админа самому зарегистрировать нельзя, его назначают вручную
PUBLIC_ROLES = {"student", "parent", "teacher"}

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    email = user_data.email.strip().lower()
    role = user_data.role if user_data.role in PUBLIC_ROLES else None
    if role is None:
        raise HTTPException(status_code=400, detail="Недопустимая роль")
    if len(user_data.password or "") < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не короче 6 символов")
    name = (user_data.name or "").strip() or email.split("@")[0]
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Этот email уже зарегистрирован"
            )
        
        password_hash = get_password_hash(user_data.password)
        cursor.execute(
            """INSERT INTO users (email, password_hash, name, role) 
               VALUES (%s, %s, %s, %s)""",
            (email, password_hash, name, role)
        )
        user_id = cursor.lastrowid
        
        cursor.execute(
            "SELECT id, email, name, role, avatar_url, theme, created_at FROM users WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        if user:
            if user.get("created_at"):
                user["created_at"] = user["created_at"].isoformat()
        return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, password_hash, name, role, avatar_url, theme, created_at FROM users WHERE LOWER(email) = %s",
            (form_data.username.strip().lower(),)
        )
        user = cursor.fetchone()
        
        if not user or not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": str(user["id"])})
        
        created_at = user["created_at"]
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        user_response = {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "avatar_url": user["avatar_url"],
            "theme": user["theme"],
            "created_at": created_at
        }
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }

