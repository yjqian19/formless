from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import memories, matching

app = FastAPI(title="Formless Backend API", version="0.1.0")

# Configure CORS to allow requests from Extension and Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(memories.router, prefix="/api/memories", tags=["memories"])
app.include_router(matching.router, prefix="/api/matching", tags=["matching"])


@app.get("/")
def root():
    return {"message": "Formless Backend API", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
