"""
指标注册中心 - 配置化管理所有技术指标
在这里添加新指标，系统会自动处理计算、响应构建
"""
from typing import Callable, Any
from dataclasses import dataclass
import pandas as pd

# 从 indicators 文件夹导入所有指标计算函数
from .indicators import (
    calculate_sma,
    calculate_ema,
    calculate_wma,
    calculate_macd,
    calculate_kdj,
    calculate_rsi,
    calculate_bollinger_bands,
)


@dataclass
class IndicatorConfig:
    """指标配置"""
    id: str                          # 指标ID，例如 'sma5'
    label: str                       # 显示名称，例如 'MA5'
    calculator: Callable             # 计算函数
    response_fields: list[str]       # 响应字段名列表
    category: str                    # 分类: 'overlay', 'oscillator', 'volume'


# ==================== 指标注册表 ====================
# 💡 在这里添加新指标！只需要一行配置即可
# ====================

INDICATOR_REGISTRY: list[IndicatorConfig] = [
    # ==================== 移动平均线 ====================
    IndicatorConfig(
        id='sma5',
        label='MA5',
        calculator=lambda df: calculate_sma(df, 5),
        response_fields=['SMA5'],
        category='overlay'
    ),
    IndicatorConfig(
        id='sma10',
        label='MA10',
        calculator=lambda df: calculate_sma(df, 10),
        response_fields=['SMA10'],
        category='overlay'
    ),
    IndicatorConfig(
        id='sma20',
        label='MA20',
        calculator=lambda df: calculate_sma(df, 20),
        response_fields=['SMA20'],
        category='overlay'
    ),
    IndicatorConfig(
        id='sma60',
        label='MA60',
        calculator=lambda df: calculate_sma(df, 60),
        response_fields=['SMA60'],
        category='overlay'
    ),

    # ==================== MACD ====================
    IndicatorConfig(
        id='macd',
        label='MACD',
        calculator=calculate_macd,
        response_fields=['MACD', 'MACD_signal', 'MACD_hist'],
        category='oscillator'
    ),

    # ==================== KDJ ====================
    IndicatorConfig(
        id='kdj',
        label='KDJ',
        calculator=calculate_kdj,
        response_fields=['K', 'D', 'J'],
        category='oscillator'
    ),

    # ==================== RSI ====================
    IndicatorConfig(
        id='rsi',
        label='RSI',
        calculator=lambda df: calculate_rsi(df, 14),
        response_fields=['RSI'],
        category='oscillator'
    ),

    # ==================== 布林带 ====================
    IndicatorConfig(
        id='boll',
        label='BOLL',
        calculator=lambda df: calculate_bollinger_bands(df, 20, 2.0, 2.0),
        response_fields=['BOLL_upper', 'BOLL_middle', 'BOLL_lower'],
        category='overlay'
    ),
]


# ==================== 工具函数 ====================

def get_indicator_by_id(indicator_id: str) -> IndicatorConfig | None:
    """根据ID获取指标配置"""
    for indicator in INDICATOR_REGISTRY:
        if indicator.id == indicator_id:
            return indicator
    return None


def get_all_indicators() -> list[IndicatorConfig]:
    """获取所有指标配置"""
    return INDICATOR_REGISTRY


def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """计算所有注册的指标"""
    result = df.copy()
    for indicator in INDICATOR_REGISTRY:
        result = indicator.calculator(result)
    return result.fillna(0)
