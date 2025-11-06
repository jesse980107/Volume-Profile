"""
技术指标库 - 统一导出
所有指标计算函数都使用 TA-Lib
"""

# 基础类
from .base import (
    ParameterType,
    ParameterOption,
    IndicatorParameter,
    IndicatorMetadata,
    IndicatorConfig,
    IndicatorCategory,
)

# 移动平均线系列
from .moving_average import (
    calculate_sma,
    calculate_ema,
    calculate_wma,
    MA_METADATA,
)

# MACD
from .macd import (
    calculate_macd,
    MACD_METADATA,
)

# KDJ
from .kdj import (
    calculate_kdj,
    KDJ_METADATA,
)

# RSI
from .rsi import (
    calculate_rsi,
    RSI_METADATA,
)

# 布林带
from .bollinger import (
    calculate_bollinger_bands,
    calculate_bollinger_bandwidth,
    BOLL_METADATA,
)

# 元数据注册表
from .metadata_registry import (
    INDICATOR_METADATA_REGISTRY,
    get_indicator_metadata,
    get_all_indicators,
    get_indicators_by_category,
    indicator_exists,
)

__all__ = [
    # 基础类
    'ParameterType',
    'ParameterOption',
    'IndicatorParameter',
    'IndicatorMetadata',
    'IndicatorConfig',
    'IndicatorCategory',
    # 移动平均线
    'calculate_sma',
    'calculate_ema',
    'calculate_wma',
    'MA_METADATA',
    # MACD
    'calculate_macd',
    'MACD_METADATA',
    # KDJ
    'calculate_kdj',
    'KDJ_METADATA',
    # RSI
    'calculate_rsi',
    'RSI_METADATA',
    # 布林带
    'calculate_bollinger_bands',
    'calculate_bollinger_bandwidth',
    'BOLL_METADATA',
    # 元数据注册表
    'INDICATOR_METADATA_REGISTRY',
    'get_indicator_metadata',
    'get_all_indicators',
    'get_indicators_by_category',
    'indicator_exists',
]
