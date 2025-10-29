"""
技术指标计算服务 - 使用 TA-Lib 计算各种技术指标
"""
import pandas as pd
import numpy as np
import talib
from typing import Dict, List, Any


class IndicatorService:
    """技术指标服务类"""

    @staticmethod
    def calculate_sma(df: pd.DataFrame, periods: List[int]) -> Dict[str, pd.Series]:
        """
        计算简单移动平均线

        Args:
            df: 股票数据
            periods: 周期列表 [5, 10, 20, 60]

        Returns:
            {f'SMA{period}': Series}
        """
        result = {}
        for period in periods:
            result[f'SMA{period}'] = talib.SMA(df['close'].values, timeperiod=period)
        return result

    @staticmethod
    def calculate_macd(df: pd.DataFrame) -> Dict[str, pd.Series]:
        """计算 MACD 指标"""
        macd, signal, hist = talib.MACD(
            df['close'].values,
            fastperiod=12,
            slowperiod=26,
            signalperiod=9
        )
        return {
            'MACD': macd,
            'MACD_signal': signal,
            'MACD_hist': hist
        }

    @staticmethod
    def calculate_kdj(df: pd.DataFrame) -> Dict[str, pd.Series]:
        """计算 KDJ 指标"""
        k, d = talib.STOCH(
            df['high'].values,
            df['low'].values,
            df['close'].values,
            fastk_period=9,
            slowk_period=3,
            slowd_period=3
        )
        j = 3 * k - 2 * d
        return {'K': k, 'D': d, 'J': j}

    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """计算 RSI 指标"""
        return talib.RSI(df['close'].values, timeperiod=period)

    @staticmethod
    def calculate_boll(df: pd.DataFrame, period: int = 20, nbdev: float = 2.0) -> Dict[str, pd.Series]:
        """计算布林带"""
        upper, middle, lower = talib.BBANDS(
            df['close'].values,
            timeperiod=period,
            nbdevup=nbdev,
            nbdevdn=nbdev
        )
        return {
            'BOLL_upper': upper,
            'BOLL_middle': middle,
            'BOLL_lower': lower
        }

    @classmethod
    def add_all_indicators(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        添加所有技术指标到 DataFrame

        Args:
            df: 原始股票数据

        Returns:
            添加了所有指标的 DataFrame
        """
        # 复制 DataFrame 避免修改原数据
        df = df.copy()

        # 添加均线
        sma_dict = cls.calculate_sma(df, [5, 10, 20, 60])
        for key, series in sma_dict.items():
            df[key] = series

        # 添加 MACD
        macd_dict = cls.calculate_macd(df)
        for key, series in macd_dict.items():
            df[key] = series

        # 添加 KDJ
        kdj_dict = cls.calculate_kdj(df)
        for key, series in kdj_dict.items():
            df[key] = series

        # 添加 RSI
        df['RSI'] = cls.calculate_rsi(df)

        # 添加布林带
        boll_dict = cls.calculate_boll(df)
        for key, series in boll_dict.items():
            df[key] = series

        # 填充 NaN 值
        df = df.fillna(0)

        return df
