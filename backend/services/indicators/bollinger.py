"""
布林带指标 (Bollinger Bands)
由 John Bollinger 在1980年代发明

配置Schema：显示上/中/下轨
"""
import pandas as pd
import talib
from .base import (
    IndicatorMetadata,
    IndicatorParameter,
    ParameterType,
    IndicatorCategory
)


def calculate_bollinger_bands(
    df: pd.DataFrame,
    period: int = 20,
    nbdev_up: float = 2.0,
    nbdev_down: float = 2.0
) -> pd.DataFrame:
    """
    计算布林带指标

    公式：
        中轨 (Middle Band) = SMA(Close, period)
        上轨 (Upper Band) = 中轨 + nbdev * StdDev(Close, period)
        下轨 (Lower Band) = 中轨 - nbdev * StdDev(Close, period)

    Args:
        df: 包含 'close' 列的 DataFrame
        period: 计算周期，默认 20
        nbdev_up: 上轨标准差倍数，默认 2.0
        nbdev_down: 下轨标准差倍数，默认 2.0

    Returns:
        添加了以下列的 DataFrame：
        - 'BOLL_upper': 上轨
        - 'BOLL_middle': 中轨
        - 'BOLL_lower': 下轨

    交易信号：
        - 价格触及上轨：超买，可能回调
        - 价格触及下轨：超卖，可能反弹
        - 价格突破上轨：强势信号，可能继续上涨
        - 价格跌破下轨：弱势信号，可能继续下跌

    布林带收窄（Squeeze）：
        - 上下轨距离缩小：波动率下降，可能即将突破
        - 通常预示大行情即将来临

    布林带宽度：
        - 宽度 = (上轨 - 下轨) / 中轨
        - 可用于衡量市场波动性

    典型参数：
        - 20, 2.0, 2.0：标准设置（Bollinger原始参数）
        - 20, 2.5, 2.5：更宽的通道，减少假信号
        - 10, 1.5, 1.5：短期交易，更敏感

    注意：
        - 约95%的价格应在布林带内（假设正态分布）
        - 布林带不是固定的支撑/阻力位
        - 强趋势中，价格可以沿着上轨或下轨运行
    """
    result = df.copy()

    upper, middle, lower = talib.BBANDS(
        df['close'].values,
        timeperiod=period,
        nbdevup=nbdev_up,
        nbdevdn=nbdev_down,
        matype=0  # SMA
    )

    result['BOLL_upper'] = upper
    result['BOLL_middle'] = middle
    result['BOLL_lower'] = lower

    return result


def calculate_bollinger_bandwidth(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算布林带宽度（需要先计算布林带）

    公式：
        BandWidth = (上轨 - 下轨) / 中轨 * 100

    Args:
        df: 包含 'BOLL_upper', 'BOLL_middle', 'BOLL_lower' 列的 DataFrame

    Returns:
        添加了 'BOLL_bandwidth' 列的 DataFrame

    用途：
        - 衡量市场波动性
        - 识别收窄（Squeeze）和扩张阶段
        - 宽度越小，突破概率越大
    """
    result = df.copy()

    if all(col in df.columns for col in ['BOLL_upper', 'BOLL_middle', 'BOLL_lower']):
        result['BOLL_bandwidth'] = (
            (df['BOLL_upper'] - df['BOLL_lower']) / df['BOLL_middle'] * 100
        )
    else:
        raise ValueError("请先计算布林带指标")

    return result


# ==================== BOLL 指标配置 Schema ====================

BOLL_METADATA = IndicatorMetadata(
    id="boll",
    name="Bollinger Bands",
    category=IndicatorCategory.OVERLAY,
    description="布林带，显示价格波动区间",
    supports_multiple=False,
    display_template="boll",  # 显示上/中/下轨值
    parameters=[
        IndicatorParameter(
            name="period",
            type=ParameterType.NUMBER,
            label="周期",
            default=20,
            min=1,
            max=100,
            step=1,
            description="中轨SMA周期"
        ),
        IndicatorParameter(
            name="nbdev_up",
            type=ParameterType.NUMBER,
            label="上轨标准差倍数",
            default=2.0,
            min=0.1,
            max=5.0,
            step=0.1,
            description="上轨 = 中轨 + n×标准差"
        ),
        IndicatorParameter(
            name="nbdev_down",
            type=ParameterType.NUMBER,
            label="下轨标准差倍数",
            default=2.0,
            min=0.1,
            max=5.0,
            step=0.1,
            description="下轨 = 中轨 - n×标准差"
        ),
        IndicatorParameter(
            name="upper_color",
            type=ParameterType.COLOR,
            label="上轨颜色",
            default="#FF6D00",
            description="上轨线颜色"
        ),
        IndicatorParameter(
            name="middle_color",
            type=ParameterType.COLOR,
            label="中轨颜色",
            default="#2962FF",
            description="中轨线颜色"
        ),
        IndicatorParameter(
            name="lower_color",
            type=ParameterType.COLOR,
            label="下轨颜色",
            default="#00C853",
            description="下轨线颜色"
        )
    ]
)
