/**
 * Indicator Selector Component
 * 管理技术指标选择器的创建、渲染和交互
 */

/**
 * 指标项配置
 */
interface IndicatorItem {
  id: string;
  label: string;
  checked: boolean;
}

/**
 * 指标组配置
 */
interface IndicatorGroup {
  group: string;
  label: string;
  items: IndicatorItem[];
}

/**
 * 指标变化回调函数类型
 */
type IndicatorChangeCallback = (checked: boolean) => void;

/**
 * Indicator Selector 组件类
 */
export class IndicatorSelector {
  private container: HTMLElement | null = null;
  private listeners: Record<string, IndicatorChangeCallback[]> = {};

  /**
   * 指标配置
   */
  private readonly indicators: IndicatorGroup[] = [
    // 均线组
    {
      group: 'ma',
      label: '均线',
      items: [
        { id: 'show-ma5', label: 'MA5', checked: true },
        { id: 'show-ma10', label: 'MA10', checked: true },
        { id: 'show-ma20', label: 'MA20', checked: true },
        { id: 'show-ma60', label: 'MA60', checked: false },
      ],
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
      ],
    },
  ];

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'controls-overlay';
    overlay.id = 'indicator-selector';

    this.indicators.forEach((group) => {
      const controlGroup = document.createElement('div');
      controlGroup.className = 'control-group';

      group.items.forEach((item) => {
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
   * 绑定事件监听
   */
  private bindEvents(): void {
    this.indicators.forEach((group) => {
      group.items.forEach((item) => {
        const checkbox = document.getElementById(item.id) as HTMLInputElement | null;
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            this.handleChange(item.id, (e.target as HTMLInputElement).checked);
          });
        }
      });
    });
  }

  /**
   * 处理指标切换事件
   */
  private handleChange(indicatorId: string, checked: boolean): void {
    console.log(`${indicatorId} 切换为: ${checked}`);

    // 触发回调
    if (this.listeners[indicatorId]) {
      this.listeners[indicatorId].forEach((callback) => callback(checked));
    }
  }

  /**
   * 初始化组件
   * @param containerId - 父容器 ID（默认挂载到 .chart-main-wrapper）
   */
  init(containerId: string = 'main-chart'): boolean {
    console.log('📊 初始化 Indicator Selector 组件...');

    const parentContainer = document.getElementById(containerId);
    if (!parentContainer) {
      console.error(`容器 #${containerId} 未找到`);
      return false;
    }

    // 查找或创建挂载点
    this.container = parentContainer.parentElement;
    if (!this.container) {
      console.error('无法找到父容器');
      return false;
    }

    // 创建并插入 HTML
    const selectorHTML = this.createHTML();
    this.container.appendChild(selectorHTML);

    // 绑定事件
    this.bindEvents();

    console.log('✅ Indicator Selector 组件初始化完成');
    return true;
  }

  /**
   * 注册指标变化监听器
   * @param indicatorId - 指标 ID
   * @param callback - 回调函数
   */
  on(indicatorId: string, callback: IndicatorChangeCallback): void {
    if (!this.listeners[indicatorId]) {
      this.listeners[indicatorId] = [];
    }
    this.listeners[indicatorId].push(callback);
  }

  /**
   * 移除指标变化监听器
   */
  off(indicatorId: string, callback: IndicatorChangeCallback): void {
    if (this.listeners[indicatorId]) {
      this.listeners[indicatorId] = this.listeners[indicatorId].filter((cb) => cb !== callback);
    }
  }

  /**
   * 获取指标状态
   */
  getState(indicatorId: string): boolean {
    const checkbox = document.getElementById(indicatorId) as HTMLInputElement | null;
    return checkbox ? checkbox.checked : false;
  }

  /**
   * 设置指标状态
   */
  setState(indicatorId: string, checked: boolean): void {
    const checkbox = document.getElementById(indicatorId) as HTMLInputElement | null;
    if (checkbox) {
      checkbox.checked = checked;
      this.handleChange(indicatorId, checked);
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      const overlay = document.getElementById('indicator-selector');
      if (overlay) {
        overlay.remove();
      }
    }
    this.listeners = {};
    console.log('✅ Indicator Selector 组件已销毁');
  }
}

// 导出单例
export const indicatorSelector = new IndicatorSelector();
