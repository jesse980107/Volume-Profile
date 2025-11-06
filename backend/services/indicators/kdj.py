"""
KDJ 指标 (随机指标)
Stochastic Oscillator 的中国改良版

配置Schema：显示K/D/J三条线
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


def calculate_kdj(
    df: pd.DataFrame,
    fastk_period: int = 9,
    slowk_period: int = 3,
    slowd_period: int = 3
) -> pd.DataFrame:
    """
    计算 KDJ 指标

    公式：
        RSV = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
        K = SMA(RSV, slowk_period)
        D = SMA(K, slowd_period)
        J = 3 * K - 2 * D

    Args:
        df: 包含 'high', 'low', 'close' 列的 DataFrame
        fastk_period: RSV 计算周期，默认 9
        slowk_period: K 线平滑周期，默认 3
        slowd_period: D 线平滑周期，默认 3

    Returns:
        添加了以下列的 DataFrame：
        - 'K': K线（快线）
        - 'D': D线（慢线）
        - 'J': J线（超快线）

    交易信号：
        - K上穿D：买入信号（金叉）
        - K下穿D：卖出信号（死叉）
        - K、D、J < 20：超卖区域，可能反弹
        - K、D、J > 80：超买区域，可能回调
        - J < 0 或 > 100：极端超卖/超买

    典型参数：
        - 9, 3, 3：标准设置（中国市场常用）
        - 14, 3, 3：更平滑的信号
        - 5, 3, 3：短期交易

    注意：
        - J线波动最快，K线次之，D线最慢
        - J线可以超出0-100范围
    """
    result = df.copy()

    # 使用 TA-Lib 的 STOCH 函数计算 K 和 D
    k, d = talib.STOCH(
        df['high'].values,
        df['low'].values,
        df['close'].values,
        fastk_period=fastk_period,
        slowk_period=slowk_period,
        slowd_period=slowd_period
    )

    # 计算 J 线：J = 3K - 2D
    j = 3 * k - 2 * d

    result['K'] = k
    result['D'] = d
    result['J'] = j

    return result


# ==================== KDJ 指标配置 Schema ====================

KDJ_METADATA = IndicatorMetadata(
    id="kdj",
    name="KDJ",
    category=IndicatorCategory.OSCILLATOR,
    description="随机指标，判断超买超卖状态",
    supports_multiple=False,  # KDJ只能添加一个实例
    display_template="kdj-triple",  # 显示K/D/J三个值
    parameters=[
        IndicatorParameter(
            name="fastk_period",
            type=ParameterType.NUMBER,
            label="K周期",
            default=9,
            min=1,
            max=100,
            step=1,
            description="RSV计算周期"
        ),
        IndicatorParameter(
            name="slowk_period",
            type=ParameterType.NUMBER,
            label="K平滑",
            default=3,
            min=1,
            max=20,
            step=1,
            description="K线平滑周期"
        ),
        IndicatorParameter(
            name="slowd_period",
            type=ParameterType.NUMBER,
            label="D平滑",
            default=3,
            min=1,
            max=20,
            step=1,
            description="D线平滑周期"
        ),
        IndicatorParameter(
            name="k_color",
            type=ParameterType.COLOR,
            label="K线颜色",
            default="#2962FF",
            description="K线（快线）的颜色"
        ),
        IndicatorParameter(
            name="d_color",
            type=ParameterType.COLOR,
            label="D线颜色",
            default="#FF6D00",
            description="D线（慢线）的颜色"
        ),
        IndicatorParameter(
            name="j_color",
            type=ParameterType.COLOR,
            label="J线颜色",
            default="#00C853",
            description="J线（超快线）的颜色"
        ),
        IndicatorParameter(
            name="overbought",
            type=ParameterType.NUMBER,
            label="超买线",
            default=80,
            min=50,
            max=100,
            step=1,
            description="超买区域阈值"
        ),
        IndicatorParameter(
            name="oversold",
            type=ParameterType.NUMBER,
            label="超卖线",
            default=20,
            min=0,
            max=50,
            step=1,
            description="超卖区域阈值"
        )
    ]
)
