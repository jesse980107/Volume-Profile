"""
指标元数据注册表
集中管理所有指标的配置Schema
前端通过API获取这些metadata来自动生成设置面板
"""
from typing import Dict, List, Optional
from .base import IndicatorMetadata
from .moving_average import MA_METADATA
from .kdj import KDJ_METADATA
from .macd import MACD_METADATA
from .rsi import RSI_METADATA
from .bollinger import BOLL_METADATA


# ==================== 指标元数据注册表 ====================
# 所有指标的配置Schema都在这里注册
# ====================

INDICATOR_METADATA_REGISTRY: Dict[str, IndicatorMetadata] = {
    "ma": MA_METADATA,
    "kdj": KDJ_METADATA,
    "macd": MACD_METADATA,
    "rsi": RSI_METADATA,
    "boll": BOLL_METADATA,
}


# ==================== 工具函数 ====================

def get_indicator_metadata(indicator_id: str) -> Optional[IndicatorMetadata]:
    """
    获取指标元数据

    Args:
        indicator_id: 指标ID（如 "ma", "kdj"）

    Returns:
        IndicatorMetadata 或 None
    """
    return INDICATOR_METADATA_REGISTRY.get(indicator_id)


def get_all_indicators() -> List[IndicatorMetadata]:
    """
    获取所有指标元数据

    Returns:
        指标元数据列表
    """
    return list(INDICATOR_METADATA_REGISTRY.values())


def get_indicators_by_category(category: str) -> List[IndicatorMetadata]:
    """
    根据分类获取指标

    Args:
        category: 指标分类 ('overlay', 'oscillator', 'volume')

    Returns:
        指定分类的指标列表
    """
    return [
        metadata
        for metadata in INDICATOR_METADATA_REGISTRY.values()
        if metadata.category == category
    ]


def indicator_exists(indicator_id: str) -> bool:
    """
    检查指标是否存在

    Args:
        indicator_id: 指标ID

    Returns:
        布尔值
    """
    return indicator_id in INDICATOR_METADATA_REGISTRY
