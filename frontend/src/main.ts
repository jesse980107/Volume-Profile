/**
 * 股票分析系统 - 主应用
 * 使用 Lightweight Charts v5.x 最新 API
 * 优雅、现代、模块化实现
 */

import * as LightweightCharts from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  MouseEventParams,
} from 'lightweight-charts';

import type {
  StockDataResponse,
  TimeframeType,
  ChipOptions,
  AppState,
  AppConfig,
  ChartSeries,
  ChartPanes,
} from './types';

import { chipCalculator } from './services/chipCalculator';
import { chipManager } from './services/chipManager';
import { ohlcvBar } from './components/ohlcvBar';
import { indicatorSelector } from './components/indicatorSelector';

// ==================== 全局状态 ====================
const state: AppState = {
  stockData: null,
  chipData: null,
  chart: null,
  currentInterval: 'daily',
  panes: {
    main: null,
    volume: null,
    macd: null,
    kdj: null,
    rsi: null,
  },
  series: {
    candle: null,
    volume: null,
    sma5: null,
    sma10: null,
    sma20: null,
    sma60: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
    kdjK: null,
    kdjD: null,
    kdjJ: null,
    rsi: null,
    bollUpper: null,
    bollMiddle: null,
    bollLower: null,
  },
  visibleIndicators: {
    sma5: true,
    sma10: true,
    sma20: true,
    sma60: false,
    macd: false,
    kdj: false,
    rsi: false,
    boll: false,
  },
};

// ==================== 配置 ====================
const config: AppConfig = {
  symbol: '000155.sz',
  apiUrl: '/api/v1/stock',
  defaultInterval: 'daily',
};

const colors = {
  up: '#ef5350',
  down: '#26a69a',
  sma5: '#FF6B6B',
  sma10: '#4ECDC4',
  sma20: '#45B7D1',
  sma60: '#FFA07A',
  bollUpper: '#FF6D00',
  bollMiddle: '#2962FF',
  bollLower: '#00C853',
  macd: '#2962FF',
  signal: '#FF6D00',
  kdj: { k: '#2962FF', d: '#FF6D00', j: '#00C853' },
  rsi: '#9C27B0',
};

// ==================== 工具函数 ====================
const utils = {
  showLoading: (message: string = 'Loading data...'): void => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'flex';
      const textEl = loadingEl.querySelector('p');
      if (textEl) textEl.textContent = message;
    }
  },

  hideLoading: (): void => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  },

  handleError: (error: Error): void => {
    console.error('Error:', error);
    alert(`加载失败: ${error.message}`);
    utils.hideLoading();
  },

  formatNumber: (num: number | null | undefined, decimals: number = 2): string => {
    if (num === null || num === undefined) return '--';
    return num.toFixed(decimals);
  },

  formatDate: (timestamp: number): string => {
    if (!timestamp) return '--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  },
};

// ==================== API 调用 ====================
async function fetchStockData(interval: TimeframeType = 'daily'): Promise<StockDataResponse> {
  utils.showLoading();
  try {
    const response = await fetch(`${config.apiUrl}/${config.symbol}?interval=${interval}`);
    if (!response.ok) throw new Error('Failed to fetch data');

    const data = await response.json();
    state.stockData = data;
    state.currentInterval = interval;
    console.log(`✅ 数据加载成功 (${interval}):`, data);
    return data;
  } catch (error) {
    utils.handleError(error as Error);
    throw error;
  } finally {
    utils.hideLoading();
  }
}

// ==================== 图表初始化 (多 Pane API) ====================
function initializeCharts(): void {
  console.log('📊 初始化图表 (使用多 Pane API)...');

  const container = document.getElementById('main-chart');
  if (!container) {
    throw new Error('Chart container not found');
  }

  // 创建单个 chart 实例，占满容器高度（深色主题）
  state.chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#222' },
      textColor: '#DDD',
    },
    grid: {
      vertLines: { color: '#444' },
      horzLines: { color: '#444' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        color: '#C3BCDB44',
        labelBackgroundColor: '#9B7DFF',
      },
      horzLine: {
        color: '#9B7DFF',
        labelBackgroundColor: '#9B7DFF',
      },
    },
    timeScale: {
      borderColor: '#71649C',
      timeVisible: true,
      rightOffset: 5,
      barSpacing: 6,
      lockVisibleTimeRangeOnResize: true,
    },
    rightPriceScale: {
      borderColor: '#71649C',
    },
    leftPriceScale: {
      visible: false,
    },
  });

  // 获取默认的主 pane (pane 0)
  state.panes.main = state.chart.panes()[0];

  // 添加成交量 pane
  state.panes.volume = state.chart.addPane();

  console.log('✅ 图表初始化完成 (主图 + 成交量，共用一个 chart 实例)');
  console.log('   MACD/KDJ/RSI panes 将在用户勾选时创建');
}

// ==================== 数据渲染 (多 Pane API) ====================
function renderMainChart(data: StockDataResponse): void {
  console.log('📈 渲染主图表 (Pane 0)...');

  if (!state.chart) return;

  // 在主 pane 上添加 K线系列
  state.series.candle = state.chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: colors.up,
    downColor: colors.down,
    borderVisible: false,
    wickUpColor: colors.up,
    wickDownColor: colors.down,
  }) as any;
  state.series.candle.setData(data.candlestick);

  // 添加均线到主 pane
  state.series.sma5 = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.sma5,
    lineWidth: 2,
    title: 'MA5',
  }) as any;
  state.series.sma5.setData(data.sma5);

  state.series.sma10 = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.sma10,
    lineWidth: 2,
    title: 'MA10',
  }) as any;
  state.series.sma10.setData(data.sma10);

  state.series.sma20 = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.sma20,
    lineWidth: 2,
    title: 'MA20',
  }) as any;
  state.series.sma20.setData(data.sma20);

  state.series.sma60 = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.sma60,
    lineWidth: 2,
    title: 'MA60',
    visible: false,
  }) as any;
  state.series.sma60.setData(data.sma60);

  // 布林带 (默认隐藏)
  state.series.bollUpper = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.bollUpper,
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    title: 'BOLL Upper',
    visible: false,
  }) as any;
  state.series.bollUpper.setData(data.boll.upper);

  state.series.bollMiddle = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.bollMiddle,
    lineWidth: 1,
    title: 'BOLL Middle',
    visible: false,
  }) as any;
  state.series.bollMiddle.setData(data.boll.middle);

  state.series.bollLower = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.bollLower,
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    title: 'BOLL Lower',
    visible: false,
  }) as any;
  state.series.bollLower.setData(data.boll.lower);

  console.log('✅ 主图表渲染完成');
}

function renderVolumeChart(data: StockDataResponse): void {
  console.log('📊 渲染成交量图表 (Pane 1)...');

  if (!state.chart) return;

  state.series.volume = state.chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: {
      type: 'volume',
      precision: 0,
      minMove: 1,
    },
  }) as any;
  state.series.volume.setData(data.volume);
  state.series.volume.moveToPane(1);

  console.log('✅ 成交量图表渲染完成');
}

function renderMACDChart(data: StockDataResponse): void {
  if (!state.panes.macd || !state.chart) {
    console.log('⏳ MACD pane 未创建，数据已保存');
    return;
  }

  console.log('📉 渲染 MACD 图表...');

  const paneIndex = state.chart.panes().indexOf(state.panes.macd);

  state.series.macd = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.macd,
    lineWidth: 2,
    title: 'DIF',
  }) as any;
  state.series.macd.setData(data.macd.macd);
  state.series.macd.moveToPane(paneIndex);

  state.series.macdSignal = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.signal,
    lineWidth: 2,
    title: 'DEA',
  }) as any;
  state.series.macdSignal.setData(data.macd.signal);
  state.series.macdSignal.moveToPane(paneIndex);

  state.series.macdHistogram = state.chart.addSeries(LightweightCharts.HistogramSeries, {
    color: colors.macd,
    title: 'MACD',
  }) as any;

  const histData = data.macd.histogram.map((item) => ({
    time: item.time,
    value: item.value,
    color: item.value >= 0 ? colors.up : colors.down,
  }));
  state.series.macdHistogram.setData(histData);
  state.series.macdHistogram.moveToPane(paneIndex);

  console.log('✅ MACD 图表渲染完成');
}

function renderKDJChart(data: StockDataResponse): void {
  if (!state.panes.kdj || !state.chart) {
    console.log('⏳ KDJ pane 未创建，数据已保存');
    return;
  }

  console.log('📊 渲染 KDJ 图表...');

  const paneIndex = state.chart.panes().indexOf(state.panes.kdj);

  state.series.kdjK = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.kdj.k,
    lineWidth: 2,
    title: 'K',
  }) as any;
  state.series.kdjK.setData(data.kdj.k);
  state.series.kdjK.moveToPane(paneIndex);

  state.series.kdjD = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.kdj.d,
    lineWidth: 2,
    title: 'D',
  }) as any;
  state.series.kdjD.setData(data.kdj.d);
  state.series.kdjD.moveToPane(paneIndex);

  state.series.kdjJ = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.kdj.j,
    lineWidth: 2,
    title: 'J',
  }) as any;
  state.series.kdjJ.setData(data.kdj.j);
  state.series.kdjJ.moveToPane(paneIndex);

  console.log('✅ KDJ 图表渲染完成');
}

function renderRSIChart(data: StockDataResponse): void {
  if (!state.panes.rsi || !state.chart) {
    console.log('⏳ RSI pane 未创建，数据已保存');
    return;
  }

  console.log('📈 渲染 RSI 图表...');

  const paneIndex = state.chart.panes().indexOf(state.panes.rsi);

  state.series.rsi = state.chart.addSeries(LightweightCharts.LineSeries, {
    color: colors.rsi,
    lineWidth: 2,
    title: 'RSI',
  }) as any;
  state.series.rsi.setData(data.rsi);
  state.series.rsi.moveToPane(paneIndex);

  console.log('✅ RSI 图表渲染完成');
}

// ==================== 时间间隔切换 ====================
async function switchTimeframe(interval: TimeframeType): Promise<void> {
  console.log(`🔄 切换时间间隔: ${interval}`);

  try {
    // 1. 获取新数据
    const data = await fetchStockData(interval);

    // 2. 更新所有系列的数据
    if (state.series.candle) state.series.candle.setData(data.candlestick);
    if (state.series.volume) state.series.volume.setData(data.volume);
    if (state.series.sma5) state.series.sma5.setData(data.sma5);
    if (state.series.sma10) state.series.sma10.setData(data.sma10);
    if (state.series.sma20) state.series.sma20.setData(data.sma20);
    if (state.series.sma60) state.series.sma60.setData(data.sma60);
    if (state.series.bollUpper) state.series.bollUpper.setData(data.boll.upper);
    if (state.series.bollMiddle) state.series.bollMiddle.setData(data.boll.middle);
    if (state.series.bollLower) state.series.bollLower.setData(data.boll.lower);

    // 3. 更新 MACD 数据（如果已创建）
    if (state.panes.macd && state.series.macd) {
      state.series.macd.setData(data.macd.macd);
      if (state.series.macdSignal) state.series.macdSignal.setData(data.macd.signal);
      if (state.series.macdHistogram) {
        const histData = data.macd.histogram.map((item) => ({
          time: item.time,
          value: item.value,
          color: item.value >= 0 ? colors.up : colors.down,
        }));
        state.series.macdHistogram.setData(histData);
      }
    }

    // 4. 更新 KDJ 数据（如果已创建）
    if (state.panes.kdj && state.series.kdjK) {
      state.series.kdjK.setData(data.kdj.k);
      if (state.series.kdjD) state.series.kdjD.setData(data.kdj.d);
      if (state.series.kdjJ) state.series.kdjJ.setData(data.kdj.j);
    }

    // 5. 更新 RSI 数据（如果已创建）
    if (state.panes.rsi && state.series.rsi) {
      state.series.rsi.setData(data.rsi);
    }

    // 6. 更新筹码分布（如果已加载）
    chipCalculator.initialize(data.candlestick, data.volume);
    const options = getChipSettingsFromUI();
    chipCalculator.updateOptions(options);

    utils.showLoading('正在计算筹码分布...');
    chipCalculator.precomputeAll();
    utils.hideLoading();

    const lastCandle = data.candlestick[data.candlestick.length - 1];
    const lastChipData = chipCalculator.get(lastCandle.time);
    if (lastChipData) {
      chipManager.updateGlobal(lastChipData);
    }

    // 7. 调整可见范围
    if (state.chart) {
      state.chart.timeScale().fitContent();
    }

    // 8. 更新按钮状态
    document.querySelectorAll('.timeframe-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-interval="${interval}"]`)?.classList.add('active');

    console.log(`✅ 时间间隔切换完成: ${interval}`);
  } catch (error) {
    console.error('❌ 时间间隔切换失败:', error);
    alert(`切换时间间隔失败: ${(error as Error).message}`);
  }
}

// ==================== 控制面板事件 ====================
function setupControls(): void {
  console.log('⚙️ 设置控制面板...');

  // 初始化 indicator 选择器组件
  indicatorSelector.init('main-chart');

  // 均线显示控制
  indicatorSelector.on('show-sma5', (checked) => {
    state.series.sma5?.applyOptions({ visible: checked });
  });

  indicatorSelector.on('show-sma10', (checked) => {
    state.series.sma10?.applyOptions({ visible: checked });
  });

  indicatorSelector.on('show-sma20', (checked) => {
    state.series.sma20?.applyOptions({ visible: checked });
  });

  indicatorSelector.on('show-sma60', (checked) => {
    state.series.sma60?.applyOptions({ visible: checked });
  });

  // 布林带显示控制
  indicatorSelector.on('show-boll', (checked) => {
    state.series.bollUpper?.applyOptions({ visible: checked });
    state.series.bollMiddle?.applyOptions({ visible: checked });
    state.series.bollLower?.applyOptions({ visible: checked });
  });

  // MACD 显示控制
  indicatorSelector.on('show-macd', (checked) => {
    if (checked) {
      if (!state.panes.macd && state.chart) {
        console.log('📊 创建 MACD pane...');
        state.panes.macd = state.chart.addPane();
        if (state.stockData) {
          renderMACDChart(state.stockData);
        }
      }
    } else {
      if (state.panes.macd && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.macd);
        state.chart.removePane(paneIndex);
        state.panes.macd = null;
        state.series.macd = null;
        state.series.macdSignal = null;
        state.series.macdHistogram = null;
      }
    }
  });

  // KDJ 显示控制
  indicatorSelector.on('show-kdj', (checked) => {
    if (checked) {
      if (!state.panes.kdj && state.chart) {
        console.log('📊 创建 KDJ pane...');
        state.panes.kdj = state.chart.addPane();
        if (state.stockData) {
          renderKDJChart(state.stockData);
        }
      }
    } else {
      if (state.panes.kdj && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.kdj);
        state.chart.removePane(paneIndex);
        state.panes.kdj = null;
        state.series.kdjK = null;
        state.series.kdjD = null;
        state.series.kdjJ = null;
      }
    }
  });

  // RSI 显示控制
  indicatorSelector.on('show-rsi', (checked) => {
    if (checked) {
      if (!state.panes.rsi && state.chart) {
        console.log('📊 创建 RSI pane...');
        state.panes.rsi = state.chart.addPane();
        if (state.stockData) {
          renderRSIChart(state.stockData);
        }
      }
    } else {
      if (state.panes.rsi && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.rsi);
        state.chart.removePane(paneIndex);
        state.panes.rsi = null;
        state.series.rsi = null;
      }
    }
  });

  console.log('✅ Indicator 选择器组件已设置');

  // 时间间隔切换按钮事件
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  timeframeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const interval = (btn as HTMLButtonElement).dataset.interval as TimeframeType;
      if (interval && interval !== state.currentInterval) {
        switchTimeframe(interval);
      }
    });
  });
  console.log('✅ 时间间隔按钮已设置');

  console.log('✅ 控制面板设置完成');
}

// ==================== 响应式处理 ====================
function setupResponsive(): void {
  console.log('📱 设置响应式布局...');

  window.addEventListener('resize', () => {
    if (state.chart) {
      const container = document.getElementById('main-chart');
      if (container) {
        state.chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    }
  });

  console.log('✅ 响应式布局设置完成');
}

// ==================== 筹码峰初始化 ====================
async function initializeChipDistribution(): Promise<void> {
  if (!state.stockData) return;

  try {
    chipCalculator.initialize(state.stockData.candlestick, state.stockData.volume);

    const options = getChipSettingsFromUI();
    chipCalculator.updateOptions(options);

    console.log('开始预计算筹码分布...');
    utils.showLoading('正在计算筹码分布...');

    chipCalculator.precomputeAll((current, total) => {
      const progress = ((current / total) * 100).toFixed(0);
      console.log(`预计算进度: ${progress}%`);
    });

    utils.hideLoading();
    console.log('✓ 筹码分布预计算完成');

    const lastCandle = state.stockData.candlestick[state.stockData.candlestick.length - 1];
    const lastChipData = chipCalculator.get(lastCandle.time);
    if (lastChipData) {
      chipManager.updateGlobal(lastChipData);
    }
  } catch (error) {
    console.error('筹码分布初始化失败:', error);
    utils.hideLoading();
  }
}

function setupChipDistributionSync(): void {
  if (!state.chart) return;

  state.chart.subscribeCrosshairMove((param: MouseEventParams) => {
    if (!param.time || !state.series.candle) {
      chipManager.clearPriceLine();
      return;
    }

    const candleData = param.seriesData.get(state.series.candle);
    if (!candleData) {
      chipManager.clearPriceLine();
      return;
    }

    const chipData = chipCalculator.get(param.time as string);
    if (!chipData) {
      chipManager.clearPriceLine();
      return;
    }

    chipManager.updateGlobal(chipData);

    let cursorPrice = (candleData as any).close;

    if (param.point && state.stockData) {
      try {
        const chartElement = document.getElementById('main-chart');
        if (chartElement && state.chart) {
          const chartHeight = chartElement.clientHeight;
          const mouseY = param.point.y;

          const visibleRange = state.chart.timeScale().getVisibleLogicalRange();
          if (visibleRange) {
            const startIndex = Math.max(0, Math.floor(visibleRange.from));
            const endIndex = Math.min(state.stockData.candlestick.length - 1, Math.ceil(visibleRange.to));

            let minPrice = Infinity;
            let maxPrice = -Infinity;

            for (let i = startIndex; i <= endIndex; i++) {
              const candle = state.stockData.candlestick[i];
              if (candle) {
                minPrice = Math.min(minPrice, candle.low);
                maxPrice = Math.max(maxPrice, candle.high);
              }
            }

            if (minPrice !== Infinity && maxPrice !== -Infinity) {
              const priceRange = maxPrice - minPrice;
              const pricePerPixel = priceRange / chartHeight;
              cursorPrice = maxPrice - mouseY * pricePerPixel;
            }
          }
        }
      } catch (error) {
        console.warn('计算光标价格失败，使用收盘价:', error);
      }
    }

    chipManager.updatePriceLine(cursorPrice, param.time as string);
  });

  console.log('✅ 筹码峰联动已设置');
}

// ==================== 筹码峰设置 ====================
function getChipSettingsFromUI(): ChipOptions {
  const useAllHistory = (document.getElementById('use-all-history') as HTMLInputElement | null)?.checked;
  const lookbackValue = (document.getElementById('lookback-days') as HTMLInputElement | null)?.value;

  return {
    lookbackDays: useAllHistory ? 'all' : lookbackValue ? parseInt(lookbackValue) : 90,
    decayRate: parseFloat((document.getElementById('decay-rate') as HTMLInputElement | null)?.value || '0.05'),
    numBins: parseInt((document.getElementById('num-bins') as HTMLInputElement | null)?.value || '50'),
    decayAlgorithm:
      ((document.getElementById('decay-algorithm') as HTMLSelectElement | null)?.value as any) || 'cumulative',
  };
}

function setupChipSettings(): void {
  const modal = document.getElementById('chip-settings-modal');
  const settingsBtn = document.getElementById('chip-settings-btn');
  const closeBtn = document.querySelector('.modal-close');
  const applyBtn = document.getElementById('apply-settings-btn');
  const resetBtn = document.getElementById('reset-settings-btn');
  const decayRateSlider = document.getElementById('decay-rate') as HTMLInputElement | null;
  const decayRateDisplay = document.getElementById('decay-rate-display');
  const lookbackDaysInput = document.getElementById('lookback-days') as HTMLInputElement | null;
  const useAllHistoryCheckbox = document.getElementById('use-all-history') as HTMLInputElement | null;

  if (!modal || !settingsBtn) {
    console.warn('筹码设置面板元素未找到');
    return;
  }

  const closeModal = () => {
    modal.classList.remove('active');
  };

  settingsBtn.addEventListener('click', () => {
    modal.classList.add('active');
  });

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  useAllHistoryCheckbox?.addEventListener('change', (e) => {
    if (lookbackDaysInput) {
      lookbackDaysInput.disabled = (e.target as HTMLInputElement).checked;
      lookbackDaysInput.style.opacity = (e.target as HTMLInputElement).checked ? '0.5' : '1';
      lookbackDaysInput.style.cursor = (e.target as HTMLInputElement).checked ? 'not-allowed' : 'text';
    }
  });

  decayRateSlider?.addEventListener('input', (e) => {
    if (decayRateDisplay) {
      decayRateDisplay.textContent = (e.target as HTMLInputElement).value;
    }
  });

  applyBtn?.addEventListener('click', async () => {
    try {
      const newOptions = getChipSettingsFromUI();
      chipCalculator.updateOptions(newOptions);

      utils.showLoading('正在重新计算筹码分布...');
      chipCalculator.precomputeAll((current, total) => {
        const progress = ((current / total) * 100).toFixed(0);
        if (current % 500 === 0) {
          console.log(`重新计算进度: ${progress}%`);
        }
      });
      utils.hideLoading();

      if (state.stockData) {
        const lastCandle = state.stockData.candlestick[state.stockData.candlestick.length - 1];
        const lastChipData = chipCalculator.get(lastCandle.time);
        if (lastChipData) {
          chipManager.updateGlobal(lastChipData);
        }
      }

      console.log('✓ 筹码分布已更新');
      closeModal();
    } catch (error) {
      console.error('应用设置失败:', error);
      utils.hideLoading();
      alert('应用设置失败: ' + (error as Error).message);
    }
  });

  resetBtn?.addEventListener('click', () => {
    if (lookbackDaysInput) lookbackDaysInput.value = '90';
    if (useAllHistoryCheckbox) {
      useAllHistoryCheckbox.checked = false;
      if (lookbackDaysInput) {
        lookbackDaysInput.disabled = false;
        lookbackDaysInput.style.opacity = '1';
        lookbackDaysInput.style.cursor = 'text';
      }
    }
    const algoSelect = document.getElementById('decay-algorithm') as HTMLSelectElement | null;
    if (algoSelect) algoSelect.value = 'cumulative';
    if (decayRateSlider) decayRateSlider.value = '0.05';
    if (decayRateDisplay) decayRateDisplay.textContent = '0.05';
    const binsInput = document.getElementById('num-bins') as HTMLInputElement | null;
    if (binsInput) binsInput.value = '50';
  });

  console.log('✓ 筹码设置面板已初始化');
}

// ==================== 主初始化 ====================
async function init(): Promise<void> {
  console.log('🚀 应用初始化开始...');

  try {
    // 1. 加载数据
    const data = await fetchStockData();
    state.stockData = data;

    // 2. 初始化图表
    initializeCharts();

    // 3. 渲染数据
    renderMainChart(data);
    renderVolumeChart(data);

    // 4. 初始化 OHLCV Bar 组件
    if (state.chart) {
      ohlcvBar.init(state.chart, state.series, 'main-chart');
      console.log('✅ OHLCV Bar 组件已加载');
    }

    // 5. 初始化筹码峰管理器
    chipManager.init();
    await initializeChipDistribution();
    setupChipDistributionSync();
    setupChipSettings();
    console.log('✅ 筹码峰模块已加载');

    // 6. 设置控制面板
    setupControls();

    // 7. 响应式
    setupResponsive();

    console.log('✅ 应用初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  }
}

// ==================== 应用启动 ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 DOM 加载完成,启动应用...');
  init();
});
