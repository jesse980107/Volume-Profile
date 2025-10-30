/**
 * OHLCV Bar Component
 * 显示当前 K 线的 OHLCV 数据和技术指标信息
 */

const ohlcvBar = (() => {
    // 私有状态
    let barElement = null;
    let chartInstance = null;
    let seriesRefs = null;

    /**
     * 工具函数：格式化数字
     */
    function formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return '--';
        return num.toFixed(decimals);
    }

    /**
     * 创建 HTML 结构
     */
    function createHTML() {
        const bar = document.createElement('div');
        bar.id = 'ohlcv-bar';
        bar.className = 'ohlcv-bar';
        return bar;
    }

    /**
     * 构建 OHLCV 显示内容（仅显示 OHLCV）
     */
    function buildContent(param) {
        if (!param || !param.time || !param.point) {
            return '';
        }

        // 获取 K 线和成交量数据
        const candleData = param.seriesData.get(seriesRefs.candle);
        const volumeData = param.seriesData.get(seriesRefs.volume);

        if (!candleData) {
            return '';
        }

        // 计算涨跌
        const priceChange = candleData.close - candleData.open;
        const priceChangeClass = priceChange >= 0 ? 'up' : 'down';

        let items = [];

        // OHLC 数据
        items.push(`<span class="ohlcv-item">O: ${formatNumber(candleData.open)}</span>`);
        items.push(`<span class="ohlcv-item">H: ${formatNumber(candleData.high)}</span>`);
        items.push(`<span class="ohlcv-item">L: ${formatNumber(candleData.low)}</span>`);
        items.push(`<span class="ohlcv-item">C: <span class="${priceChangeClass}">${formatNumber(candleData.close)}</span></span>`);

        // 成交量
        if (volumeData) {
            items.push(`<span class="ohlcv-item">Vol: ${formatNumber(volumeData.value, 0)}</span>`);
        }

        return items.join(' ');
    }

    /**
     * 更新显示内容
     */
    function update(param) {
        if (!barElement) return;

        const content = buildContent(param);

        if (content) {
            barElement.innerHTML = content;
            barElement.style.display = 'block';
        } else {
            barElement.style.display = 'none';
        }
    }

    /**
     * 隐藏 bar
     */
    function hide() {
        if (barElement) {
            barElement.style.display = 'none';
        }
    }

    /**
     * 初始化组件
     * @param {Object} chart - Lightweight Charts 实例
     * @param {Object} series - 所有系列的引用对象
     * @param {string} containerId - 父容器 ID
     */
    function init(chart, series, containerId = 'main-chart') {
        console.log('📊 初始化 OHLCV Bar 组件...');

        if (!chart || !series) {
            console.error('缺少必要参数：chart 或 series');
            return false;
        }

        chartInstance = chart;
        seriesRefs = series;

        // 查找挂载点
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`容器 #${containerId} 未找到`);
            return false;
        }

        // 创建并插入 HTML
        barElement = createHTML();
        const parentWrapper = container.parentElement;
        if (parentWrapper) {
            parentWrapper.appendChild(barElement);
        } else {
            console.error('无法找到父容器');
            return false;
        }

        // 订阅 crosshair 移动事件
        chartInstance.subscribeCrosshairMove((param) => {
            if (!param || !param.time || !param.point) {
                hide();
                return;
            }
            update(param);
        });

        console.log('✅ OHLCV Bar 组件初始化完成');
        return true;
    }

    /**
     * 销毁组件
     */
    function destroy() {
        if (barElement) {
            barElement.remove();
            barElement = null;
        }
        chartInstance = null;
        seriesRefs = null;
        console.log('✅ OHLCV Bar 组件已销毁');
    }

    // 公开 API
    return {
        init,
        update,
        hide,
        destroy,
    };
})();
