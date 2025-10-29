"""
股票数据 API 路由 - 使用 APIRouter 模块化
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Annotated
import pandas as pd

from backend.core.dependencies import get_data_service, get_indicator_service
from backend.services.data_service import DataService
from backend.services.indicator_service import IndicatorService
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
    start_date: str | None = Query(None, description="开始日期 YYYY-MM-DD"),
    end_date: str | None = Query(None, description="结束日期 YYYY-MM-DD"),
):
    """
    获取股票数据及技术指标

    - **symbol**: 股票代码 (例如: 000155.sz)
    - **start_date**: 可选,筛选开始日期
    - **end_date**: 可选,筛选结束日期
    """
    try:
        # 加载数据
        df = await data_service.load_stock_data(symbol)

        # 日期筛选
        if start_date:
            df = df[df['time'] >= start_date]
        if end_date:
            df = df[df['time'] <= end_date]

        if df.empty:
            raise HTTPException(status_code=404, detail="No data found for the given date range")

        # 计算所有技术指标
        df = indicator_service.add_all_indicators(df)

        # 构建响应数据
        response = _build_response(df, symbol)

        return response

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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

    # 辅助函数: 转换 Series 为 ValueData 列表
    def to_value_data(column_name: str) -> list[ValueData]:
        return [
            ValueData(time=row['time'], value=row[column_name])
            for _, row in df.iterrows()
            if row[column_name] != 0  # 过滤掉 NaN 填充的 0
        ]

    # 构建响应
    return StockDataResponse(
        symbol=symbol,
        candlestick=candlestick,
        volume=volume,
        sma5=to_value_data('SMA5'),
        sma10=to_value_data('SMA10'),
        sma20=to_value_data('SMA20'),
        sma60=to_value_data('SMA60'),
        macd=MACDData(
            macd=to_value_data('MACD'),
            signal=to_value_data('MACD_signal'),
            histogram=to_value_data('MACD_hist'),
        ),
        kdj=KDJData(
            k=to_value_data('K'),
            d=to_value_data('D'),
            j=to_value_data('J'),
        ),
        rsi=to_value_data('RSI'),
        boll=BOLLData(
            upper=to_value_data('BOLL_upper'),
            middle=to_value_data('BOLL_middle'),
            lower=to_value_data('BOLL_lower'),
        ),
    )
