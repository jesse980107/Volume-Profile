/**
 * 筹码计算引擎
 * 支持多种算法和自定义参数
 */

import type { CandleData, VolumeData, ChipOptions } from '../types';

/**
 * 筹码分布单元
 */
export interface ChipBin {
  price: number;
  volume: number;
}

/**
 * 筹码峰值
 */
export interface ChipPeak {
  price: number;
  intensity: 'high' | 'medium' | 'low';
}

/**
 * 筹码分布结果
 */
export interface ChipDistributionResult {
  distribution: ChipBin[];
  peaks: ChipPeak[];
}

/**
 * 内部计算选项
 */
interface InternalChipOptions {
  lookbackDays: number | null;
  decayRate: number;
  numBins: number;
  algorithm: 'cumulative' | 'exponential_decay' | 'linear_decay';
}

/**
 * 统计信息
 */
export interface ChipStats {
  cacheSize: number;
  candlesCount: number;
  priceRange: [number, number];
  binSize: number;
  options: InternalChipOptions;
}

export class ChipCalculator {
  private options: InternalChipOptions;
  private cache: Map<string, ChipDistributionResult>;
  private volumeMap: Map<string, number>;
  private candles: CandleData[] | null;
  private volumes: VolumeData[] | null;
  private minPrice: number;
  private maxPrice: number;
  private binSize: number;

  constructor(options: Partial<ChipOptions> = {}) {
    // 默认配置
    this.options = {
      lookbackDays: options.lookbackDays === 'all' ? null : (options.lookbackDays || null),
      decayRate: options.decayRate || 0,
      numBins: options.numBins || 50,
      algorithm: options.decayAlgorithm || 'cumulative'
    };

    // 缓存
    this.cache = new Map();
    this.volumeMap = new Map();

    // 数据引用
    this.candles = null;
    this.volumes = null;

    // 价格范围
    this.minPrice = 0;
    this.maxPrice = 0;
    this.binSize = 0;
  }

  /**
   * 更新配置
   */
  updateOptions(newOptions: Partial<ChipOptions>): void {
    this.options = {
      ...this.options,
      lookbackDays: newOptions.lookbackDays === 'all' ? null : (newOptions.lookbackDays !== undefined ? newOptions.lookbackDays : this.options.lookbackDays),
      decayRate: newOptions.decayRate !== undefined ? newOptions.decayRate : this.options.decayRate,
      numBins: newOptions.numBins !== undefined ? newOptions.numBins : this.options.numBins,
      algorithm: newOptions.decayAlgorithm !== undefined ? newOptions.decayAlgorithm : this.options.algorithm
    };
    this.cache.clear();
    console.log('✓ 筹码计算器配置已更新:', this.options);
  }

  /**
   * 初始化数据
   */
  initialize(candles: CandleData[], volumes: VolumeData[]): void {
    this.candles = candles;
    this.volumes = volumes;

    // 创建时间到成交量的映射
    this.volumeMap.clear();
    volumes.forEach(v => {
      this.volumeMap.set(v.time, v.value);
    });

    // 计算价格范围
    const prices = candles.flatMap(c => [c.high, c.low]);
    this.minPrice = Math.min(...prices);
    this.maxPrice = Math.max(...prices);
    const priceRange = this.maxPrice - this.minPrice;
    this.binSize = priceRange / this.options.numBins;

    console.log(
      `✓ 筹码计算器已初始化: ${candles.length} 根K线, 价格范围 [${this.minPrice.toFixed(2)}, ${this.maxPrice.toFixed(2)}]`
    );
  }

  /**
   * 预计算所有日期的筹码分布
   */
  precomputeAll(progressCallback?: (current: number, total: number) => void): Map<string, ChipDistributionResult> | null {
    if (!this.candles || !this.volumes) {
      console.error('请先调用 initialize() 初始化数据');
      return null;
    }

    console.log(
      `开始预计算筹码分布 (算法: ${this.options.algorithm}, 回溯: ${this.options.lookbackDays || '全部'}天)...`
    );

    const startTime = Date.now();
    const total = this.candles.length;

    this.candles.forEach((candle, index) => {
      const chipData = this.compute(candle.time, index);
      if (chipData) {
        this.cache.set(candle.time, chipData);
      }

      // 进度回调（每100根K线报告一次）
      if (progressCallback && index % 100 === 0) {
        progressCallback(index, total);
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`✓ 预计算完成: ${total} 个数据点, 耗时 ${elapsed}ms`);

    return this.cache;
  }

  /**
   * 计算指定日期的筹码分布
   */
  compute(targetDate: string, targetIndex: number | null = null): ChipDistributionResult | null {
    // 如果已缓存，直接返回
    if (this.cache.has(targetDate)) {
      return this.cache.get(targetDate)!;
    }

    if (!this.candles) {
      return null;
    }

    // 找到目标日期的索引
    if (targetIndex === null) {
      targetIndex = this.candles.findIndex(c => c.time === targetDate);
      if (targetIndex === -1) return null;
    }

    // 确定起始索引（根据 lookbackDays）
    let startIndex = 0;
    if (this.options.lookbackDays) {
      const lookbackDate = this.addDays(targetDate, -this.options.lookbackDays);
      startIndex = this.candles.findIndex(c => c.time >= lookbackDate);
      if (startIndex === -1) startIndex = 0;
    }

    // 裁剪数据窗口
    const windowCandles = this.candles.slice(startIndex, targetIndex + 1);

    // 根据算法计算
    return this.calculateDistribution(windowCandles, targetDate);
  }

  /**
   * 获取缓存的筹码数据
   */
  get(date: string): ChipDistributionResult | null {
    return this.cache.get(date) || null;
  }

  /**
   * 计算分布（算法分发）
   */
  private calculateDistribution(candles: CandleData[], targetDate: string): ChipDistributionResult {
    switch (this.options.algorithm) {
      case 'cumulative':
        return this.cumulativeAlgorithm(candles);
      case 'exponential_decay':
        return this.exponentialDecayAlgorithm(candles, targetDate);
      case 'linear_decay':
        return this.linearDecayAlgorithm(candles, targetDate);
      default:
        return this.cumulativeAlgorithm(candles);
    }
  }

  /**
   * 算法1: 简单累积（所有历史数据平等权重）
   */
  private cumulativeAlgorithm(candles: CandleData[]): ChipDistributionResult {
    // 动态计算窗口的价格范围
    const windowPrices = candles.flatMap(c => [c.high, c.low]);
    const windowMinPrice = Math.min(...windowPrices);
    const windowMaxPrice = Math.max(...windowPrices);
    const windowPriceRange = windowMaxPrice - windowMinPrice;

    if (windowPriceRange === 0) {
      console.warn('价格范围为0，无法计算筹码分布');
      return { distribution: [], peaks: [] };
    }

    const windowBinSize = windowPriceRange / this.options.numBins;
    const distribution = new Array(this.options.numBins).fill(0);

    // 遍历每根K线
    candles.forEach(candle => {
      const volume = this.volumeMap.get(candle.time) || 0;
      if (volume === 0) return;

      // 将成交量分配到价格档位（使用动态价格范围）
      this.distributeVolumeToBins(candle, volume, distribution, 1.0, windowMinPrice, windowBinSize);
    });

    // 转换为对象数组
    const result: ChipBin[] = [];
    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i] > 0) {
        const price = windowMinPrice + windowBinSize * (i + 0.5);
        result.push({ price, volume: distribution[i] });
      }
    }

    // 识别峰值
    const peaks = this.findPeaks(result);

    return { distribution: result, peaks };
  }

  /**
   * 算法2: 指数衰减（越早的数据权重越低）
   */
  private exponentialDecayAlgorithm(candles: CandleData[], targetDate: string): ChipDistributionResult {
    // 动态计算窗口的价格范围
    const windowPrices = candles.flatMap(c => [c.high, c.low]);
    const windowMinPrice = Math.min(...windowPrices);
    const windowMaxPrice = Math.max(...windowPrices);
    const windowPriceRange = windowMaxPrice - windowMinPrice;

    if (windowPriceRange === 0) {
      console.warn('价格范围为0，无法计算筹码分布');
      return { distribution: [], peaks: [] };
    }

    const windowBinSize = windowPriceRange / this.options.numBins;
    const distribution = new Array(this.options.numBins).fill(0);
    const decayRate = this.options.decayRate;

    candles.forEach(candle => {
      const volume = this.volumeMap.get(candle.time) || 0;
      if (volume === 0) return;

      // 计算衰减权重
      const daysDiff = this.dateDiff(candle.time, targetDate);
      const weight = Math.exp(-decayRate * daysDiff);

      // 分配成交量（应用权重，使用动态价格范围）
      this.distributeVolumeToBins(candle, volume, distribution, weight, windowMinPrice, windowBinSize);
    });

    const result: ChipBin[] = [];
    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i] > 0) {
        const price = windowMinPrice + windowBinSize * (i + 0.5);
        result.push({ price, volume: distribution[i] });
      }
    }

    const peaks = this.findPeaks(result);
    return { distribution: result, peaks };
  }

  /**
   * 算法3: 线性衰减
   */
  private linearDecayAlgorithm(candles: CandleData[], targetDate: string): ChipDistributionResult {
    // 动态计算窗口的价格范围
    const windowPrices = candles.flatMap(c => [c.high, c.low]);
    const windowMinPrice = Math.min(...windowPrices);
    const windowMaxPrice = Math.max(...windowPrices);
    const windowPriceRange = windowMaxPrice - windowMinPrice;

    if (windowPriceRange === 0) {
      console.warn('价格范围为0，无法计算筹码分布');
      return { distribution: [], peaks: [] };
    }

    const windowBinSize = windowPriceRange / this.options.numBins;
    const distribution = new Array(this.options.numBins).fill(0);
    const totalDays = this.options.lookbackDays || candles.length;

    candles.forEach(candle => {
      const volume = this.volumeMap.get(candle.time) || 0;
      if (volume === 0) return;

      // 线性衰减权重
      const daysDiff = this.dateDiff(candle.time, targetDate);
      const weight = Math.max(0, 1 - daysDiff / totalDays);

      this.distributeVolumeToBins(candle, volume, distribution, weight, windowMinPrice, windowBinSize);
    });

    const result: ChipBin[] = [];
    for (let i = 0; i < distribution.length; i++) {
      if (distribution[i] > 0) {
        const price = windowMinPrice + windowBinSize * (i + 0.5);
        result.push({ price, volume: distribution[i] });
      }
    }

    const peaks = this.findPeaks(result);
    return { distribution: result, peaks };
  }

  /**
   * 将K线的成交量分配到价格档位
   */
  private distributeVolumeToBins(
    candle: CandleData,
    volume: number,
    distribution: number[],
    weight: number,
    minPrice: number | null = null,
    binSize: number | null = null
  ): void {
    // 使用传入的动态价格范围，或回退到全局价格范围
    const useMinPrice = minPrice !== null ? minPrice : this.minPrice;
    const useBinSize = binSize !== null ? binSize : this.binSize;

    const priceSpan = candle.high - candle.low;

    if (priceSpan === 0) {
      // 高低价相同，全部分配到对应档位
      const binIndex = Math.floor((candle.close - useMinPrice) / useBinSize);
      if (binIndex >= 0 && binIndex < distribution.length) {
        distribution[binIndex] += volume * weight;
      }
      return;
    }

    // 遍历K线覆盖的价格档位
    const startBin = Math.floor((candle.low - useMinPrice) / useBinSize);
    const endBin = Math.floor((candle.high - useMinPrice) / useBinSize);

    for (let i = Math.max(0, startBin); i <= Math.min(distribution.length - 1, endBin); i++) {
      const binPrice = useMinPrice + useBinSize * (i + 0.5);

      // 使用正态分布权重（假设成交量集中在中间价格）
      const relativePosition = (binPrice - candle.low) / priceSpan;
      const normalWeight = Math.exp(-Math.pow((relativePosition - 0.5) * 4, 2));

      distribution[i] += volume * weight * normalWeight;
    }
  }

  /**
   * 识别峰值
   */
  private findPeaks(distribution: ChipBin[]): ChipPeak[] {
    if (distribution.length === 0) return [];

    // 按成交量排序
    const sorted = [...distribution].sort((a, b) => b.volume - a.volume);

    const peaks: ChipPeak[] = [];

    // 主峰（成交量最大）
    if (sorted.length > 0) {
      peaks.push({ price: sorted[0].price, intensity: 'high' });
    }

    // 次峰（成交量第二大，且与主峰距离足够远）
    if (sorted.length > 1) {
      const mainPeakPrice = sorted[0].price;
      for (let i = 1; i < sorted.length; i++) {
        const priceDiff = Math.abs(sorted[i].price - mainPeakPrice);
        // 至少相差5%
        if (priceDiff > mainPeakPrice * 0.05) {
          peaks.push({ price: sorted[i].price, intensity: 'medium' });
          break;
        }
      }
    }

    return peaks;
  }

  /**
   * 计算两个日期之间的天数差
   */
  private dateDiff(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * 日期加减
   */
  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✓ 筹码计算器缓存已清空');
  }

  /**
   * 获取统计信息
   */
  getStats(): ChipStats {
    return {
      cacheSize: this.cache.size,
      candlesCount: this.candles?.length || 0,
      priceRange: [this.minPrice, this.maxPrice],
      binSize: this.binSize,
      options: this.options
    };
  }
}

// 导出单例
export const chipCalculator = new ChipCalculator();
