notepad main.py
from fastapi import FastAPI
from presets import router as agent_presets_router

app = FastAPI()

app.include_router(agent_presets_router)
