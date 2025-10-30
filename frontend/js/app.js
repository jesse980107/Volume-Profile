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
    currentInterval: 'daily',  // 当前时间间隔：daily, weekly, monthly
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
async function fetchStockData(interval = 'daily') {
    utils.showLoading();
    try {
        const response = await fetch(`${config.apiUrl}/${config.symbol}?interval=${interval}`);
        if (!response.ok) throw new Error('Failed to fetch data');

        state.stockData = await response.json();
        state.currentInterval = interval;
        console.log(`✅ 数据加载成功 (${interval}):`, state.stockData);
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

    // 创建单个 chart 实例，占满容器高度（深色主题）
    state.chart = createChart(container, {
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
            rightOffset: 5,  // 右侧留白
            barSpacing: 6,   // K线间距
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

// ==================== OHLCV Bar 显示（使用组件）====================
// 使用 ohlcvBar 组件替代原来的 tooltip 逻辑

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

// ==================== 时间间隔切换 ====================
async function switchTimeframe(interval) {
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
        if (state.panes.macd && state.series.macdLine) {
            state.series.macdLine.setData(data.macd.macd);
            state.series.macdSignal.setData(data.macd.signal);
            const histData = data.macd.histogram.map(item => ({
                time: item.time,
                value: item.value,
                color: item.value >= 0 ? config.colors.up : config.colors.down,
            }));
            state.series.macdHist.setData(histData);
        }

        // 4. 更新 KDJ 数据（如果已创建）
        if (state.panes.kdj && state.series.kLine) {
            state.series.kLine.setData(data.kdj.k);
            state.series.dLine.setData(data.kdj.d);
            state.series.jLine.setData(data.kdj.j);
        }

        // 5. 更新 RSI 数据（如果已创建）
        if (state.panes.rsi && state.series.rsiLine) {
            state.series.rsiLine.setData(data.rsi);
            state.series.rsiOverbought.setData(data.rsi.map(item => ({ time: item.time, value: 70 })));
            state.series.rsiOversold.setData(data.rsi.map(item => ({ time: item.time, value: 30 })));
        }

        // 6. 更新筹码分布（如果已加载）
        if (typeof chipCalculator !== 'undefined' && typeof chipManager !== 'undefined') {
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
        }

        // 7. 调整可见范围
        state.chart.timeScale().fitContent();

        // 8. 更新按钮状态
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-interval="${interval}"]`)?.classList.add('active');

        console.log(`✅ 时间间隔切换完成: ${interval}`);
    } catch (error) {
        console.error('❌ 时间间隔切换失败:', error);
        alert(`切换时间间隔失败: ${error.message}`);
    }
}

// ==================== 控制面板事件 ====================
function setupControls() {
    console.log('⚙️ 设置控制面板...');

    // 初始化 indicator 选择器组件
    if (typeof indicatorSelector !== 'undefined') {
        indicatorSelector.init('main-chart');

        // 均线显示控制
        indicatorSelector.on('show-sma5', (checked) => {
            state.series.sma5.applyOptions({ visible: checked });
        });

        indicatorSelector.on('show-sma10', (checked) => {
            state.series.sma10.applyOptions({ visible: checked });
        });

        indicatorSelector.on('show-sma20', (checked) => {
            state.series.sma20.applyOptions({ visible: checked });
        });

        indicatorSelector.on('show-sma60', (checked) => {
            state.series.sma60.applyOptions({ visible: checked });
        });

        // 布林带显示控制
        indicatorSelector.on('show-boll', (checked) => {
            state.series.bollUpper.applyOptions({ visible: checked });
            state.series.bollMiddle.applyOptions({ visible: checked });
            state.series.bollLower.applyOptions({ visible: checked });
        });

        // MACD 显示控制
        indicatorSelector.on('show-macd', (checked) => {
            if (checked) {
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
        indicatorSelector.on('show-kdj', (checked) => {
            if (checked) {
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
        indicatorSelector.on('show-rsi', (checked) => {
            if (checked) {
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

        console.log('✅ Indicator 选择器组件已设置');
    } else {
        console.warn('⚠️  Indicator 选择器组件未加载');
    }

    // 时间间隔切换按钮事件
    const timeframeButtons = document.querySelectorAll('.timeframe-btn');
    timeframeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const interval = btn.dataset.interval;
            if (interval && interval !== state.currentInterval) {
                switchTimeframe(interval);
            }
        });
    });
    console.log('✅ 时间间隔按钮已设置');

    console.log('✅ 控制面板设置完成');
}

// ==================== 响应式处理 ====================
function setupResponsive() {
    console.log('📱 设置响应式布局...');

    window.addEventListener('resize', () => {
        if (state.chart) {
            const container = document.getElementById('main-chart');
            state.chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight
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

        // 4. 初始化 OHLCV Bar 组件
        if (typeof ohlcvBar !== 'undefined') {
            ohlcvBar.init(state.chart, state.series, 'main-chart');
            console.log('✅ OHLCV Bar 组件已加载');
        } else {
            console.warn('⚠️  OHLCV Bar 组件未加载');
        }

        // 5. 初始化筹码峰管理器
        if (typeof chipManager !== 'undefined' && typeof chipCalculator !== 'undefined') {
            chipManager.init();
            await initializeChipDistribution();
            setupChipDistributionSync();
            setupChipSettings();
            console.log('✅ 筹码峰模块已加载');
        } else {
            console.warn('⚠️  筹码峰模块未加载');
        }

        // 6. 设置控制面板
        setupControls();

        // 7. 响应式
        setupResponsive();

        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 初始化失败:', error);
    }
}

// ==================== 筹码峰初始化 ====================
/**
 * 初始化筹码分布计算
 */
async function initializeChipDistribution() {
    try {
        // 1. 初始化计算器
        chipCalculator.initialize(
            state.stockData.candlestick,
            state.stockData.volume
        );

        // 2. 应用默认设置（从UI读取）
        const options = getChipSettingsFromUI();
        chipCalculator.updateOptions(options);

        // 3. 预计算所有筹码数据
        console.log('开始预计算筹码分布...');
        utils.showLoading('正在计算筹码分布...');

        chipCalculator.precomputeAll((current, total) => {
            // 更新进度（可选）
            const progress = (current / total * 100).toFixed(0);
            console.log(`预计算进度: ${progress}%`);
        });

        utils.hideLoading();
        console.log('✓ 筹码分布预计算完成');

        // 4. 显示默认视图（最后一根K线的筹码分布）
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



/**
 * 设置筹码峰与 K 线图的联动
 */
function setupChipDistributionSync() {
    if (!state.chart || typeof chipManager === 'undefined') return;

    // 1. 监听十字线移动事件（切换筹码数据）
    state.chart.subscribeCrosshairMove((param) => {
        // 调试：打印 param 对象查看可用字段
        console.log('CrosshairMove param:', param);

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

        // 获取该日期的筹码数据
        const chipData = chipCalculator.get(param.time);
        if (!chipData) {
            chipManager.clearPriceLine();
            return;
        }

        // 更新筹码峰显示
        chipManager.updateGlobal(chipData);

        // 获取光标 Y 坐标对应的价格
        let cursorPrice = candleData.close; // 默认值

        if (param.point && param.logical !== undefined) {
            try {
                // 通过可见范围和图表高度计算光标价格
                const chartElement = document.getElementById('main-chart');
                if (chartElement) {
                    const chartHeight = chartElement.clientHeight;
                    const mouseY = param.point.y;

                    // 获取可见范围内的价格极值
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
                            // 价格从上到下：maxPrice 在 Y=0，minPrice 在 Y=chartHeight
                            const priceRange = maxPrice - minPrice;
                            const pricePerPixel = priceRange / chartHeight;
                            cursorPrice = maxPrice - (mouseY * pricePerPixel);
                        }
                    }
                }
            } catch (error) {
                console.warn('计算光标价格失败，使用收盘价:', error);
            }
        }

        // 更新价格标记线和获利盘/套牢盘统计
        chipManager.updatePriceLine(cursorPrice, param.time);
    });

    console.log('✅ 筹码峰联动已设置');
}

// ==================== 筹码峰设置 ====================
/**
 * 从UI获取筹码设置
 */
function getChipSettingsFromUI() {
    const useAllHistory = document.getElementById('use-all-history')?.checked;
    const lookbackValue = document.getElementById('lookback-days')?.value;

    return {
        lookbackDays: useAllHistory ? null : (lookbackValue ? parseInt(lookbackValue) : 90),
        decayRate: parseFloat(document.getElementById('decay-rate')?.value || 0.05),
        numBins: parseInt(document.getElementById('num-bins')?.value || 50),
        algorithm: document.getElementById('decay-algorithm')?.value || 'cumulative'
    };
}

/**
 * 设置筹码峰设置面板
 */
function setupChipSettings() {
    const modal = document.getElementById('chip-settings-modal');
    const settingsBtn = document.getElementById('chip-settings-btn');
    const closeBtn = document.querySelector('.modal-close');
    const applyBtn = document.getElementById('apply-settings-btn');
    const resetBtn = document.getElementById('reset-settings-btn');
    const decayRateSlider = document.getElementById('decay-rate');
    const decayRateDisplay = document.getElementById('decay-rate-display');
    const lookbackDaysInput = document.getElementById('lookback-days');
    const useAllHistoryCheckbox = document.getElementById('use-all-history');

    if (!modal || !settingsBtn) {
        console.warn('筹码设置面板元素未找到');
        return;
    }

    // 打开设置面板
    settingsBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });

    // 关闭设置面板
    const closeModal = () => {
        modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // 回溯天数复选框联动
    useAllHistoryCheckbox.addEventListener('change', (e) => {
        lookbackDaysInput.disabled = e.target.checked;
        if (e.target.checked) {
            lookbackDaysInput.style.opacity = '0.5';
            lookbackDaysInput.style.cursor = 'not-allowed';
        } else {
            lookbackDaysInput.style.opacity = '1';
            lookbackDaysInput.style.cursor = 'text';
        }
    });

    // 衰减率滑块联动
    decayRateSlider.addEventListener('input', (e) => {
        decayRateDisplay.textContent = e.target.value;
    });

    // 应用设置
    applyBtn.addEventListener('click', async () => {
        try {
            // 获取新设置
            const newOptions = getChipSettingsFromUI();

            // 更新计算器配置
            chipCalculator.updateOptions(newOptions);

            // 重新计算
            utils.showLoading('正在重新计算筹码分布...');

            chipCalculator.precomputeAll((current, total) => {
                const progress = (current / total * 100).toFixed(0);
                if (current % 500 === 0) {
                    console.log(`重新计算进度: ${progress}%`);
                }
            });

            utils.hideLoading();

            // 更新显示
            const lastCandle = state.stockData.candlestick[state.stockData.candlestick.length - 1];
            const lastChipData = chipCalculator.get(lastCandle.time);
            if (lastChipData) {
                chipManager.updateGlobal(lastChipData);
            }

            console.log('✓ 筹码分布已更新');
            closeModal();

        } catch (error) {
            console.error('应用设置失败:', error);
            utils.hideLoading();
            alert('应用设置失败: ' + error.message);
        }
    });

    // 恢复默认设置
    resetBtn.addEventListener('click', () => {
        lookbackDaysInput.value = '90';
        useAllHistoryCheckbox.checked = false;
        lookbackDaysInput.disabled = false;
        lookbackDaysInput.style.opacity = '1';
        lookbackDaysInput.style.cursor = 'text';
        document.getElementById('decay-algorithm').value = 'cumulative';
        document.getElementById('decay-rate').value = '0.05';
        decayRateDisplay.textContent = '0.05';
        document.getElementById('num-bins').value = '50';
    });

    console.log('✓ 筹码设置面板已初始化');
}

// ==================== 应用启动 ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM 加载完成,启动应用...');
    init();
});
