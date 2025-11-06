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
import { timeframeSelector } from './components/timeframeSelector';
import { indicatorButton } from './components/indicatorButton';
import { indicatorModal } from './components/indicatorModal';
import { indicatorBarList } from './components/indicatorBarList';
import { indicatorSettingsPanel } from './components/indicatorSettingsPanel';
import { indicatorConfigManager } from './managers/indicatorConfigManager';

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
  // visibleIndicators 已移除 - 现在由 indicatorConfigManager 管理
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

// ==================== 旧代码已删除 ====================
// localStorage 参数管理已迁移到 indicatorConfigManager
// 所有配置统一从 indicators.config.json 读取和保存

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

// ==================== 指标参数构建 ====================
/**
 * 构建指标查询字符串 - 现在使用配置管理器
 * 格式: ma:5,20,60;kdj:9-3-3;macd:12-26-9;rsi:14;boll:20-2.0
 */
function buildIndicatorsQueryString(): string {
  return indicatorConfigManager.buildQueryString();
}

// ==================== API 调用 ====================
async function fetchStockData(interval: TimeframeType = 'daily', indicatorsQuery: string = ''): Promise<StockDataResponse> {
  utils.showLoading();
  try {
    let url = `${config.apiUrl}/${config.symbol}?interval=${interval}`;
    if (indicatorsQuery) {
      url += `&indicators=${encodeURIComponent(indicatorsQuery)}`;
    }

    console.log(`📡 请求数据: ${url}`);
    const response = await fetch(url);
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

  // 添加均线到主 pane - 从配置管理器获取
  const { periods: maPeriods, colors: maColors } = indicatorConfigManager.getMaRenderInfo();

  // 根据后端返回的数据动态渲染 MA 线
  // 后端返回的字段名：sma5, sma10, sma20, sma60（对应周期 5, 10, 20, 60）
  const maDataMap: Record<number, any> = {
    5: data.sma5,
    10: data.sma10,
    20: data.sma20,
    60: data.sma60,
  };

  // 渲染配置的 MA 线
  for (let i = 0; i < maPeriods.length; i++) {
    const period = maPeriods[i];
    const color = maColors[i];
    const maData = maDataMap[period];

    if (!maData) {
      console.warn(`⚠️ MA${period} 数据不存在，跳过渲染`);
      continue;
    }

    // 根据索引分配到对应的 series
    const series = state.chart.addSeries(LightweightCharts.LineSeries, {
      color: color,
      lineWidth: 2,
      title: `MA${period}`,
      priceLineVisible: false,
      lastValueVisible: false,
    }) as any;

    series.setData(maData);

    // 保存到 state（使用第一个可用的 slot）
    if (i === 0) state.series.sma5 = series;
    else if (i === 1) state.series.sma10 = series;
    else if (i === 2) state.series.sma20 = series;
  }

  // 布林带 (默认隐藏) - 检查数据是否存在
  if (data.boll && data.boll.upper) {
    state.series.bollUpper = state.chart.addSeries(LightweightCharts.LineSeries, {
      color: colors.bollUpper,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'BOLL Upper',
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    }) as any;
    state.series.bollUpper.setData(data.boll.upper);

    state.series.bollMiddle = state.chart.addSeries(LightweightCharts.LineSeries, {
      color: colors.bollMiddle,
      lineWidth: 1,
      title: 'BOLL Middle',
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    }) as any;
    state.series.bollMiddle.setData(data.boll.middle);

    state.series.bollLower = state.chart.addSeries(LightweightCharts.LineSeries, {
      color: colors.bollLower,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      title: 'BOLL Lower',
      visible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    }) as any;
    state.series.bollLower.setData(data.boll.lower);
  }

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
    // 1. 构建 indicators query string（使用保存的参数）
    const indicatorsQuery = buildIndicatorsQueryString();

    // 2. 获取新数据
    const data = await fetchStockData(interval, indicatorsQuery);

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

    console.log(`✅ 时间间隔切换完成: ${interval}`);
  } catch (error) {
    console.error('❌ 时间间隔切换失败:', error);
    alert(`切换时间间隔失败: ${(error as Error).message}`);
  }
}

// ==================== 控制面板事件 ====================
function setupControls(): void {
  console.log('⚙️ 设置控制面板...');

  // 1. 初始化 Timeframe Selector（下拉式）
  timeframeSelector.init('main-chart');
  timeframeSelector.onChange((interval) => {
    switchTimeframe(interval);
  });
  console.log('✅ Timeframe Selector 已设置');

  // 2. 初始化 Indicator Button
  indicatorButton.init('main-chart');
  indicatorButton.onClick(() => {
    indicatorModal.open();
  });
  console.log('✅ Indicator Button 已设置');

  // 3. 初始化 Indicator Modal
  indicatorModal.init();
  indicatorModal.onAdd((indicatorId) => {
    handleAddIndicator(indicatorId);
  });
  console.log('✅ Indicator Modal 已设置');

  // 4. 初始化 Indicator Bar List
  indicatorBarList.init('main-chart');

  // 监听可见性变化
  indicatorBarList.onVisibilityChange((id, visible) => {
    handleIndicatorVisibility(id, visible);
  });

  // 监听删除事件
  indicatorBarList.onRemove((id) => {
    handleRemoveIndicator(id);
  });

  // 监听设置按钮点击
  indicatorBarList.onSettings((id) => {
    handleIndicatorSettings(id);
  });
  console.log('✅ Indicator Bar List 已设置');

  // 5. 初始化 Indicator Settings Panel
  indicatorSettingsPanel.onSave((indicatorId, parameters) => {
    handleIndicatorParametersSave(indicatorId, parameters);
  });
  console.log('✅ Indicator Settings Panel 已设置');

  console.log('✅ 控制面板设置完成');
}

// ==================== 指标管理 ====================
/**
 * 添加指标
 */
function handleAddIndicator(indicatorId: string): void {
  // 检查是否已添加
  if (indicatorBarList.hasIndicator(indicatorId)) {
    console.log(`⚠️ 指标 ${indicatorId} 已存在`);
    return;
  }

  console.log(`➕ 添加指标: ${indicatorId}`);

  // 获取指标标签
  const labelMap: Record<string, string> = {
    'show-ma': 'MA20',
    'show-boll': 'BOLL',
    'show-macd': 'MACD',
    'show-kdj': 'KDJ',
    'show-rsi': 'RSI',
  };

  const label = labelMap[indicatorId] || indicatorId;

  // 添加到 bar list
  indicatorBarList.addIndicator(indicatorId, label, '--');

  // 渲染对应的图表
  switch (indicatorId) {
    case 'show-ma':
      // 默认显示 MA20
      state.series.sma20?.applyOptions({ visible: true });
      break;
    case 'show-boll':
      state.series.bollUpper?.applyOptions({ visible: true });
      state.series.bollMiddle?.applyOptions({ visible: true });
      state.series.bollLower?.applyOptions({ visible: true });
      break;
    case 'show-macd':
      if (!state.panes.macd && state.chart) {
        console.log('📊 创建 MACD pane...');
        state.panes.macd = state.chart.addPane();
        if (state.stockData) {
          renderMACDChart(state.stockData);
        }
      }
      break;
    case 'show-kdj':
      if (!state.panes.kdj && state.chart) {
        console.log('📊 创建 KDJ pane...');
        state.panes.kdj = state.chart.addPane();
        if (state.stockData) {
          renderKDJChart(state.stockData);
        }
      }
      break;
    case 'show-rsi':
      if (!state.panes.rsi && state.chart) {
        console.log('📊 创建 RSI pane...');
        state.panes.rsi = state.chart.addPane();
        if (state.stockData) {
          renderRSIChart(state.stockData);
        }
      }
      break;
  }

  // 添加完成后，立即更新最新值
  updateIndicatorBarValuesLatest();
}

/**
 * 切换指标可见性
 */
function handleIndicatorVisibility(indicatorId: string, visible: boolean): void {
  console.log(`👁 切换指标可见性: ${indicatorId} -> ${visible}`);

  switch (indicatorId) {
    case 'show-ma':
      // 切换 MA20 的可见性
      state.series.sma20?.applyOptions({ visible });
      break;
    case 'show-boll':
      state.series.bollUpper?.applyOptions({ visible });
      state.series.bollMiddle?.applyOptions({ visible });
      state.series.bollLower?.applyOptions({ visible });
      break;
    case 'show-macd':
      state.series.macd?.applyOptions({ visible });
      state.series.macdSignal?.applyOptions({ visible });
      state.series.macdHistogram?.applyOptions({ visible });
      break;
    case 'show-kdj':
      state.series.kdjK?.applyOptions({ visible });
      state.series.kdjD?.applyOptions({ visible });
      state.series.kdjJ?.applyOptions({ visible });
      break;
    case 'show-rsi':
      state.series.rsi?.applyOptions({ visible });
      break;
  }
}

/**
 * 移除指标
 */
function handleRemoveIndicator(indicatorId: string): void {
  console.log(`🗑️ 移除指标: ${indicatorId}`);

  switch (indicatorId) {
    case 'show-ma':
      // 隐藏 MA20
      state.series.sma20?.applyOptions({ visible: false });
      break;
    case 'show-boll':
      state.series.bollUpper?.applyOptions({ visible: false });
      state.series.bollMiddle?.applyOptions({ visible: false });
      state.series.bollLower?.applyOptions({ visible: false });
      break;
    case 'show-macd':
      if (state.panes.macd && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.macd);
        state.chart.removePane(paneIndex);
        state.panes.macd = null;
        state.series.macd = null;
        state.series.macdSignal = null;
        state.series.macdHistogram = null;
      }
      break;
    case 'show-kdj':
      if (state.panes.kdj && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.kdj);
        state.chart.removePane(paneIndex);
        state.panes.kdj = null;
        state.series.kdjK = null;
        state.series.kdjD = null;
        state.series.kdjJ = null;
      }
      break;
    case 'show-rsi':
      if (state.panes.rsi && state.chart) {
        const paneIndex = state.chart.panes().indexOf(state.panes.rsi);
        state.chart.removePane(paneIndex);
        state.panes.rsi = null;
        state.series.rsi = null;
      }
      break;
  }
}

/**
 * 只重新计算指标并更新图表（不重新加载原始数据）
 */
async function recalculateIndicators(): Promise<void> {
  console.log('🔄 重新计算指标...');

  try {
    // 1. 构建 indicators query string
    const indicatorsQuery = buildIndicatorsQueryString();
    if (!indicatorsQuery) {
      console.warn('没有需要计算的指标');
      return;
    }

    // 2. 调用轻量级 API（只返回指标数据）
    utils.showLoading('正在重新计算指标...');
    const url = `/api/v1/stock/${config.symbol}/recalculate-indicators?interval=${state.currentInterval}&indicators=${encodeURIComponent(indicatorsQuery)}`;
    console.log(`📡 请求重新计算指标: ${url}`);

    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to recalculate indicators');

    const data = await response.json();
    console.log('✅ 指标计算完成:', data);

    // 3. 只更新指标系列的数据（不更新 candlestick 和 volume）

    // 更新 MA 系列 - 从配置管理器获取颜色
    const { periods: maPeriods, colors: maColors } = indicatorConfigManager.getMaRenderInfo();

    // 后端返回的数据映射
    const maDataMap: Record<number, any> = {
      5: data.sma5,
      10: data.sma10,
      20: data.sma20,
      60: data.sma60,
    };

    // 更新每条配置的 MA 线
    const seriesSlots = [state.series.sma5, state.series.sma10, state.series.sma20];
    for (let i = 0; i < maPeriods.length; i++) {
      const period = maPeriods[i];
      const color = maColors[i];
      const maData = maDataMap[period];
      const series = seriesSlots[i];

      if (maData && series) {
        series.setData(maData);
        series.applyOptions({
          color: color,
          title: `MA${period}`,
        });
      }
    }

    // 更新布林带系列
    if (data.boll && state.series.bollUpper) {
      state.series.bollUpper.setData(data.boll.upper);
      state.series.bollMiddle.setData(data.boll.middle);
      state.series.bollLower.setData(data.boll.lower);
    }

    // 更新 MACD 系列（如果已创建）
    if (state.panes.macd && data.macd && state.series.macd) {
      state.series.macd.setData(data.macd.macd);
      if (state.series.macdSignal) state.series.macdSignal.setData(data.macd.signal);
      if (state.series.macdHistogram) {
        const histData = data.macd.histogram.map((item: any) => ({
          time: item.time,
          value: item.value,
          color: item.value >= 0 ? colors.up : colors.down,
        }));
        state.series.macdHistogram.setData(histData);
      }
    }

    // 更新 KDJ 系列（如果已创建）
    if (state.panes.kdj && data.kdj && state.series.kdjK) {
      state.series.kdjK.setData(data.kdj.k);
      if (state.series.kdjD) state.series.kdjD.setData(data.kdj.d);
      if (state.series.kdjJ) state.series.kdjJ.setData(data.kdj.j);
    }

    // 更新 RSI 系列（如果已创建）
    if (state.panes.rsi && data.rsi && state.series.rsi) {
      state.series.rsi.setData(data.rsi);
    }

    // 更新指标 bar 显示的最新值
    updateIndicatorBarValuesLatest();

    utils.hideLoading();
    console.log('✅ 指标更新完成');
  } catch (error) {
    console.error('❌ 重新计算指标失败:', error);
    utils.hideLoading();
    alert(`重新计算指标失败: ${(error as Error).message}`);
  }
}

/**
 * 重新加载数据并更新所有图表（用于时间间隔切换）
 */
async function reloadDataAndUpdateCharts(): Promise<void> {
  console.log('🔄 重新加载数据并更新图表...');

  try {
    // 1. 构建 indicators query string
    const indicatorsQuery = buildIndicatorsQueryString();

    // 2. 重新获取数据
    const data = await fetchStockData(state.currentInterval, indicatorsQuery);

    // 3. 更新所有系列的数据
    if (state.series.candle) state.series.candle.setData(data.candlestick);
    if (state.series.volume) state.series.volume.setData(data.volume);

    // 更新 MA 系列
    if (data.sma5 && state.series.sma5) state.series.sma5.setData(data.sma5);
    if (data.sma10 && state.series.sma10) state.series.sma10.setData(data.sma10);
    if (data.sma20 && state.series.sma20) state.series.sma20.setData(data.sma20);
    if (data.sma60 && state.series.sma60) state.series.sma60.setData(data.sma60);

    // 更新布林带系列
    if (data.boll && state.series.bollUpper) {
      state.series.bollUpper.setData(data.boll.upper);
      state.series.bollMiddle.setData(data.boll.middle);
      state.series.bollLower.setData(data.boll.lower);
    }

    // 更新 MACD 系列（如果已创建）
    if (state.panes.macd && data.macd && state.series.macd) {
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

    // 更新 KDJ 系列（如果已创建）
    if (state.panes.kdj && data.kdj && state.series.kdjK) {
      state.series.kdjK.setData(data.kdj.k);
      if (state.series.kdjD) state.series.kdjD.setData(data.kdj.d);
      if (state.series.kdjJ) state.series.kdjJ.setData(data.kdj.j);
    }

    // 更新 RSI 系列（如果已创建）
    if (state.panes.rsi && data.rsi && state.series.rsi) {
      state.series.rsi.setData(data.rsi);
    }

    // 更新筹码分布
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

    // 更新指标 bar 显示的最新值
    updateIndicatorBarValuesLatest();

    // 调整可见范围
    if (state.chart) {
      state.chart.timeScale().fitContent();
    }

    console.log('✅ 数据重新加载完成，图表已更新');
  } catch (error) {
    console.error('❌ 重新加载数据失败:', error);
    alert(`重新加载数据失败: ${(error as Error).message}`);
  }
}

/**
 * 打开指标设置面板
 */
async function handleIndicatorSettings(indicatorId: string): Promise<void> {
  console.log(`⚙️ 打开指标设置: ${indicatorId}`);

  // 映射前端 ID 到后端 ID
  const indicatorMap: Record<string, string> = {
    'show-ma': 'ma',
    'show-boll': 'boll',
    'show-macd': 'macd',
    'show-kdj': 'kdj',
    'show-rsi': 'rsi',
  };

  const backendId = indicatorMap[indicatorId];
  if (!backendId) {
    console.warn(`未知的指标 ID: ${indicatorId}`);
    return;
  }

  // 从配置管理器加载当前参数
  const currentParams = indicatorConfigManager.getIndicatorParams(backendId);

  // 打开设置面板
  await indicatorSettingsPanel.open(backendId, currentParams);
}

/**
 * 保存指标参数并重新计算指标
 * 直接保存到配置文件（通过后端 API）
 */
async function handleIndicatorParametersSave(
  indicatorId: string,
  parameters: Record<string, any>
): Promise<void> {
  console.log(`💾 保存指标参数: ${indicatorId}`, parameters);

  try {
    // 1. 保存参数到配置文件（内存 + 持久化）
    await indicatorConfigManager.updateIndicatorParams(indicatorId, parameters);

    // 2. 只重新计算指标（不重新加载原始数据）
    await recalculateIndicators();

    console.log('✅ 指标参数保存成功，图表已更新');
  } catch (error) {
    console.error('❌ 保存指标参数失败:', error);
    alert(`保存指标参数失败: ${(error as Error).message}`);
  }
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
      // 鼠标离开时显示最新指标值
      updateIndicatorBarValuesLatest();
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

    // 更新指标 bar 的数值
    updateIndicatorBarValues(param);
  });

  console.log('✅ 筹码峰联动已设置');
}

/**
 * 更新指标 bar 显示的数值（鼠标悬停时）
 */
function updateIndicatorBarValues(param: MouseEventParams): void {
  if (!param.time || !param.seriesData) return;

  // 获取所有已添加的指标
  const indicatorIds = indicatorBarList.getAllIndicatorIds();

  indicatorIds.forEach((indicatorId) => {
    let value = '--';

    switch (indicatorId) {
      case 'show-ma':
        // MA20 的值
        if (state.series.sma20) {
          const data = param.seriesData.get(state.series.sma20);
          if (data && (data as any).value !== undefined) {
            value = (data as any).value.toFixed(2);
          }
        }
        break;

      case 'show-boll':
        // 布林带中轨的值
        if (state.series.bollMiddle) {
          const data = param.seriesData.get(state.series.bollMiddle);
          if (data && (data as any).value !== undefined) {
            value = (data as any).value.toFixed(2);
          }
        }
        break;

      case 'show-macd':
        // MACD DIF 线的值
        if (state.series.macd) {
          const data = param.seriesData.get(state.series.macd);
          if (data && (data as any).value !== undefined) {
            value = (data as any).value.toFixed(4);
          }
        }
        break;

      case 'show-kdj':
        // KDJ K 线的值
        if (state.series.kdjK) {
          const data = param.seriesData.get(state.series.kdjK);
          if (data && (data as any).value !== undefined) {
            value = (data as any).value.toFixed(2);
          }
        }
        break;

      case 'show-rsi':
        // RSI 的值
        if (state.series.rsi) {
          const data = param.seriesData.get(state.series.rsi);
          if (data && (data as any).value !== undefined) {
            value = (data as any).value.toFixed(2);
          }
        }
        break;
    }

    // 更新显示
    indicatorBarList.updateValue(indicatorId, value);
  });
}

/**
 * 更新指标 bar 显示最新值（鼠标离开时）
 */
function updateIndicatorBarValuesLatest(): void {
  if (!state.stockData) return;

  const indicatorIds = indicatorBarList.getAllIndicatorIds();

  indicatorIds.forEach((indicatorId) => {
    let value = '--';

    switch (indicatorId) {
      case 'show-ma':
        // MA20 最新值
        if (state.stockData.sma20 && state.stockData.sma20.length > 0) {
          const latest = state.stockData.sma20[state.stockData.sma20.length - 1];
          if (latest && latest.value !== 0) {
            value = latest.value.toFixed(2);
          }
        }
        break;

      case 'show-boll':
        // 布林带中轨最新值
        if (state.stockData.boll && state.stockData.boll.middle.length > 0) {
          const latest = state.stockData.boll.middle[state.stockData.boll.middle.length - 1];
          if (latest && latest.value !== 0) {
            value = latest.value.toFixed(2);
          }
        }
        break;

      case 'show-macd':
        // MACD DIF 最新值
        if (state.stockData.macd && state.stockData.macd.macd.length > 0) {
          const latest = state.stockData.macd.macd[state.stockData.macd.macd.length - 1];
          if (latest && latest.value !== 0) {
            value = latest.value.toFixed(4);
          }
        }
        break;

      case 'show-kdj':
        // KDJ K 最新值
        if (state.stockData.kdj && state.stockData.kdj.k.length > 0) {
          const latest = state.stockData.kdj.k[state.stockData.kdj.k.length - 1];
          if (latest && latest.value !== 0) {
            value = latest.value.toFixed(2);
          }
        }
        break;

      case 'show-rsi':
        // RSI 最新值
        if (state.stockData.rsi && state.stockData.rsi.length > 0) {
          const latest = state.stockData.rsi[state.stockData.rsi.length - 1];
          if (latest && latest.value !== 0) {
            value = latest.value.toFixed(2);
          }
        }
        break;
    }

    indicatorBarList.updateValue(indicatorId, value);
  });
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
    // 1. 加载配置文件（最优先！）
    await indicatorConfigManager.loadConfig();
    console.log('✅ 配置文件加载完成');

    // 2. 根据配置初始化 indicator bars（启用的指标）
    const enabledIndicators = indicatorConfigManager.getEnabledIndicators();
    console.log(`📊 启用的指标: ${enabledIndicators.join(', ')}`);

    // 3. 加载数据（使用配置参数）
    const indicatorsQuery = buildIndicatorsQueryString();
    const data = await fetchStockData('daily', indicatorsQuery);
    state.stockData = data;

    // 4. 初始化图表
    initializeCharts();

    // 5. 渲染数据
    renderMainChart(data);
    renderVolumeChart(data);

    // 6. 初始化 OHLCV Bar 组件
    if (state.chart) {
      ohlcvBar.init(state.chart, state.series, 'main-chart');
      console.log('✅ OHLCV Bar 组件已加载');
    }

    // 7. 初始化筹码峰管理器
    chipManager.init();
    await initializeChipDistribution();
    setupChipDistributionSync();
    setupChipSettings();
    console.log('✅ 筹码峰模块已加载');

    // 8. 设置控制面板
    setupControls();

    // 9. 响应式
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
