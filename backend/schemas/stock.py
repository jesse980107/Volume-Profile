"""
Pydantic 模型 - 类型安全的数据结构
"""
from pydantic import BaseModel, Field
from typing import List


class CandleData(BaseModel):
    """K线数据点"""
    time: str = Field(..., description="日期 YYYY-MM-DD")
    open: float
    high: float
    low: float
    close: float


class ValueData(BaseModel):
    """通用值数据点 (用于均线、指标等)"""
    time: str
    value: float


class VolumeData(BaseModel):
    """成交量数据点"""
    time: str
    value: float
    color: str | None = None


class MACDData(BaseModel):
    """MACD 指标数据"""
    macd: List[ValueData]
    signal: List[ValueData]
    histogram: List[ValueData]


class KDJData(BaseModel):
    """KDJ 指标数据"""
    k: List[ValueData]
    d: List[ValueData]
    j: List[ValueData]


class BOLLData(BaseModel):
    """布林带数据"""
    upper: List[ValueData]
    middle: List[ValueData]
    lower: List[ValueData]


class StockDataResponse(BaseModel):
    """股票数据响应"""
    symbol: str
    candlestick: List[CandleData]
    volume: List[VolumeData]
    sma5: List[ValueData] | None = None
    sma10: List[ValueData] | None = None
    sma20: List[ValueData] | None = None
    sma60: List[ValueData] | None = None
    macd: MACDData | None = None
    kdj: KDJData | None = None
    rsi: List[ValueData] | None = None
    boll: BOLLData | None = None
