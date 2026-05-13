from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, subjects, tasks, sessions, profile, achievements, goals, stats, activity_zones, ai_planner, parent, admin

app = FastAPI(title="Studly API", version="1.0.0")

# CORS middleware — явно разрешаем Authorization для Bearer token
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(tasks.router)
app.include_router(sessions.router)
app.include_router(profile.router)
app.include_router(achievements.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(activity_zones.router)
app.include_router(ai_planner.router)
app.include_router(parent.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {"message": "Studly API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
