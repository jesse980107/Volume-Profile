"""
FastAPI 主应用 - 优雅、现代、简洁
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import API_V1_PREFIX, ALLOWED_ORIGINS
from backend.api.routes import stock, indicators, config

# 创建 FastAPI 应用
app = FastAPI(
    title="📈 Stock Analysis API",
    description="现代化股票分析系统 - Lightweight Charts + FastAPI",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由 (使用 APIRouter 模块化)
app.include_router(stock.router, prefix=API_V1_PREFIX)
app.include_router(indicators.router, prefix=API_V1_PREFIX)
app.include_router(config.router, prefix=API_V1_PREFIX)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/config", StaticFiles(directory="frontend/config"), name="config")


@app.get("/")
async def root():
    """主页 - 返回前端页面"""
    return FileResponse("frontend/index.html")


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "stock-analysis-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开发模式自动重载
    )
