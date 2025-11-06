"""
股票数据 API 路由 - 使用 APIRouter 模块化
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Annotated
import pandas as pd

from backend.core.dependencies import get_data_service, get_indicator_service
from backend.services.data_service import DataService
from backend.services.indicator_service import IndicatorService
from backend.services.timeframe_service import TimeframeService, TimeframeType
from backend.services.indicator_parser import IndicatorParser, IndicatorCalculator
from backend.schemas.stock import (
    StockDataResponse,
    CandleData,
    VolumeData,
    ValueData,
    MACDData,
    KDJData,
    BOLLData,
)

# 创建路由器
router = APIRouter(
    prefix="/stock",
    tags=["stock"],
    responses={404: {"description": "Stock not found"}},
)


@router.get("/{symbol}", response_model=StockDataResponse)
async def get_stock_data(
    symbol: str,
    data_service: Annotated[DataService, Depends(get_data_service)],
    indicator_service: Annotated[IndicatorService, Depends(get_indicator_service)],
    interval: TimeframeType = Query(default="daily", description="时间间隔: daily(日线), weekly(周线), monthly(月线)"),
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
    indicators: str = Query(default="", description="指标配置 (例如: ma:5,20,60;kdj:9-3-3;macd:12-26-9)"),
):
    """
    获取股票数据及技术指标

    - **symbol**: 股票代码 (例如: 000155.sz)
    - **interval**: 时间间隔 - daily(日线, 默认), weekly(周线), monthly(月线)
    - **start_date**: 可选,筛选开始日期
    - **end_date**: 可选,筛选结束日期
    - **indicators**: 可选,动态指标配置 (格式: ma:5,20,60;kdj:9-3-3;macd:12-26-9;rsi:14;boll:20-2.0)
                     留空则返回所有默认指标
    """
    try:
        # 加载数据
        df = await data_service.load_stock_data(symbol)

        # 日期筛选（在聚合之前进行）
        if start_date:
            df = df[df['time'] >= start_date]
        if end_date:
            df = df[df['time'] <= end_date]

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for the given date range")

        # 根据时间间隔聚合数据（需要将 'time' 列重命名为 'date' 以匹配 TimeframeService）
        df_temp = df.rename(columns={'time': 'date'})
        df_temp = TimeframeService.resample_data(df_temp, interval)
        df = df_temp.rename(columns={'date': 'time'})

        # 计算技术指标
        if indicators:
            # 使用动态指标解析器
            try:
                indicator_requests = IndicatorParser.parse(indicators)
                df = IndicatorCalculator.calculate(df, indicator_requests)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid indicators parameter: {str(e)}")
        else:
            # 使用默认指标（保持向后兼容）
            df = indicator_service.add_all_indicators(df)

        # 构建响应数据
        response = _build_response(df, symbol)

        return response

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{symbol}/recalculate-indicators")
async def recalculate_indicators(
    symbol: str,
    data_service: Annotated[DataService, Depends(get_data_service)],
    interval: TimeframeType = Query(default="daily", description="时间间隔: daily(日线), weekly(周线), monthly(月线)"),
    indicators: str = Query(default="", description="指标配置 (例如: ma:5,20,60;kdj:9-3-3;macd:12-26-9)"),
):
    """
    重新计算指标（不返回原始 OHLCV 数据）

    用于用户修改指标参数后快速更新，避免重新传输大量原始数据

    - **symbol**: 股票代码
    - **interval**: 时间间隔
    - **indicators**: 指标配置字符串

    返回：只包含指标数据，不包含 candlestick 和 volume
    """
    try:
        # 加载数据
        df = await data_service.load_stock_data(symbol)

        # 根据时间间隔聚合数据
        df_temp = df.rename(columns={'time': 'date'})
        df_temp = TimeframeService.resample_data(df_temp, interval)
        df = df_temp.rename(columns={'date': 'time'})

        # 计算指标
        if indicators:
            try:
                indicator_requests = IndicatorParser.parse(indicators)
                df = IndicatorCalculator.calculate(df, indicator_requests)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid indicators parameter: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="indicators parameter is required")

        # 只返回指标数据
        response = _build_indicators_only_response(df, symbol)
        return response

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def _build_indicators_only_response(df: pd.DataFrame, symbol: str) -> dict:
    """
    构建只包含指标的响应（不包含 candlestick 和 volume）
    """
    def to_value_data(column_name: str) -> list[dict] | None:
        if column_name not in df.columns:
            return None
        return [
            {"time": row['time'], "value": row[column_name]}
            for _, row in df.iterrows()
            if row[column_name] != 0  # 过滤掉 NaN 填充的 0
        ]

    result = {
        "symbol": symbol,
        "sma5": to_value_data('MA5') or to_value_data('SMA5'),
        "sma10": to_value_data('MA10') or to_value_data('SMA10'),
        "sma20": to_value_data('MA20') or to_value_data('SMA20'),
        "sma60": to_value_data('MA60') or to_value_data('SMA60'),
    }

    # MACD
    if 'MACD' in df.columns:
        result["macd"] = {
            "macd": to_value_data('MACD') or [],
            "signal": to_value_data('MACD_signal') or [],
            "histogram": to_value_data('MACD_hist') or [],
        }

    # KDJ
    if 'K' in df.columns:
        result["kdj"] = {
            "k": to_value_data('K') or [],
            "d": to_value_data('D') or [],
            "j": to_value_data('J') or [],
        }

    # RSI
    result["rsi"] = to_value_data('RSI')

    # BOLL
    if 'BOLL_upper' in df.columns:
        result["boll"] = {
            "upper": to_value_data('BOLL_upper') or [],
            "middle": to_value_data('BOLL_middle') or [],
            "lower": to_value_data('BOLL_lower') or [],
        }

    return result


def _build_response(df: pd.DataFrame, symbol: str) -> StockDataResponse:
    """
    构建 API 响应数据

    Args:
        df: 包含所有数据的 DataFrame
        symbol: 股票代码

    Returns:
        StockDataResponse 对象
    """
    # K线数据
    candlestick = [
        CandleData(
            time=row['time'],
            open=row['open'],
            high=row['high'],
            low=row['low'],
            close=row['close']
        )
        for _, row in df.iterrows()
    ]

    # 成交量数据 (带颜色)
    volume = [
        VolumeData(
            time=row['time'],
            value=row['vol'],
            color='#ef535080' if row['close'] >= row['open'] else '#26a69a80'
        )
        for _, row in df.iterrows()
    ]

    # 辅助函数: 转换 Series 为 ValueData 列表 (检查列是否存在)
    def to_value_data(column_name: str) -> list[ValueData] | None:
        if column_name not in df.columns:
            return None
        return [
            ValueData(time=row['time'], value=row[column_name])
            for _, row in df.iterrows()
            if row[column_name] != 0  # 过滤掉 NaN 填充的 0
        ]

    # 构建响应 (动态检查列是否存在)
    # 支持 SMA5/EMA5/WMA5 或统一的 MA5 列名
    return StockDataResponse(
        symbol=symbol,
        candlestick=candlestick,
        volume=volume,
        sma5=to_value_data('MA5') or to_value_data('SMA5'),
        sma10=to_value_data('MA10') or to_value_data('SMA10'),
        sma20=to_value_data('MA20') or to_value_data('SMA20'),
        sma60=to_value_data('MA60') or to_value_data('SMA60'),
        macd=MACDData(
            macd=to_value_data('MACD') or [],
            signal=to_value_data('MACD_signal') or [],
            histogram=to_value_data('MACD_hist') or [],
        ) if 'MACD' in df.columns else None,
        kdj=KDJData(
            k=to_value_data('K') or [],
            d=to_value_data('D') or [],
            j=to_value_data('J') or [],
        ) if 'K' in df.columns else None,
        rsi=to_value_data('RSI'),
        boll=BOLLData(
            upper=to_value_data('BOLL_upper') or [],
            middle=to_value_data('BOLL_middle') or [],
            lower=to_value_data('BOLL_lower') or [],
        ) if 'BOLL_upper' in df.columns else None,
    )
