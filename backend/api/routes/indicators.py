"""
指标配置 API 路由
提供指标metadata给前端，用于自动生成设置面板
"""
from fastapi import APIRouter, HTTPException
from typing import List

from backend.services.indicators import (
    IndicatorMetadata,
    get_indicator_metadata,
    get_all_indicators,
    get_indicators_by_category,
)

# 创建路由器
router = APIRouter(
    prefix="/indicators",
    tags=["indicators"],
    responses={404: {"description": "Indicator not found"}},
)


@router.get("/", response_model=List[IndicatorMetadata])
async def list_indicators(category: str | None = None):
    """
    获取所有指标的配置Schema

    前端用这个接口来：
    1. 显示可添加的指标列表
    2. 自动生成设置面板（根据参数类型渲染表单控件）

    Args:
        category: 可选，按分类筛选 ('overlay', 'oscillator', 'volume')

    Returns:
        指标元数据列表

    Example Response:
    ```json
    [
        {
            "id": "ma",
            "name": "Moving Average",
            "category": "overlay",
            "description": "移动平均线...",
            "supports_multiple": true,
            "display_template": "ma-multi",
            "parameters": [
                {
                    "name": "periods",
                    "type": "multi_period",
                    "label": "周期",
                    "default": [5, 20, 60],
                    "options": [...]
                },
                ...
            ]
        },
        ...
    ]
    ```
    """
    if category:
        return get_indicators_by_category(category)
    return get_all_indicators()


@router.get("/{indicator_id}", response_model=IndicatorMetadata)
async def get_indicator(indicator_id: str):
    """
    获取单个指标的配置Schema

    Args:
        indicator_id: 指标ID (如 "ma", "kdj", "macd")

    Returns:
        指标元数据

    Raises:
        404: 指标不存在
    """
    metadata = get_indicator_metadata(indicator_id)
    if not metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Indicator '{indicator_id}' not found"
        )
    return metadata
