/**
 * 应用状态类型定义
 */

import type {
  IChartApi,
  ISeriesApi,
  CandlestickSeriesPartialOptions,
  HistogramSeriesPartialOptions,
  LineSeriesPartialOptions,
} from 'lightweight-charts';
import type { StockDataResponse, TimeframeType } from './api.types';

/**
 * 图表面板集合
 */
export interface ChartPanes {
  main: ReturnType<IChartApi['panes']>[0] | null;
  volume: ReturnType<IChartApi['panes']>[0] | null;
  macd: ReturnType<IChartApi['panes']>[0] | null;
  kdj: ReturnType<IChartApi['panes']>[0] | null;
  rsi: ReturnType<IChartApi['panes']>[0] | null;
}

/**
 * 图表系列集合
 */
export interface ChartSeries {
  candle: ISeriesApi<'Candlestick', CandlestickSeriesPartialOptions> | null;
  volume: ISeriesApi<'Histogram', HistogramSeriesPartialOptions> | null;
  sma5: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  sma10: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  sma20: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  sma60: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  macd: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  macdSignal: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  macdHistogram: ISeriesApi<'Histogram', HistogramSeriesPartialOptions> | null;
  kdjK: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  kdjD: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  kdjJ: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  rsi: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  bollUpper: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  bollMiddle: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
  bollLower: ISeriesApi<'Line', LineSeriesPartialOptions> | null;
}

/**
 * 应用全局状态
 */
export interface AppState {
  stockData: StockDataResponse | null;
  chipData: any | null; // ChipCalculator 返回的数据
  chart: IChartApi | null;
  currentInterval: TimeframeType;
  panes: ChartPanes;
  series: ChartSeries;
  visibleIndicators: {
    sma5: boolean;
    sma10: boolean;
    sma20: boolean;
    sma60: boolean;
    macd: boolean;
    kdj: boolean;
    rsi: boolean;
    boll: boolean;
  };
}

/**
 * 配置选项
 */
export interface AppConfig {
  apiUrl: string;
  symbol: string;
  defaultInterval: TimeframeType;
}
