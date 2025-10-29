/**
 * 股票分析系统 - 主应用
 * 使用 Lightweight Charts v5.x 最新 API
 * 优雅、现代、模块化实现
 */

// ==================== 全局状态 ====================
const state = {
    stockData: null,
    chipData: null,  // 筹码数据
    chart: null,  // 单个 chart 实例
    panes: {
        main: null,      // 主图 pane (K线 + 均线)
        volume: null,    // 成交量 pane
        macd: null,      // MACD pane
        kdj: null,       // KDJ pane
        rsi: null,       // RSI pane
    },
    series: {
        candle: null,
        volume: null,
        sma5: null,
        sma10: null,
        sma20: null,
        sma60: null,
        bollUpper: null,
        bollMiddle: null,
        bollLower: null,
        macdLine: null,
        macdSignal: null,
        macdHist: null,
        kLine: null,
        dLine: null,
        jLine: null,
        rsiLine: null,
        rsiOverbought: null,
        rsiOversold: null,
    },
};

// ==================== 配置 ====================
const config = {
    symbol: '000155.sz',
    apiUrl: '/api/v1/stock',
    colors: {
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
    },
};

// ==================== 工具函数 ====================
const utils = {
    showLoading: () => {
        document.getElementById('loading').style.display = 'flex';
    },

    hideLoading: () => {
        document.getElementById('loading').style.display = 'none';
    },

    handleError: (error) => {
        console.error('Error:', error);
        alert(`加载失败: ${error.message}`);
        utils.hideLoading();
    },

    // 格式化数字
    formatNumber: (num, decimals = 2) => {
        if (num === null || num === undefined) return '--';
        return num.toFixed(decimals);
    },

    // 格式化日期
    formatDate: (timestamp) => {
        if (!timestamp) return '--';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },
};

// ==================== API 调用 ====================
async function fetchStockData() {
    utils.showLoading();
    try {
        const response = await fetch(`${config.apiUrl}/${config.symbol}`);
        if (!response.ok) throw new Error('Failed to fetch data');

        state.stockData = await response.json();
        console.log('✅ 数据加载成功:', state.stockData);
        return state.stockData;
    } catch (error) {
        utils.handleError(error);
        throw error;
    } finally {
        utils.hideLoading();
    }
}

// ==================== 图表初始化 (多 Pane API) ====================
function initializeCharts() {
    console.log('📊 初始化图表 (使用多 Pane API)...');

    const { createChart } = LightweightCharts;
    const container = document.getElementById('main-chart');

    // 计算图表高度：视口高度 - 头部 - 控制面板 - 一些边距
    const chartHeight = window.innerHeight - 200; // 200px 留给头部和控制面板

    // 创建单个 chart 实例，高度占满剩余空间
    state.chart = createChart(container, {
        width: container.clientWidth,
        height: chartHeight,
        layout: {
            background: { color: '#ffffff' },
            textColor: '#333',
        },
        grid: {
            vertLines: { color: '#f0f0f0' },
            horzLines: { color: '#f0f0f0' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        timeScale: {
            borderColor: '#ccc',
            timeVisible: true,
            rightOffset: 5,  // 右侧留白
            barSpacing: 6,   // K线间距
            lockVisibleTimeRangeOnResize: true,
        },
        rightPriceScale: {
            borderColor: '#ccc',
        },
        leftPriceScale: {
            visible: false,
        },
    });

    // 获取默认的主 pane (pane 0)
    state.panes.main = state.chart.panes()[0];

    // 添加成交量 pane
    state.panes.volume = state.chart.addPane();

    // MACD/KDJ/RSI panes 延迟创建（用户勾选时创建）
    state.panes.macd = null;
    state.panes.kdj = null;
    state.panes.rsi = null;

    console.log('✅ 图表初始化完成 (主图 + 成交量，共用一个 chart 实例)');
    console.log('   MACD/KDJ/RSI panes 将在用户勾选时创建');
}

// ==================== 多 Pane API 不需要手动同步时间轴 ====================
// 使用多 Pane API 后，所有 panes 自动共享同一个 timeScale
// Crosshair 也会自动在所有 panes 中对齐
// 因此不再需要 syncTimeScales() 和 syncChartSizes() 函数

// ==================== Tooltip 显示 ====================
// 多 Pane API 自动同步 Crosshair，只需要订阅一次即可
function setupCrosshairSync() {
    console.log('🎯 设置 Tooltip 显示...');

    const tooltip = document.getElementById('tooltip');

    // 订阅 chart 的 crosshair 移动事件（自动在所有 panes 中同步）
    state.chart.subscribeCrosshairMove((param) => {
        // 鼠标离开或没有数据
        if (!param || !param.time || !param.point) {
            tooltip.style.display = 'none';
            return;
        }

        // 显示 tooltip
        showTooltip(param);
    });

    console.log('✅ Tooltip 设置完成（Crosshair 自动同步）');
}

function showTooltip(param) {
    const tooltip = document.getElementById('tooltip');

    // 获取所有系列在当前时间点的数据
    const candleData = param.seriesData.get(state.series.candle);
    const volumeData = param.seriesData.get(state.series.volume);

    if (!candleData) {
        tooltip.style.display = 'none';
        return;
    }

    // 构建横向排列的 tooltip 内容
    const priceChange = candleData.close - candleData.open;
    const priceChangeClass = priceChange >= 0 ? 'up' : 'down';

    let items = [];

    // K线数据
    items.push(`<span class="tooltip-item">O: ${utils.formatNumber(candleData.open)}</span>`);
    items.push(`<span class="tooltip-item">H: ${utils.formatNumber(candleData.high)}</span>`);
    items.push(`<span class="tooltip-item">L: ${utils.formatNumber(candleData.low)}</span>`);
    items.push(`<span class="tooltip-item">C: <span class="${priceChangeClass}">${utils.formatNumber(candleData.close)}</span></span>`);

    // 成交量
    if (volumeData) {
        items.push(`<span class="tooltip-item">Vol: ${utils.formatNumber(volumeData.value, 0)}</span>`);
    }

    // 均线数据
    const sma5Data = param.seriesData.get(state.series.sma5);
    const sma10Data = param.seriesData.get(state.series.sma10);
    const sma20Data = param.seriesData.get(state.series.sma20);

    if (sma5Data) items.push(`<span class="tooltip-item">MA5: ${utils.formatNumber(sma5Data.value)}</span>`);
    if (sma10Data) items.push(`<span class="tooltip-item">MA10: ${utils.formatNumber(sma10Data.value)}</span>`);
    if (sma20Data) items.push(`<span class="tooltip-item">MA20: ${utils.formatNumber(sma20Data.value)}</span>`);

    // MACD 数据
    const macdLineData = param.seriesData.get(state.series.macdLine);
    const macdSignalData = param.seriesData.get(state.series.macdSignal);
    const macdHistData = param.seriesData.get(state.series.macdHist);

    if (macdLineData) items.push(`<span class="tooltip-item">DIF: ${utils.formatNumber(macdLineData.value, 4)}</span>`);
    if (macdSignalData) items.push(`<span class="tooltip-item">DEA: ${utils.formatNumber(macdSignalData.value, 4)}</span>`);
    if (macdHistData) {
        const histClass = macdHistData.value >= 0 ? 'up' : 'down';
        items.push(`<span class="tooltip-item">MACD: <span class="${histClass}">${utils.formatNumber(macdHistData.value, 4)}</span></span>`);
    }

    // KDJ 数据
    const kLineData = param.seriesData.get(state.series.kLine);
    const dLineData = param.seriesData.get(state.series.dLine);
    const jLineData = param.seriesData.get(state.series.jLine);

    if (kLineData) items.push(`<span class="tooltip-item">K: ${utils.formatNumber(kLineData.value)}</span>`);
    if (dLineData) items.push(`<span class="tooltip-item">D: ${utils.formatNumber(dLineData.value)}</span>`);
    if (jLineData) items.push(`<span class="tooltip-item">J: ${utils.formatNumber(jLineData.value)}</span>`);

    // RSI 数据
    const rsiLineData = param.seriesData.get(state.series.rsiLine);
    if (rsiLineData) items.push(`<span class="tooltip-item">RSI: ${utils.formatNumber(rsiLineData.value)}</span>`);

    tooltip.innerHTML = items.join(' ');

    // 固定在左上角
    tooltip.style.left = '10px';
    tooltip.style.top = '10px';
    tooltip.style.display = 'block';
}

// ==================== 数据渲染 (多 Pane API) ====================
function renderMainChart(data) {
    console.log('📈 渲染主图表 (Pane 0)...');

    // 在主 pane 上添加 K线系列
    state.series.candle = state.chart.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: config.colors.up,
        downColor: config.colors.down,
        borderVisible: false,
        wickUpColor: config.colors.up,
        wickDownColor: config.colors.down,
    });
    state.series.candle.setData(data.candlestick);

    // 添加均线到主 pane
    state.series.sma5 = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.sma5,
        lineWidth: 2,
        title: 'MA5',
    });
    state.series.sma5.setData(data.sma5);

    state.series.sma10 = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.sma10,
        lineWidth: 2,
        title: 'MA10',
    });
    state.series.sma10.setData(data.sma10);

    state.series.sma20 = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.sma20,
        lineWidth: 2,
        title: 'MA20',
    });
    state.series.sma20.setData(data.sma20);

    state.series.sma60 = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.sma60,
        lineWidth: 2,
        title: 'MA60',
        visible: false, // 默认隐藏
    });
    state.series.sma60.setData(data.sma60);

    // 布林带 (默认隐藏)
    state.series.bollUpper = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.bollUpper,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        title: 'BOLL Upper',
        visible: false,
    });
    state.series.bollUpper.setData(data.boll.upper);

    state.series.bollMiddle = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.bollMiddle,
        lineWidth: 1,
        title: 'BOLL Middle',
        visible: false,
    });
    state.series.bollMiddle.setData(data.boll.middle);

    state.series.bollLower = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.bollLower,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        title: 'BOLL Lower',
        visible: false,
    });
    state.series.bollLower.setData(data.boll.lower);

    console.log('✅ 主图表渲染完成');
}

function renderVolumeChart(data) {
    console.log('📊 渲染成交量图表 (Pane 1)...');

    // 在 chart 上添加系列，然后移动到 volume pane
    state.series.volume = state.chart.addSeries(LightweightCharts.HistogramSeries, {
        priceFormat: {
            type: 'volume',
            precision: 0,
            minMove: 1,
        },
    });
    state.series.volume.setData(data.volume);

    // 移动到 volume pane (pane index 1)
    state.series.volume.moveToPane(1);

    console.log('✅ 成交量图表渲染完成');
}

function renderMACDChart(data) {
    // MACD pane 延迟创建，先保存数据
    if (!state.panes.macd) {
        console.log('⏳ MACD pane 未创建，数据已保存');
        return;
    }

    console.log('📉 渲染 MACD 图表...');

    // 获取 MACD pane 的 index
    const paneIndex = state.chart.panes().indexOf(state.panes.macd);

    // 添加系列并移动到 MACD pane
    state.series.macdLine = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.macd,
        lineWidth: 2,
        title: 'DIF',
    });
    state.series.macdLine.setData(data.macd.macd);
    state.series.macdLine.moveToPane(paneIndex);

    state.series.macdSignal = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.signal,
        lineWidth: 2,
        title: 'DEA',
    });
    state.series.macdSignal.setData(data.macd.signal);
    state.series.macdSignal.moveToPane(paneIndex);

    state.series.macdHist = state.chart.addSeries(LightweightCharts.HistogramSeries, {
        color: config.colors.macd,
        title: 'MACD',
    });

    // 转换 histogram 数据格式并添加颜色
    const histData = data.macd.histogram.map(item => ({
        time: item.time,
        value: item.value,
        color: item.value >= 0 ? config.colors.up : config.colors.down,
    }));
    state.series.macdHist.setData(histData);
    state.series.macdHist.moveToPane(paneIndex);

    console.log('✅ MACD 图表渲染完成');
}

function renderKDJChart(data) {
    // KDJ pane 延迟创建，先保存数据
    if (!state.panes.kdj) {
        console.log('⏳ KDJ pane 未创建，数据已保存');
        return;
    }

    console.log('📊 渲染 KDJ 图表...');

    // 获取 KDJ pane 的 index
    const paneIndex = state.chart.panes().indexOf(state.panes.kdj);

    // 添加系列并移动到 KDJ pane
    state.series.kLine = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.kdj.k,
        lineWidth: 2,
        title: 'K',
    });
    state.series.kLine.setData(data.kdj.k);
    state.series.kLine.moveToPane(paneIndex);

    state.series.dLine = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.kdj.d,
        lineWidth: 2,
        title: 'D',
    });
    state.series.dLine.setData(data.kdj.d);
    state.series.dLine.moveToPane(paneIndex);

    state.series.jLine = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.kdj.j,
        lineWidth: 2,
        title: 'J',
    });
    state.series.jLine.setData(data.kdj.j);
    state.series.jLine.moveToPane(paneIndex);

    console.log('✅ KDJ 图表渲染完成');
}

function renderRSIChart(data) {
    // RSI pane 延迟创建，先保存数据
    if (!state.panes.rsi) {
        console.log('⏳ RSI pane 未创建，数据已保存');
        return;
    }

    console.log('📈 渲染 RSI 图表...');

    // 获取 RSI pane 的 index
    const paneIndex = state.chart.panes().indexOf(state.panes.rsi);

    // 添加系列并移动到 RSI pane
    state.series.rsiLine = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.rsi,
        lineWidth: 2,
        title: 'RSI',
    });
    state.series.rsiLine.setData(data.rsi);
    state.series.rsiLine.moveToPane(paneIndex);

    // 添加超买超卖线 (水平参考线)
    state.series.rsiOverbought = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.up,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        title: 'Overbought (70)',
    });
    state.series.rsiOverbought.setData(data.rsi.map(item => ({ time: item.time, value: 70 })));
    state.series.rsiOverbought.moveToPane(paneIndex);

    state.series.rsiOversold = state.chart.addSeries(LightweightCharts.LineSeries, {
        color: config.colors.down,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        title: 'Oversold (30)',
    });
    state.series.rsiOversold.setData(data.rsi.map(item => ({ time: item.time, value: 30 })));
    state.series.rsiOversold.moveToPane(paneIndex);

    console.log('✅ RSI 图表渲染完成');
}

// ==================== 控制面板事件 ====================
function setupControls() {
    console.log('⚙️ 设置控制面板...');

    // 均线显示控制
    document.getElementById('show-sma5').addEventListener('change', (e) => {
        state.series.sma5.applyOptions({ visible: e.target.checked });
    });

    document.getElementById('show-sma10').addEventListener('change', (e) => {
        state.series.sma10.applyOptions({ visible: e.target.checked });
    });

    document.getElementById('show-sma20').addEventListener('change', (e) => {
        state.series.sma20.applyOptions({ visible: e.target.checked });
    });

    document.getElementById('show-sma60').addEventListener('change', (e) => {
        state.series.sma60.applyOptions({ visible: e.target.checked });
    });

    // 布林带显示控制
    document.getElementById('show-boll').addEventListener('change', (e) => {
        const visible = e.target.checked;
        state.series.bollUpper.applyOptions({ visible });
        state.series.bollMiddle.applyOptions({ visible });
        state.series.bollLower.applyOptions({ visible });
    });

    // MACD 显示控制
    document.getElementById('show-macd').addEventListener('change', (e) => {
        if (e.target.checked) {
            // 首次显示时创建 pane
            if (!state.panes.macd) {
                console.log('📊 创建 MACD pane...');
                state.panes.macd = state.chart.addPane();

                // 渲染已保存的数据
                if (state.stockData && state.stockData.macd) {
                    renderMACDChart(state.stockData);
                }
            }
        } else {
            // 取消勾选时移除 pane
            if (state.panes.macd) {
                const paneIndex = state.chart.panes().indexOf(state.panes.macd);
                state.chart.removePane(paneIndex);
                state.panes.macd = null;
            }
        }
    });

    // KDJ 显示控制
    document.getElementById('show-kdj').addEventListener('change', (e) => {
        if (e.target.checked) {
            // 首次显示时创建 pane
            if (!state.panes.kdj) {
                console.log('📊 创建 KDJ pane...');
                state.panes.kdj = state.chart.addPane();

                // 渲染已保存的数据
                if (state.stockData && state.stockData.kdj) {
                    renderKDJChart(state.stockData);
                }
            }
        } else {
            // 取消勾选时移除 pane
            if (state.panes.kdj) {
                const paneIndex = state.chart.panes().indexOf(state.panes.kdj);
                state.chart.removePane(paneIndex);
                state.panes.kdj = null;
            }
        }
    });

    // RSI 显示控制
    document.getElementById('show-rsi').addEventListener('change', (e) => {
        if (e.target.checked) {
            // 首次显示时创建 pane
            if (!state.panes.rsi) {
                console.log('📊 创建 RSI pane...');
                state.panes.rsi = state.chart.addPane();

                // 渲染已保存的数据
                if (state.stockData && state.stockData.rsi) {
                    renderRSIChart(state.stockData);
                }
            }
        } else {
            // 取消勾选时移除 pane
            if (state.panes.rsi) {
                const paneIndex = state.chart.panes().indexOf(state.panes.rsi);
                state.chart.removePane(paneIndex);
                state.panes.rsi = null;
            }
        }
    });

    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        console.log('🔄 刷新数据...');
        await init();
    });

    console.log('✅ 控制面板设置完成');
}

// ==================== 响应式处理 ====================
function setupResponsive() {
    console.log('📱 设置响应式布局...');

    window.addEventListener('resize', () => {
        if (state.chart) {
            const container = document.getElementById('main-chart');
            const chartHeight = window.innerHeight - 200; // 保持与初始化时相同的计算
            state.chart.applyOptions({
                width: container.clientWidth,
                height: chartHeight
            });
        }
    });

    console.log('✅ 响应式布局设置完成');
}

// ==================== 主初始化 ====================
async function init() {
    console.log('🚀 应用初始化开始...');

    try {
        // 1. 加载数据
        const data = await fetchStockData();

        // 保存数据到全局状态，供延迟创建的图表使用
        state.stockData = data;

        // 2. 初始化图表 (使用多 Pane API)
        initializeCharts();

        // 3. 渲染数据 (MACD/KDJ/RSI panes 会在用户勾选时创建并渲染)
        renderMainChart(data);
        renderVolumeChart(data);
        renderMACDChart(data);  // 如果 pane 未创建，会跳过
        renderKDJChart(data);   // 如果 pane 未创建，会跳过
        renderRSIChart(data);   // 如果 pane 未创建，会跳过

        // 4. 初始化筹码峰管理器
        if (typeof chipManager !== 'undefined') {
            chipManager.init();
            setupChipDistributionSync();
            console.log('✅ 筹码峰模块已加载');
        } else {
            console.warn('⚠️  筹码峰模块未加载');
        }

        // 5. 设置 Tooltip 显示（多 Pane API 自动同步 Crosshair）
        setupCrosshairSync();

        // 6. 设置控制面板
        setupControls();

        // 7. 响应式
        setupResponsive();

        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 初始化失败:', error);
    }
}

// ==================== 筹码峰同步 ====================
/**
 * 设置筹码峰与 K 线图的联动
 */
function setupChipDistributionSync() {
    if (!state.chart || typeof chipManager === 'undefined') return;

    // 1. 初始加载：显示全局筹码分布
    const globalChipData = calculateGlobalChipDistribution();
    if (globalChipData) {
        chipManager.updateGlobal(globalChipData);
    }

    // 2. 监听十字线移动事件（仅更新价格标记线）
    state.chart.subscribeCrosshairMove((param) => {
        // 没有时间数据时清除价格标记
        if (!param.time) {
            chipManager.clearPriceLine();
            return;
        }

        // 获取当前 K 线数据
        const candleData = param.seriesData.get(state.series.candle);
        if (!candleData) {
            chipManager.clearPriceLine();
            return;
        }

        // 获取当前价格（收盘价）
        const currentPrice = candleData.close;

        // 更新价格标记线和获利盘/套牢盘统计
        chipManager.updatePriceLine(currentPrice, param.time);
    });

    console.log('✅ 筹码峰联动已设置');
}

/**
 * 计算全局筹码分布（所有K线数据的累积）
 * TODO: 等后端实现后，从 API 获取真实数据
 */
function calculateGlobalChipDistribution() {
    // 临时模拟数据，用于测试前端 UI
    // 后端实现后，改为: return state.chipData;

    if (!state.stockData || !state.stockData.candlestick || state.stockData.candlestick.length === 0) {
        console.error('calculateGlobalChipDistribution: 没有 K 线数据');
        return null;
    }

    if (!state.stockData.volume || state.stockData.volume.length === 0) {
        console.error('calculateGlobalChipDistribution: 没有成交量数据');
        return null;
    }

    // 合并 K 线和成交量数据
    const candles = state.stockData.candlestick;
    const volumes = state.stockData.volume;

    // 创建时间到成交量的映射
    const volumeMap = new Map();
    volumes.forEach(v => {
        volumeMap.set(v.time, v.value);
    });

    // 计算价格范围
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) {
        console.error('calculateGlobalChipDistribution: 价格范围为 0');
        return null;
    }

    // 创建价格档位
    const numBins = 50; // 50 个价格档位
    const binSize = priceRange / numBins;
    const distribution = [];

    // 遍历每个档位
    for (let i = 0; i < numBins; i++) {
        const price = minPrice + binSize * (i + 0.5);
        let volume = 0;

        // 累加所有在此价格区间内的成交量
        candles.forEach(candle => {
            // 如果 K 线的价格范围包含这个档位
            if (candle.low <= price && price <= candle.high) {
                // 获取该 K 线对应的成交量
                const candleVolume = volumeMap.get(candle.time) || 0;

                if (candleVolume > 0) {
                    // 根据价格在 K 线中的位置，按比例分配成交量
                    const priceSpan = candle.high - candle.low;
                    if (priceSpan > 0) {
                        const relativePosition = (price - candle.low) / priceSpan;
                        // 使用正态分布模拟成交量在价格区间的分布
                        const weight = Math.exp(-Math.pow((relativePosition - 0.5) * 4, 2));
                        volume += candleVolume * weight;
                    } else {
                        // 如果高低价相同，全部分配到这个价格
                        if (Math.abs(price - candle.close) < binSize / 2) {
                            volume += candleVolume;
                        }
                    }
                }
            }
        });

        if (volume > 0) {
            distribution.push({ price, volume });
        }
    }

    console.log(`calculateGlobalChipDistribution: 生成了 ${distribution.length} 个价格档位`);

    if (distribution.length === 0) {
        console.error('calculateGlobalChipDistribution: distribution 为空');
        return null;
    }

    // 识别峰值（成交量最大的几个点）
    const sorted = [...distribution].sort((a, b) => b.volume - a.volume);
    const peaks = [];

    if (sorted.length > 0) {
        peaks.push({ price: sorted[0].price, intensity: 'high' });
    }
    if (sorted.length > 1) {
        peaks.push({ price: sorted[1].price, intensity: 'medium' });
    }

    return {
        distribution: distribution,
        peaks: peaks
    };
}

// ==================== 应用启动 ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM 加载完成,启动应用...');
    init();
});
