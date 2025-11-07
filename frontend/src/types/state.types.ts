/**
 * 应用状态类型定义
 */

import type {
  IChartApi,
  ISeriesApi,
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
  candle: ISeriesApi<'Candlestick'> | null;
  volume: ISeriesApi<'Histogram'> | null;
  ma5: ISeriesApi<'Line'> | null;
  ma10: ISeriesApi<'Line'> | null;
  ma20: ISeriesApi<'Line'> | null;
  ma60: ISeriesApi<'Line'> | null;
  macd: ISeriesApi<'Line'> | null;
  macdSignal: ISeriesApi<'Line'> | null;
  macdHistogram: ISeriesApi<'Histogram'> | null;
  kdjK: ISeriesApi<'Line'> | null;
  kdjD: ISeriesApi<'Line'> | null;
  kdjJ: ISeriesApi<'Line'> | null;
  rsi: ISeriesApi<'Line'> | null;
  bollUpper: ISeriesApi<'Line'> | null;
  bollMiddle: ISeriesApi<'Line'> | null;
  bollLower: ISeriesApi<'Line'> | null;
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
  // visibleIndicators 已移除 - 现在由 indicatorConfigManager 管理
}

/**
 * 配置选项
 */
export interface AppConfig {
  apiUrl: string;
  symbol: string;
  defaultInterval: TimeframeType;
}
