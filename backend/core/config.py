"""
应用配置
"""
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 数据目录
DATA_DIR = BASE_DIR / "data"

# 默认股票代码
DEFAULT_SYMBOL = "000155.sz"

# API 配置
API_V1_PREFIX = "/api/v1"

# CORS 配置
ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
]
