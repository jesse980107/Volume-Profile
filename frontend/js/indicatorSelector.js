/**
 * Indicator Selector Component
 * 管理技术指标选择器的创建、渲染和交互
 */

const indicatorSelector = (() => {
    // 私有状态
    let container = null;
    let listeners = {};

    /**
     * 指标配置
     */
    const indicators = [
        // 均线组
        {
            group: 'ma',
            label: '均线',
            items: [
                { id: 'show-sma5', label: 'MA5', checked: true },
                { id: 'show-sma10', label: 'MA10', checked: true },
                { id: 'show-sma20', label: 'MA20', checked: true },
                { id: 'show-sma60', label: 'MA60', checked: false },
            ]
        },
        // 技术指标组
        {
            group: 'indicators',
            label: '技术指标',
            items: [
                { id: 'show-boll', label: '布林带', checked: false },
                { id: 'show-macd', label: 'MACD', checked: false },
                { id: 'show-kdj', label: 'KDJ', checked: false },
                { id: 'show-rsi', label: 'RSI', checked: false },
            ]
        }
    ];

    /**
     * 创建 HTML 结构
     */
    function createHTML() {
        const overlay = document.createElement('div');
        overlay.className = 'controls-overlay';
        overlay.id = 'indicator-selector';

        indicators.forEach(group => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';

            group.items.forEach(item => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = item.id;
                checkbox.checked = item.checked;

                const span = document.createElement('span');
                span.textContent = item.label;

                label.appendChild(checkbox);
                label.appendChild(span);
                controlGroup.appendChild(label);
            });

            overlay.appendChild(controlGroup);
        });

        return overlay;
    }

    /**
     * 初始化组件
     * @param {string} containerId - 父容器 ID（默认挂载到 .chart-main-wrapper）
     */
    function init(containerId = 'main-chart') {
        console.log('📊 初始化 Indicator Selector 组件...');

        const parentContainer = document.getElementById(containerId);
        if (!parentContainer) {
            console.error(`容器 #${containerId} 未找到`);
            return false;
        }

        // 查找或创建挂载点
        container = parentContainer.parentElement;
        if (!container) {
            console.error('无法找到父容器');
            return false;
        }

        // 创建并插入 HTML
        const selectorHTML = createHTML();
        container.appendChild(selectorHTML);

        // 绑定事件
        bindEvents();

        console.log('✅ Indicator Selector 组件初始化完成');
        return true;
    }

    /**
     * 绑定事件监听
     */
    function bindEvents() {
        indicators.forEach(group => {
            group.items.forEach(item => {
                const checkbox = document.getElementById(item.id);
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        handleChange(item.id, e.target.checked);
                    });
                }
            });
        });
    }

    /**
     * 处理指标切换事件
     */
    function handleChange(indicatorId, checked) {
        console.log(`${indicatorId} 切换为: ${checked}`);

        // 触发回调
        if (listeners[indicatorId]) {
            listeners[indicatorId].forEach(callback => callback(checked));
        }
    }

    /**
     * 注册指标变化监听器
     * @param {string} indicatorId - 指标 ID
     * @param {Function} callback - 回调函数
     */
    function on(indicatorId, callback) {
        if (!listeners[indicatorId]) {
            listeners[indicatorId] = [];
        }
        listeners[indicatorId].push(callback);
    }

    /**
     * 移除指标变化监听器
     */
    function off(indicatorId, callback) {
        if (listeners[indicatorId]) {
            listeners[indicatorId] = listeners[indicatorId].filter(cb => cb !== callback);
        }
    }

    /**
     * 获取指标状态
     */
    function getState(indicatorId) {
        const checkbox = document.getElementById(indicatorId);
        return checkbox ? checkbox.checked : false;
    }

    /**
     * 设置指标状态
     */
    function setState(indicatorId, checked) {
        const checkbox = document.getElementById(indicatorId);
        if (checkbox) {
            checkbox.checked = checked;
            handleChange(indicatorId, checked);
        }
    }

    /**
     * 销毁组件
     */
    function destroy() {
        if (container) {
            const overlay = document.getElementById('indicator-selector');
            if (overlay) {
                overlay.remove();
            }
        }
        listeners = {};
        console.log('✅ Indicator Selector 组件已销毁');
    }

    // 公开 API
    return {
        init,
        on,
        off,
        getState,
        setState,
        destroy,
    };
})();
