/**
 * 筹码峰管理器
 * 负责筹码分布的可视化和统计计算
 * 使用 ECharts 实现横向柱状图
 */

import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';
import type { ChipDistributionResult, ChipBin, ChipPeak } from './chipCalculator';

/**
 * 获利盘和套牢盘比例
 */
interface ProfitLossRatio {
  profitRatio: number;
  lossRatio: number;
}

/**
 * 图表数据项
 */
interface ChartDataItem {
  value: number;
  percentage: number;
  itemStyle: {
    color: echarts.LinearGradientObject;
  };
}

/**
 * 筹码峰管理器类
 */
export class ChipManager {
  private chart: ECharts | null = null;
  private container: HTMLElement | null = null;
  private globalChipData: ChipDistributionResult | null = null;
  private totalVolume: number = 0;

  /**
   * 初始化 ECharts 实例
   */
  init(): void {
    this.container = document.getElementById('chip-canvas');

    if (!this.container) {
      console.error('筹码峰容器未找到: #chip-canvas');
      return;
    }

    // 初始化深色主题
    this.chart = echarts.init(this.container, 'dark');

    // 设置基础配置
    const option = this.getBaseOption();
    this.chart.setOption(option);

    // 响应式处理
    this.setupResize();

    console.log('✓ 筹码峰管理器初始化成功');
  }

  /**
   * 获取基础 ECharts 配置
   */
  private getBaseOption(): EChartsOption {
    return {
      backgroundColor: 'transparent',
      grid: {
        left: 10,
        right: 50,
        top: 20,
        bottom: 20,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const data = params[0];
          const price = data.name;
          const volume = data.value;
          const percentage = data.data.percentage || 0;
          return `
                        <div style="padding: 5px;">
                            <div style="font-weight: 600;">价格: ¥${price}</div>
                            <div>成交量: ${this.formatVolume(volume)}</div>
                            <div>占比: ${percentage.toFixed(2)}%</div>
                        </div>
                    `;
        },
        backgroundColor: 'rgba(30, 34, 45, 0.95)',
        borderColor: '#2a2e39',
        textStyle: {
          color: '#d1d4dc',
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'value',
        show: false,
        min: 0,
      },
      yAxis: {
        type: 'category',
        position: 'right',
        data: [],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#787b86',
          fontSize: 11,
          formatter: (value: any) => '¥' + value,
        },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: [],
          barWidth: 8,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(255, 107, 107, 0.5)',
            },
          },
          animationDuration: 300,
          animationEasing: 'cubicOut',
        },
      ],
    };
  }

  /**
   * 更新筹码峰数据（全局视图）
   * @param chipData - 筹码数据 { distribution: [], peaks: [] }
   */
  updateGlobal(chipData: ChipDistributionResult): void {
    if (!this.chart) {
      console.warn('ECharts 实例未初始化');
      return;
    }

    if (!chipData || !chipData.distribution || chipData.distribution.length === 0) {
      this.hide();
      return;
    }

    // 存储数据供后续使用
    this.globalChipData = chipData;

    // 按价格排序（从低到高）
    const sorted = [...chipData.distribution].sort((a, b) => a.price - b.price);

    // 计算总成交量
    const totalVolume = sorted.reduce((sum, d) => sum + d.volume, 0);
    this.totalVolume = totalVolume;

    // 提取数据 - 横向柱状图
    const chartData: any[] = sorted.map((d) => {
      const isPeak = this.isPeak(d.price, chipData.peaks);
      const percentage = (d.volume / totalVolume) * 100;

      return {
        value: [d.volume, d.price], // [X轴:成交量, Y轴:价格] - 横向条形图
        percentage: percentage,
        itemStyle: this.getBarStyle(isPeak, false), // 不区分获利盘套牢盘
      };
    });

    // 获取价格范围
    const minPrice = sorted[0].price;
    const maxPrice = sorted[sorted.length - 1].price;

    // Y 轴配置 - 价格轴（使用 value 类型以支持精确的 min/max）
    const yAxisConfig = {
      type: 'value' as const,
      position: 'right' as const,
      min: minPrice,
      max: maxPrice,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#787b86',
        fontSize: 11,
        formatter: (value: number) => '¥' + value.toFixed(2),
      },
      splitLine: { show: false },
    };

    // X 轴配置 - 成交量（隐藏）
    const xAxisConfig = {
      type: 'value' as const,
      show: false,
      min: 0,
    };

    // 更新图表
    this.chart.setOption({
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      series: [
        {
          type: 'custom',  // 使用 custom 类型绘制横向条形
          renderItem: (params: any, api: any) => {
            const volume = api.value(0);  // X: 成交量
            const price = api.value(1);   // Y: 价格
            const yPos = api.coord([0, price])[1];  // 价格对应的像素 Y 坐标
            const xEnd = api.coord([volume, price])[0];  // 成交量对应的像素 X 坐标

            const height = 8;  // 条形高度
            const barStyle = chartData[params.dataIndex].itemStyle;

            return {
              type: 'rect',
              shape: {
                x: params.coordSys.x,  // 起点 X（图表左侧）
                y: yPos - height / 2,  // Y 坐标居中
                width: xEnd - params.coordSys.x,  // 宽度
                height: height,
              },
              style: {
                fill: barStyle.color,
              },
            };
          },
          data: chartData,
        },
      ],
    });

    // 更新统计信息（不显示当前价格相关的）
    this.updateGlobalStats(chipData, totalVolume);
  }

  /**
   * 同步 Y 轴到 Lightweight Charts 的价格范围
   * @param minPrice - Lightweight Charts 的最小价格
   * @param maxPrice - Lightweight Charts 的最大价格
   */
  syncYAxis(minPrice: number, maxPrice: number): void {
    if (!this.chart || !this.globalChipData) return;

    // 过滤出在可见范围内的筹码数据
    const visibleChips = this.globalChipData.distribution.filter(
      (d) => d.price >= minPrice && d.price <= maxPrice
    );

    // 如果可见范围内没有筹码，只更新 Y 轴范围，不更新数据
    if (visibleChips.length === 0) {
      this.chart.setOption({
        yAxis: {
          min: minPrice,
          max: maxPrice,
        },
      });
      return;
    }

    // 按价格排序
    const sorted = [...visibleChips].sort((a, b) => a.price - b.price);

    // 计算总成交量（使用可见范围内的）
    const totalVolume = sorted.reduce((sum, d) => sum + d.volume, 0);

    // 提取数据 - [X:成交量, Y:价格] 横向条形图
    const chartData: any[] = sorted.map((d) => {
      const isPeak = this.isPeak(d.price, this.globalChipData!.peaks);
      const percentage = (d.volume / totalVolume) * 100;

      return {
        value: [d.volume, d.price], // [X轴:成交量, Y轴:价格]
        percentage: percentage,
        itemStyle: this.getBarStyle(isPeak, false),
      };
    });

    // 关键：强制设置 Y 轴范围与 Lightweight Charts 一致
    this.chart.setOption({
      yAxis: {
        min: minPrice,
        max: maxPrice,
      },
      series: [
        {
          data: chartData,
        },
      ],
    });
  }

  /**
   * 更新统计信息（不绘制价格线）
   * @param currentPrice - 当前价格
   * @param currentDate - 当前日期
   */
  updateStats(currentPrice: number, currentDate: string): void {
    if (!this.globalChipData) return;

    // 计算获利盘和套牢盘
    const { profitRatio, lossRatio } = this.calculateProfitLoss(
      this.globalChipData.distribution,
      currentPrice,
      this.totalVolume
    );

    // 更新统计信息 UI
    const dateEl = document.getElementById('chip-date');
    if (dateEl) {
      dateEl.textContent = currentDate || '--';
    }

    const profitEl = document.getElementById('profit-ratio');
    if (profitEl) {
      profitEl.textContent = `${profitRatio.toFixed(1)}%`;
    }

    const lossEl = document.getElementById('loss-ratio');
    if (lossEl) {
      lossEl.textContent = `${lossRatio.toFixed(1)}%`;
    }
  }

  /**
   * 清除统计信息（鼠标离开时调用）
   */
  clearPriceLine(): void {
    const dateEl = document.getElementById('chip-date');
    if (dateEl) {
      dateEl.textContent = '--';
    }

    const profitEl = document.getElementById('profit-ratio');
    if (profitEl) {
      profitEl.textContent = '--';
    }

    const lossEl = document.getElementById('loss-ratio');
    if (lossEl) {
      lossEl.textContent = '--';
    }
  }

  /**
   * 判断是否为峰值
   */
  private isPeak(price: number, peaks: ChipPeak[]): boolean {
    if (!peaks || peaks.length === 0) return false;
    return peaks.some((p) => Math.abs(p.price - price) < 0.01);
  }

  /**
   * 获取柱状图样式
   * @param isPeak - 是否为峰值
   * @param isAbovePrice - 是否高于当前价（可选，全局视图时为false）
   */
  private getBarStyle(isPeak: boolean, isAbovePrice: boolean | null = null): { color: echarts.LinearGradientObject } {
    if (isPeak) {
      // 峰值 - 红色渐变高亮
      return {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(255, 107, 107, 0.5)' },
          { offset: 1, color: 'rgba(255, 107, 107, 1)' },
        ]),
      };
    } else if (isAbovePrice === null || isAbovePrice === false) {
      // 全局视图或获利盘 - 蓝灰色渐变
      return {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
          { offset: 1, color: 'rgba(69, 183, 209, 0.7)' },
        ]),
      };
    } else {
      // 套牢盘 - 绿色渐变
      return {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: 'rgba(38, 166, 154, 0.2)' },
          { offset: 1, color: 'rgba(38, 166, 154, 0.6)' },
        ]),
      };
    }
  }

  /**
   * 更新全局统计信息（不包含当前价格相关的）
   */
  private updateGlobalStats(chipData: ChipDistributionResult, totalVolume: number): void {
    // 计算集中度
    const concentration = this.calculateConcentration(chipData.distribution, totalVolume);
    const concentrationEl = document.getElementById('concentration');
    if (concentrationEl) {
      concentrationEl.textContent = `${concentration.toFixed(1)}%`;
    }

    // 主力成本（主峰价格）
    const mainPeak = chipData.peaks?.find((p) => p.intensity === 'high');
    const mainCostEl = document.getElementById('main-cost');
    if (mainCostEl) {
      mainCostEl.textContent = mainPeak ? `¥${mainPeak.price.toFixed(2)}` : '--';
    }

    // 初始化时，获利盘和套牢盘显示为 --
    const dateEl = document.getElementById('chip-date');
    if (dateEl) {
      dateEl.textContent = '全局视图';
    }

    const profitEl = document.getElementById('profit-ratio');
    if (profitEl) {
      profitEl.textContent = '--';
    }

    const lossEl = document.getElementById('loss-ratio');
    if (lossEl) {
      lossEl.textContent = '--';
    }
  }

  /**
   * 计算筹码集中度
   * 前 20% 价格区间的筹码占比
   */
  private calculateConcentration(distribution: ChipBin[], totalVolume: number): number {
    const sorted = [...distribution].sort((a, b) => b.volume - a.volume);
    const top20Count = Math.ceil(sorted.length * 0.2);
    const top20Volume = sorted.slice(0, top20Count).reduce((sum, d) => sum + d.volume, 0);
    return (top20Volume / totalVolume) * 100;
  }

  /**
   * 计算获利盘和套牢盘
   */
  private calculateProfitLoss(distribution: ChipBin[], currentPrice: number, totalVolume: number): ProfitLossRatio {
    let profitVolume = 0;
    let lossVolume = 0;

    distribution.forEach((d) => {
      if (d.price < currentPrice) {
        profitVolume += d.volume;
      } else {
        lossVolume += d.volume;
      }
    });

    return {
      profitRatio: (profitVolume / totalVolume) * 100,
      lossRatio: (lossVolume / totalVolume) * 100,
    };
  }

  /**
   * 隐藏筹码峰（无数据时）
   */
  hide(): void {
    if (!this.chart) return;

    this.chart.setOption({
      yAxis: { data: [] },
      series: [{ data: [] }],
    });

    // 清空统计信息
    this.clearStats();
  }

  /**
   * 清空统计信息显示
   */
  private clearStats(): void {
    const ids = ['chip-date', 'concentration', 'main-cost', 'profit-ratio', 'loss-ratio'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
  }

  /**
   * 格式化成交量显示
   */
  private formatVolume(volume: number): string {
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(2) + '亿';
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(2) + '万';
    } else {
      return volume.toFixed(0);
    }
  }

  /**
   * 设置响应式
   */
  private setupResize(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (this.chart) {
          this.chart.resize();
        }
      }, 200);
    });
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}

// 导出单例
export const chipManager = new ChipManager();
