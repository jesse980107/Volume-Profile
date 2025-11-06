"""
指标参数解析器
解析URL查询参数中的indicators配置，动态计算指标
"""
from typing import List, Dict, Any
from dataclasses import dataclass
import pandas as pd

from .indicators import (
    calculate_sma,
    calculate_ema,
    calculate_wma,
    calculate_kdj,
    calculate_macd,
    calculate_rsi,
    calculate_bollinger_bands,
)


@dataclass
class IndicatorRequest:
    """
    单个指标的请求配置
    """
    indicator_id: str  # 指标类型：ma, kdj, macd, rsi, boll
    parameters: Dict[str, Any]  # 参数字典


class IndicatorParser:
    """
    指标参数解析器

    支持的格式：
    - MA: ma:sma:5,20,60  (类型:周期列表) 或 ma:ema:12,26 或 ma:wma:10,20,30
    - KDJ: kdj:9-3-3  (fastk-slowk-slowd，连字符分隔)
    - MACD: macd:12-26-9  (fast-slow-signal)
    - RSI: rsi:14  (单个周期)
    - BOLL: boll:20-2.0  (period-nbdev)

    示例：
        indicators=ma:sma:5,20,60;kdj:9-3-3;macd:12-26-9;rsi:14
    """

    @staticmethod
    def parse(indicators_str: str) -> List[IndicatorRequest]:
        """
        解析indicators参数字符串

        Args:
            indicators_str: 指标配置字符串

        Returns:
            IndicatorRequest列表

        Raises:
            ValueError: 参数格式错误
        """
        if not indicators_str or indicators_str.strip() == "":
            return []

        requests = []

        # 按分号或竖线分割各个指标（兼容多种分隔符）
        indicator_parts = indicators_str.split(';') if ';' in indicators_str else indicators_str.split('|')

        for part in indicator_parts:
            part = part.strip()
            if not part:
                continue

            # 解析单个指标
            if ':' not in part:
                raise ValueError(f"Invalid indicator format: '{part}'. Expected format: 'indicator_id:params'")

            indicator_id, params_str = part.split(':', 1)
            indicator_id = indicator_id.strip().lower()
            params_str = params_str.strip()

            # 根据指标类型解析参数
            try:
                if indicator_id == 'ma':
                    parameters = IndicatorParser._parse_ma_params(params_str)
                elif indicator_id == 'kdj':
                    parameters = IndicatorParser._parse_kdj_params(params_str)
                elif indicator_id == 'macd':
                    parameters = IndicatorParser._parse_macd_params(params_str)
                elif indicator_id == 'rsi':
                    parameters = IndicatorParser._parse_rsi_params(params_str)
                elif indicator_id == 'boll':
                    parameters = IndicatorParser._parse_boll_params(params_str)
                else:
                    raise ValueError(f"Unknown indicator: {indicator_id}")

                requests.append(IndicatorRequest(
                    indicator_id=indicator_id,
                    parameters=parameters
                ))
            except Exception as e:
                raise ValueError(f"Failed to parse {indicator_id} parameters '{params_str}': {str(e)}")

        return requests

    @staticmethod
    def _parse_ma_params(params_str: str) -> Dict[str, Any]:
        """
        解析MA参数:
        - 新格式: "sma:5,20,60" → {"ma_type": "sma", "periods": [5, 20, 60]}
        - 旧格式（兼容）: "5,20,60" → {"ma_type": "sma", "periods": [5, 20, 60]}
        """
        # 检查是否包含 MA 类型
        if ':' in params_str:
            ma_type, periods_str = params_str.split(':', 1)
            ma_type = ma_type.strip().lower()
            if ma_type not in ['sma', 'ema', 'wma']:
                raise ValueError(f"Unknown MA type: {ma_type}. Must be sma, ema, or wma")
        else:
            # 兼容旧格式，默认使用 SMA
            ma_type = 'sma'
            periods_str = params_str

        periods = [int(p.strip()) for p in periods_str.split(',')]
        return {"ma_type": ma_type, "periods": periods}

    @staticmethod
    def _parse_kdj_params(params_str: str) -> Dict[str, Any]:
        """
        解析KDJ参数: "9-3-3" → {"fastk_period": 9, "slowk_period": 3, "slowd_period": 3}
        """
        parts = params_str.split('-')
        if len(parts) != 3:
            raise ValueError("KDJ requires 3 parameters: fastk-slowk-slowd")

        return {
            "fastk_period": int(parts[0]),
            "slowk_period": int(parts[1]),
            "slowd_period": int(parts[2])
        }

    @staticmethod
    def _parse_macd_params(params_str: str) -> Dict[str, Any]:
        """
        解析MACD参数: "12-26-9" → {"fast_period": 12, "slow_period": 26, "signal_period": 9}
        """
        parts = params_str.split('-')
        if len(parts) != 3:
            raise ValueError("MACD requires 3 parameters: fast-slow-signal")

        return {
            "fast_period": int(parts[0]),
            "slow_period": int(parts[1]),
            "signal_period": int(parts[2])
        }

    @staticmethod
    def _parse_rsi_params(params_str: str) -> Dict[str, Any]:
        """
        解析RSI参数: "14" → {"period": 14}
        """
        return {"period": int(params_str)}

    @staticmethod
    def _parse_boll_params(params_str: str) -> Dict[str, Any]:
        """
        解析BOLL参数: "20-2.0" → {"period": 20, "nbdev_up": 2.0, "nbdev_down": 2.0}
        """
        parts = params_str.split('-')
        if len(parts) < 2:
            raise ValueError("BOLL requires at least 2 parameters: period-nbdev")

        period = int(parts[0])
        nbdev = float(parts[1])

        return {
            "period": period,
            "nbdev_up": nbdev,
            "nbdev_down": nbdev
        }


class IndicatorCalculator:
    """
    指标计算器 - 根据解析后的请求计算指标
    """

    @staticmethod
    def calculate(df: pd.DataFrame, requests: List[IndicatorRequest]) -> pd.DataFrame:
        """
        计算所有请求的指标

        Args:
            df: 原始数据
            requests: 指标请求列表

        Returns:
            添加了指标的DataFrame
        """
        result = df.copy()

        for request in requests:
            if request.indicator_id == 'ma':
                result = IndicatorCalculator._calculate_ma(result, request.parameters)
            elif request.indicator_id == 'kdj':
                result = IndicatorCalculator._calculate_kdj(result, request.parameters)
            elif request.indicator_id == 'macd':
                result = IndicatorCalculator._calculate_macd(result, request.parameters)
            elif request.indicator_id == 'rsi':
                result = IndicatorCalculator._calculate_rsi(result, request.parameters)
            elif request.indicator_id == 'boll':
                result = IndicatorCalculator._calculate_boll(result, request.parameters)

        # 填充NaN
        result = result.fillna(0)

        return result

    @staticmethod
    def _calculate_ma(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        """计算MA - 支持多周期和多类型 (SMA/EMA/WMA)"""
        result = df.copy()
        ma_type = params.get('ma_type', 'sma').lower()
        periods = params.get('periods', [20])

        # 选择对应的计算函数
        if ma_type == 'sma':
            calculate_func = calculate_sma
            source_prefix = 'SMA'
        elif ma_type == 'ema':
            calculate_func = calculate_ema
            source_prefix = 'EMA'
        elif ma_type == 'wma':
            calculate_func = calculate_wma
            source_prefix = 'WMA'
        else:
            raise ValueError(f"Unknown MA type: {ma_type}")

        # 计算所有周期并重命名为统一的列名
        for period in periods:
            result = calculate_func(result, period)
            # 将 SMA5/EMA5/WMA5 重命名为统一的 MA5
            source_col = f'{source_prefix}{period}'
            target_col = f'MA{period}'
            if source_col in result.columns:
                result[target_col] = result[source_col]
                # 删除原列（可选）
                result = result.drop(columns=[source_col])

        return result

    @staticmethod
    def _calculate_kdj(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        """计算KDJ"""
        return calculate_kdj(
            df,
            fastk_period=params.get('fastk_period', 9),
            slowk_period=params.get('slowk_period', 3),
            slowd_period=params.get('slowd_period', 3)
        )

    @staticmethod
    def _calculate_macd(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        """计算MACD"""
        return calculate_macd(
            df,
            fast_period=params.get('fast_period', 12),
            slow_period=params.get('slow_period', 26),
            signal_period=params.get('signal_period', 9)
        )

    @staticmethod
    def _calculate_rsi(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        """计算RSI"""
        return calculate_rsi(df, period=params.get('period', 14))

    @staticmethod
    def _calculate_boll(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        """计算BOLL"""
        return calculate_bollinger_bands(
            df,
            period=params.get('period', 20),
            nbdev_up=params.get('nbdev_up', 2.0),
            nbdev_down=params.get('nbdev_down', 2.0)
        )
