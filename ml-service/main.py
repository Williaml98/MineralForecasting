# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import preprocess, train, forecast, validate

app = FastAPI(
    title="BF Mining - ML Forecasting Service",
    version="1.0.0",
    description="Machine learning forecasting service for mineral demand prediction",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preprocess.router, prefix="/ml/preprocess", tags=["preprocess"])
app.include_router(train.router, prefix="/ml/train", tags=["train"])
app.include_router(forecast.router, prefix="/ml/forecast", tags=["forecast"])
app.include_router(validate.router, prefix="/ml/validate", tags=["validate"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}
