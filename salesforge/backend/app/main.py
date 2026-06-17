from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SalesForge API",
    version="0.1.0",
    description="SalesForge CRM Backend API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Placeholder router for /api/v1 — populated in WU-03+
api_v1_router = APIRouter()
app.include_router(api_v1_router, prefix="/api/v1")


@app.get("/")
def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "salesforge-api"}
