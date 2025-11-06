"""
配置管理 API 路由
用于保存和加载前端配置（indicators.config.json）
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import json
from pathlib import Path

# 创建路由器
router = APIRouter(
    prefix="/config",
    tags=["config"],
)

# 配置文件路径
CONFIG_FILE_PATH = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "config" / "indicators.config.json"


class IndicatorConfigRequest(BaseModel):
    """前端配置请求模型"""
    version: str
    indicators: Dict[str, Any]


@router.post("/indicators")
async def save_indicator_config(config: IndicatorConfigRequest):
    """
    保存指标配置到本地 JSON 文件

    Args:
        config: 前端发送的完整配置对象

    Returns:
        保存结果

    Example Request:
    ```json
    {
        "version": "1.0",
        "indicators": {
            "ma": {
                "enabled": true,
                "visible": true,
                "parameters": {
                    "period1": 5,
                    "color1": "#2962FF",
                    ...
                }
            },
            ...
        }
    }
    ```
    """
    try:
        # 确保目录存在
        CONFIG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

        # 将配置写入文件（格式化输出）
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(config.dict(), f, indent=2, ensure_ascii=False)

        print(f"✅ 配置文件已保存: {CONFIG_FILE_PATH}")

        return {
            "status": "success",
            "message": "Configuration saved successfully",
            "path": str(CONFIG_FILE_PATH)
        }
    except Exception as e:
        print(f"❌ 保存配置文件失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save configuration: {str(e)}"
        )


@router.get("/indicators")
async def get_indicator_config():
    """
    读取指标配置文件

    Returns:
        配置对象
    """
    try:
        if not CONFIG_FILE_PATH.exists():
            raise HTTPException(
                status_code=404,
                detail="Configuration file not found"
            )

        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)

        return config
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 读取配置文件失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read configuration: {str(e)}"
        )
