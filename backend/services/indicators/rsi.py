"""
RSI 指标 (Relative Strength Index)
相对强弱指标

配置Schema：单一数值
"""
import pandas as pd
import talib
from .base import (
    IndicatorMetadata,
    IndicatorParameter,
    ParameterType,
    IndicatorCategory
)


def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """
    计算 RSI 指标

    公式：
        RS = 平均涨幅 / 平均跌幅
        RSI = 100 - (100 / (1 + RS))

    Args:
        df: 包含 'close' 列的 DataFrame
        period: 计算周期，默认 14

    Returns:
        添加了 'RSI' 列的 DataFrame

    交易信号：
        - RSI > 70：超买区域，可能回调
        - RSI < 30：超卖区域，可能反弹
        - RSI = 50：中性位置
        - RSI 突破50：趋势确认

    背离信号：
        - 价格新高但RSI未创新高：顶背离，卖出信号
        - 价格新低但RSI未创新低：底背离，买入信号

    典型参数：
        - 14：标准设置（Wilder原始参数）
        - 9：短期交易
        - 25：长期趋势

    注意：
        - RSI在0-100之间波动
        - 强势市场中，RSI > 70 可以持续很久
        - 弱势市场中，RSI < 30 也可以持续很久
    """
    result = df.copy()
    result['RSI'] = talib.RSI(df['close'].values, timeperiod=period)
    return result


# ==================== RSI 指标配置 Schema ====================

RSI_METADATA = IndicatorMetadata(
    id="rsi",
    name="RSI",
    category=IndicatorCategory.OSCILLATOR,
    description="相对强弱指标，判断超买超卖",
    supports_multiple=False,
    display_template="single-value",  # 单一数值显示
    parameters=[
        IndicatorParameter(
            name="period",
            type=ParameterType.NUMBER,
            label="周期",
            default=14,
            min=1,
            max=100,
            step=1,
            description="RSI计算周期"
        ),
        IndicatorParameter(
            name="color",
            type=ParameterType.COLOR,
            label="线条颜色",
            default="#9C27B0",
            description="RSI线的颜色"
        ),
        IndicatorParameter(
            name="overbought",
            type=ParameterType.NUMBER,
            label="超买线",
            default=70,
            min=50,
            max=100,
            step=1,
            description="超买区域阈值"
        ),
        IndicatorParameter(
            name="oversold",
            type=ParameterType.NUMBER,
            label="超卖线",
            default=30,
            min=0,
            max=50,
            step=1,
            description="超卖区域阈值"
        )
    ]
)
