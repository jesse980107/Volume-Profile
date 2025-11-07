/**
 * 图表相关类型定义
 */

import type {
  ChartOptions,
  DeepPartial,
  LineStyleOptions,
  SeriesOptionsCommon,
} from 'lightweight-charts';

/**
 * 图表主题配置
 */
export interface ChartTheme {
  background: string;
  textColor: string;
  gridColor: string;
  upColor: string;
  downColor: string;
}

/**
 * 扩展的图表选项
 */
export type ExtendedChartOptions = DeepPartial<ChartOptions>;

/**
 * 指标颜色配置
 */
export interface IndicatorColors {
  ma5: string;
  ma10: string;
  ma20: string;
  ma60: string;
  macd: string;
  macdSignal: string;
  macdHistogramPositive: string;
  macdHistogramNegative: string;
  kdjK: string;
  kdjD: string;
  kdjJ: string;
  rsi: string;
  bollUpper: string;
  bollMiddle: string;
  bollLower: string;
}

/**
 * 线条样式选项
 */
export type LineStyle = LineStyleOptions;

/**
 * 系列选项扩展
 */
export type ExtendedSeriesOptions = DeepPartial<SeriesOptionsCommon>;
