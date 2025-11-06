"""
移动平均线指标 (Moving Averages)
包含：SMA（简单移动平均）、EMA（指数移动平均）

配置Schema：支持多周期同时显示
"""
import pandas as pd
import talib
from .base import (
    IndicatorMetadata,
    IndicatorParameter,
    ParameterType,
    ParameterOption,
    IndicatorCategory
)


def calculate_sma(df: pd.DataFrame, period: int) -> pd.DataFrame:
    """
    计算简单移动平均线 (Simple Moving Average)

    公式：SMA = (P1 + P2 + ... + Pn) / n

    Args:
        df: 包含 'close' 列的 DataFrame
        period: 计算周期（例如：5, 10, 20, 60）

    Returns:
        添加了 'SMA{period}' 列的 DataFrame

    示例：
        calculate_sma(df, 5)  -> 添加 'SMA5' 列
    """
    result = df.copy()
    column_name = f'SMA{period}'
    result[column_name] = talib.SMA(df['close'].values, timeperiod=period)
    return result


def calculate_ema(df: pd.DataFrame, period: int) -> pd.DataFrame:
    """
    计算指数移动平均线 (Exponential Moving Average)

    公式：EMA = (Close - EMA_prev) * multiplier + EMA_prev
         其中 multiplier = 2 / (period + 1)

    Args:
        df: 包含 'close' 列的 DataFrame
        period: 计算周期（例如：12, 26）

    Returns:
        添加了 'EMA{period}' 列的 DataFrame

    说明：
        EMA 对最近价格赋予更高权重，比 SMA 更敏感
    """
    result = df.copy()
    column_name = f'EMA{period}'
    result[column_name] = talib.EMA(df['close'].values, timeperiod=period)
    return result


def calculate_wma(df: pd.DataFrame, period: int) -> pd.DataFrame:
    """
    计算加权移动平均线 (Weighted Moving Average)

    公式：WMA = (n*P1 + (n-1)*P2 + ... + 1*Pn) / (n + (n-1) + ... + 1)

    Args:
        df: 包含 'close' 列的 DataFrame
        period: 计算周期

    Returns:
        添加了 'WMA{period}' 列的 DataFrame

    说明：
        WMA 对最近价格赋予线性递增的权重
    """
    result = df.copy()
    column_name = f'WMA{period}'
    result[column_name] = talib.WMA(df['close'].values, timeperiod=period)
    return result


# ==================== MA 指标配置 Schema ====================

MA_METADATA = IndicatorMetadata(
    id="ma",
    name="Moving Average",
    category=IndicatorCategory.OVERLAY,
    description="移动平均线，支持 SMA/EMA/WMA 类型。",
    supports_multiple=True,
    display_template="ma-multi",
    parameters=[
        # MA Type
        IndicatorParameter(
            name="ma_type",
            type=ParameterType.SELECT,
            label="MA 类型",
            default="sma",
            options=[
                ParameterOption(value="sma", label="SMA (简单移动平均)"),
                ParameterOption(value="ema", label="EMA (指数移动平均)"),
                ParameterOption(value="wma", label="WMA (加权移动平均)"),
            ],
            description="选择移动平均线的计算方式"
        ),
        # Line 1
        IndicatorParameter(
            name="period1",
            type=ParameterType.NUMBER,
            label="Line 1 - 周期",
            default=5,
            min=1,
            max=500,
            step=1,
            description="第一条MA线的周期"
        ),
        IndicatorParameter(
            name="color1",
            type=ParameterType.SELECT,
            label="Line 1 - 颜色",
            default="#2962FF",
            options=[
                ParameterOption(value="invisible", label="隐藏 (Invisible)"),
                ParameterOption(value="#2962FF", label="蓝色"),
                ParameterOption(value="#FF6B6B", label="红色"),
                ParameterOption(value="#4ECDC4", label="青色"),
                ParameterOption(value="#FFA500", label="橙色"),
                ParameterOption(value="#9C27B0", label="紫色"),
                ParameterOption(value="#4CAF50", label="绿色"),
                ParameterOption(value="#FFEB3B", label="黄色"),
            ],
            description="第一条MA线的颜色，选择 invisible 隐藏该线"
        ),
        # Line 2
        IndicatorParameter(
            name="period2",
            type=ParameterType.NUMBER,
            label="Line 2 - 周期",
            default=20,
            min=1,
            max=500,
            step=1,
            description="第二条MA线的周期"
        ),
        IndicatorParameter(
            name="color2",
            type=ParameterType.SELECT,
            label="Line 2 - 颜色",
            default="#E91E63",
            options=[
                ParameterOption(value="invisible", label="隐藏 (Invisible)"),
                ParameterOption(value="#2962FF", label="蓝色"),
                ParameterOption(value="#FF6B6B", label="红色"),
                ParameterOption(value="#4ECDC4", label="青色"),
                ParameterOption(value="#FFA500", label="橙色"),
                ParameterOption(value="#9C27B0", label="紫色"),
                ParameterOption(value="#4CAF50", label="绿色"),
                ParameterOption(value="#FFEB3B", label="黄色"),
                ParameterOption(value="#E91E63", label="粉色"),
            ],
            description="第二条MA线的颜色，选择 invisible 隐藏该线"
        ),
        # Line 3
        IndicatorParameter(
            name="period3",
            type=ParameterType.NUMBER,
            label="Line 3 - 周期",
            default=60,
            min=1,
            max=500,
            step=1,
            description="第三条MA线的周期"
        ),
        IndicatorParameter(
            name="color3",
            type=ParameterType.SELECT,
            label="Line 3 - 颜色",
            default="#FFA500",
            options=[
                ParameterOption(value="invisible", label="隐藏 (Invisible)"),
                ParameterOption(value="#2962FF", label="蓝色"),
                ParameterOption(value="#FF6B6B", label="红色"),
                ParameterOption(value="#4ECDC4", label="青色"),
                ParameterOption(value="#FFA500", label="橙色"),
                ParameterOption(value="#9C27B0", label="紫色"),
                ParameterOption(value="#4CAF50", label="绿色"),
                ParameterOption(value="#FFEB3B", label="黄色"),
            ],
            description="第三条MA线的颜色，选择 invisible 隐藏该线"
        ),
    ]
)
