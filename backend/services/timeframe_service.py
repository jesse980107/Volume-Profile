"""
Timeframe Service - 时间间隔聚合服务

负责将日线数据聚合为不同时间间隔（周线、月线）的 OHLCV 数据。
"""

import pandas as pd
from typing import Literal

TimeframeType = Literal["daily", "weekly", "monthly"]


class TimeframeService:
    """时间间隔聚合服务类"""

    @staticmethod
    def resample_data(
        df: pd.DataFrame,
        interval: TimeframeType = "daily"
    ) -> pd.DataFrame:
        """
        将数据聚合到指定的时间间隔

        Args:
            df: 原始日线数据 DataFrame，必须包含 date, open, high, low, close, vol 列
            interval: 时间间隔类型 - 'daily'(日线), 'weekly'(周线), 'monthly'(月线)

        Returns:
            聚合后的 DataFrame
        """
        if interval == "daily":
            # 日线直接返回原数据
            return df.copy()
        elif interval == "weekly":
            return TimeframeService._resample_to_weekly(df)
        elif interval == "monthly":
            return TimeframeService._resample_to_monthly(df)
        else:
            raise ValueError(f"Unsupported interval: {interval}. Must be 'daily', 'weekly', or 'monthly'.")

    @staticmethod
    def _resample_to_weekly(df: pd.DataFrame) -> pd.DataFrame:
        """
        将日线数据聚合为周线

        聚合规则：
        - open: 取一周第一个交易日的开盘价
        - high: 取一周内最高价
        - low: 取一周内最低价
        - close: 取一周最后一个交易日的收盘价
        - vol: 取一周内成交量之和
        """
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')

        # 聚合为周线（W-FRI 表示以周五为一周结束）
        resampled = df.resample('W-FRI').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'vol': 'sum'
        }).dropna()

        # 重置索引，将日期从索引转回列
        resampled = resampled.reset_index()

        # 保持日期格式为字符串 YYYY-MM-DD
        resampled['date'] = resampled['date'].dt.strftime('%Y-%m-%d')

        return resampled

    @staticmethod
    def _resample_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
        """
        将日线数据聚合为月线

        聚合规则：
        - open: 取当月第一个交易日的开盘价
        - high: 取当月内最高价
        - low: 取当月内最低价
        - close: 取当月最后一个交易日的收盘价
        - vol: 取当月内成交量之和
        """
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')

        # 聚合为月线（M 表示月末）
        resampled = df.resample('M').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'vol': 'sum'
        }).dropna()

        # 重置索引，将日期从索引转回列
        resampled = resampled.reset_index()

        # 保持日期格式为字符串 YYYY-MM-DD
        resampled['date'] = resampled['date'].dt.strftime('%Y-%m-%d')

        return resampled

    @staticmethod
    def get_available_intervals() -> list[str]:
        """返回支持的时间间隔列表"""
        return ["daily", "weekly", "monthly"]

    @staticmethod
    def get_interval_display_name(interval: TimeframeType) -> str:
        """获取时间间隔的显示名称"""
        display_names = {
            "daily": "日线",
            "weekly": "周线",
            "monthly": "月线"
        }
        return display_names.get(interval, interval)
