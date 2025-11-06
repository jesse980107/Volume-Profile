"""
MACD 指标 (Moving Average Convergence Divergence)
平滑异同移动平均线

配置Schema：显示DIF/DEA/MACD柱
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


def calculate_macd(
    df: pd.DataFrame,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9
) -> pd.DataFrame:
    """
    计算 MACD 指标

    公式：
        DIF (MACD Line) = EMA(12) - EMA(26)
        DEA (Signal Line) = EMA(DIF, 9)
        MACD Histogram = (DIF - DEA) * 2

    Args:
        df: 包含 'close' 列的 DataFrame
        fast_period: 快线周期，默认 12
        slow_period: 慢线周期，默认 26
        signal_period: 信号线周期，默认 9

    Returns:
        添加了以下列的 DataFrame：
        - 'MACD': DIF线（快线与慢线的差值）
        - 'MACD_signal': DEA线（信号线）
        - 'MACD_hist': 柱状图（DIF-DEA）

    交易信号：
        - DIF上穿DEA：买入信号（金叉）
        - DIF下穿DEA：卖出信号（死叉）
        - 柱状图由负转正：买入
        - 柱状图由正转负：卖出

    典型参数：
        - 12, 26, 9：标准设置
        - 6, 19, 9：短期趋势
        - 19, 39, 9：长期趋势
    """
    result = df.copy()

    macd, signal, histogram = talib.MACD(
        df['close'].values,
        fastperiod=fast_period,
        slowperiod=slow_period,
        signalperiod=signal_period
    )

    result['MACD'] = macd
    result['MACD_signal'] = signal
    result['MACD_hist'] = histogram

    return result


# ==================== MACD 指标配置 Schema ====================

MACD_METADATA = IndicatorMetadata(
    id="macd",
    name="MACD",
    category=IndicatorCategory.OSCILLATOR,
    description="MACD指标，显示趋势和动量",
    supports_multiple=False,
    display_template="macd",  # 显示DIF和DEA值
    parameters=[
        IndicatorParameter(
            name="fast_period",
            type=ParameterType.NUMBER,
            label="快线周期",
            default=12,
            min=1,
            max=100,
            step=1,
            description="快速EMA周期"
        ),
        IndicatorParameter(
            name="slow_period",
            type=ParameterType.NUMBER,
            label="慢线周期",
            default=26,
            min=1,
            max=100,
            step=1,
            description="慢速EMA周期"
        ),
        IndicatorParameter(
            name="signal_period",
            type=ParameterType.NUMBER,
            label="信号线周期",
            default=9,
            min=1,
            max=50,
            step=1,
            description="DEA平滑周期"
        ),
        IndicatorParameter(
            name="dif_color",
            type=ParameterType.COLOR,
            label="DIF线颜色",
            default="#2962FF",
            description="MACD DIF线颜色"
        ),
        IndicatorParameter(
            name="dea_color",
            type=ParameterType.COLOR,
            label="DEA线颜色",
            default="#FF6D00",
            description="信号线颜色"
        ),
        IndicatorParameter(
            name="histogram_up_color",
            type=ParameterType.COLOR,
            label="柱状图上涨颜色",
            default="#26A69A",
            description="MACD柱大于0时的颜色"
        ),
        IndicatorParameter(
            name="histogram_down_color",
            type=ParameterType.COLOR,
            label="柱状图下跌颜色",
            default="#EF5350",
            description="MACD柱小于0时的颜色"
        )
    ]
)
