/**
 * OHLCV Bar Component
 * 显示当前 K 线的 OHLCV 数据和技术指标信息
 */

import type {
  IChartApi,
  MouseEventParams,
  CandlestickData,
  HistogramData,
} from 'lightweight-charts';
import type { ChartSeries } from '../types';

/**
 * OHLCV Bar 组件类
 */
export class OHLCVBar {
  private barElement: HTMLDivElement | null = null;
  private chartInstance: IChartApi | null = null;
  private seriesRefs: ChartSeries | null = null;

  /**
   * 工具函数：格式化数字
   */
  private formatNumber(num: number | null | undefined, decimals: number = 2): string {
    if (num === null || num === undefined) return '--';
    return num.toFixed(decimals);
  }

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.id = 'ohlcv-bar';
    bar.className = 'ohlcv-bar';
    return bar;
  }

  /**
   * 构建 OHLCV 显示内容（仅显示 OHLCV）
   */
  private buildContent(param: MouseEventParams): string {
    if (!param || !param.time || !param.point || !this.seriesRefs) {
      return '';
    }

    // 获取 K 线和成交量数据
    const candleData = param.seriesData.get(this.seriesRefs.candle!) as CandlestickData | undefined;
    const volumeData = param.seriesData.get(this.seriesRefs.volume!) as HistogramData | undefined;

    if (!candleData) {
      return '';
    }

    // 计算涨跌
    const priceChange = candleData.close - candleData.open;
    const priceChangeClass = priceChange >= 0 ? 'up' : 'down';

    const items: string[] = [];

    // OHLC 数据
    items.push(`<span class="ohlcv-item">O: ${this.formatNumber(candleData.open)}</span>`);
    items.push(`<span class="ohlcv-item">H: ${this.formatNumber(candleData.high)}</span>`);
    items.push(`<span class="ohlcv-item">L: ${this.formatNumber(candleData.low)}</span>`);
    items.push(
      `<span class="ohlcv-item">C: <span class="${priceChangeClass}">${this.formatNumber(candleData.close)}</span></span>`
    );

    // 成交量
    if (volumeData) {
      items.push(`<span class="ohlcv-item">Vol: ${this.formatNumber(volumeData.value, 0)}</span>`);
    }

    return items.join(' ');
  }

  /**
   * 更新显示内容
   */
  private update(param: MouseEventParams): void {
    if (!this.barElement) return;

    const content = this.buildContent(param);

    if (content) {
      this.barElement.innerHTML = content;
      this.barElement.style.display = 'block';
    } else {
      this.barElement.style.display = 'none';
    }
  }

  /**
   * 显示最新 K 线数据
   */
  showLatestData(): void {
    if (!this.barElement || !this.seriesRefs || !this.seriesRefs.candle) return;

    try {
      // 获取最新的 K 线数据
      const candleData = (this.seriesRefs.candle as any).dataByIndex(
        (this.seriesRefs.candle as any).data().length - 1
      );
      const volumeData = this.seriesRefs.volume
        ? (this.seriesRefs.volume as any).dataByIndex(
            (this.seriesRefs.volume as any).data().length - 1
          )
        : null;

      if (!candleData) {
        this.barElement.style.display = 'none';
        return;
      }

      // 构建显示内容
      const priceChange = candleData.close - candleData.open;
      const priceChangeClass = priceChange >= 0 ? 'up' : 'down';

      const items: string[] = [];
      items.push(`<span class="ohlcv-item">O: ${this.formatNumber(candleData.open)}</span>`);
      items.push(`<span class="ohlcv-item">H: ${this.formatNumber(candleData.high)}</span>`);
      items.push(`<span class="ohlcv-item">L: ${this.formatNumber(candleData.low)}</span>`);
      items.push(
        `<span class="ohlcv-item">C: <span class="${priceChangeClass}">${this.formatNumber(candleData.close)}</span></span>`
      );

      if (volumeData) {
        items.push(`<span class="ohlcv-item">Vol: ${this.formatNumber(volumeData.value, 0)}</span>`);
      }

      this.barElement.innerHTML = items.join(' ');
      this.barElement.style.display = 'block';
    } catch (error) {
      console.error('显示最新数据失败:', error);
      this.barElement.style.display = 'none';
    }
  }

  /**
   * 初始化组件
   * @param chart - Lightweight Charts 实例
   * @param series - 所有系列的引用对象
   * @param containerId - 父容器 ID
   */
  init(chart: IChartApi, series: ChartSeries, containerId: string = 'main-chart'): boolean {
    console.log('📊 初始化 OHLCV Bar 组件...');

    if (!chart || !series) {
      console.error('缺少必要参数：chart 或 series');
      return false;
    }

    this.chartInstance = chart;
    this.seriesRefs = series;

    // 查找挂载点
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`容器 #${containerId} 未找到`);
      return false;
    }

    // 创建并插入 HTML
    this.barElement = this.createHTML();
    const parentWrapper = container.parentElement;
    if (parentWrapper) {
      parentWrapper.appendChild(this.barElement);
    } else {
      console.error('无法找到父容器');
      return false;
    }

    // 订阅 crosshair 移动事件
    this.chartInstance.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.point) {
        // 鼠标移出时显示最新数据
        this.showLatestData();
        return;
      }
      this.update(param);
    });

    // 初始化时显示最新数据
    this.showLatestData();

    console.log('✅ OHLCV Bar 组件初始化完成');
    return true;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.barElement) {
      this.barElement.remove();
      this.barElement = null;
    }
    this.chartInstance = null;
    this.seriesRefs = null;
    console.log('✅ OHLCV Bar 组件已销毁');
  }
}

// 导出单例
export const ohlcvBar = new OHLCVBar();
