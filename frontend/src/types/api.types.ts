/**
 * API 类型定义
 * 对应后端 Pydantic 模型（backend/schemas/stock.py）
 */

/**
 * K线数据
 */
export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * 成交量数据
 */
export interface VolumeData {
  time: string;
  value: number;
  color?: string;
}

/**
 * 单一指标数据（SMA, RSI 等）
 */
export interface ValueData {
  time: string;
  value: number;
}

/**
 * MACD 指标数据
 */
export interface MACDData {
  macd: ValueData[];
  signal: ValueData[];
  histogram: ValueData[];
}

/**
 * KDJ 指标数据
 */
export interface KDJData {
  k: ValueData[];
  d: ValueData[];
  j: ValueData[];
}

/**
 * 布林带指标数据
 */
export interface BOLLData {
  upper: ValueData[];
  middle: ValueData[];
  lower: ValueData[];
}

/**
 * 股票数据响应（完整 API 响应）
 */
export interface StockDataResponse {
  symbol: string;
  candlestick: CandleData[];
  volume: VolumeData[];
  sma5: ValueData[];
  sma10: ValueData[];
  sma20: ValueData[];
  sma60: ValueData[];
  macd: MACDData;
  kdj: KDJData;
  rsi: ValueData[];
  boll: BOLLData;
}

/**
 * 时间间隔类型
 */
export type TimeframeType = 'daily' | 'weekly' | 'monthly';

/**
 * 筹码设置选项
 */
export interface ChipOptions {
  lookbackDays: number | 'all';
  decayAlgorithm: 'cumulative' | 'exponential_decay' | 'linear_decay';
  decayRate: number;
  numBins: number;
}

/**
 * 筹码分布数据
 */
export interface ChipDistribution {
  time: string;
  price: number;
  bins: Array<{
    priceLevel: number;
    volume: number;
    isProfit: boolean;
  }>;
  stats: {
    concentration: number;
    mainCost: number;
    profitRatio: number;
    lossRatio: number;
  };
}
