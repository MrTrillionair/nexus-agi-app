notepad presets.py
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List
from jose import JWTError, jwt

# Constants
SECRET_KEY = "a_very_secret_key_should_be_changed"
ALGORITHM = "HS256"

router = APIRouter(prefix="/agents", tags=["agents"])

# User model
class User(BaseModel):
    username: str
    full_name: str
    role: str
    disabled: bool | None = None

# Simulated user database
fake_users_db = {
    "owner@example.com": {
        "username": "owner@example.com",
        "full_name": "Empire Owner",
        "hashed_password": "fakehashed",
        "role": "owner",
        "disabled": False,
    },
    "client@example.com": {
        "username": "client@example.com",
        "full_name": "Business Client",
        "hashed_password": "fakehashed",
        "role": "user",
        "disabled": False,
    },
}

def get_user(db, username: str):
    if username in db:
        return User(**db[username])

async def get_current_user(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = get_user(fake_users_db, username)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token validation error")

# Agent templates
AGENT_PRESETS = {
    "lead_magnet": {
        "name": "Lead Magnet",
        "description": "Scrapes and ranks potential leads from selected websites.",
        "features": ["Email Scraping", "Phone Parsing", "Geo-Sorting", "Conversion Score"],
        "power": "Medium"
    },
    "ad_booster": {
        "name": "Ad Booster",
        "description": "Generates ad copy and posts automatically at optimal times.",
        "features": ["Ad Copy Generator", "Post Scheduler", "Campaign Tracker"],
        "power": "High"
    },
    "product_watcher": {
        "name": "Product Market Watcher",
        "description": "Tracks trending products and competitors.",
        "features": ["Product Tracker", "Price Scanner", "Notifications"],
        "power": "Strategic"
    }
}

class AgentTemplate(BaseModel):
    id: str
    name: str
    description: str
    features: List[str]
    power: str

@router.get("/presets", response_model=List[AgentTemplate])
def get_agent_presets(current_user: User = Depends(get_current_user)):
    return [
        AgentTemplate(
            id=key,
            name=data["name"],
            description=data["description"],
            features=data["features"],
            power=data["power"]
        )
        for key, data in AGENT_PRESETS.items()
    ]
