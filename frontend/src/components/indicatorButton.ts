/**
 * Indicator Button Component
 * "Indicators" 按钮，点击后打开指标选择模态窗口
 */

type ClickCallback = () => void;

export class IndicatorButton {
  private buttonElement: HTMLButtonElement | null = null;
  private listeners: ClickCallback[] = [];

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'indicator-button';
    button.className = 'indicator-button';
    button.textContent = 'Indicators';
    return button;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (this.buttonElement) {
      this.buttonElement.addEventListener('click', () => {
        this.listeners.forEach((callback) => callback());
      });
    }
  }

  /**
   * 初始化组件
   * @param containerId - 父容器 ID（将插入到该容器的父元素中）
   */
  init(containerId: string = 'main-chart'): boolean {
    console.log('📊 初始化 Indicator Button 组件...');

    const parentContainer = document.getElementById(containerId);
    if (!parentContainer) {
      console.error(`容器 #${containerId} 未找到`);
      return false;
    }

    const wrapper = parentContainer.parentElement;
    if (!wrapper) {
      console.error('无法找到父容器');
      return false;
    }

    // 创建按钮
    this.buttonElement = this.createHTML();

    // 查找 timeframe-controls 并插入按钮
    const timeframeControls = wrapper.querySelector('.timeframe-controls');
    if (timeframeControls) {
      timeframeControls.appendChild(this.buttonElement);
    } else {
      console.error('未找到 .timeframe-controls 容器');
      return false;
    }

    // 绑定事件
    this.bindEvents();

    console.log('✅ Indicator Button 组件初始化完成');
    return true;
  }

  /**
   * 注册点击监听器
   */
  onClick(callback: ClickCallback): void {
    this.listeners.push(callback);
  }

  /**
   * 移除点击监听器
   */
  offClick(callback: ClickCallback): void {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.buttonElement) {
      this.buttonElement.remove();
      this.buttonElement = null;
    }
    this.listeners = [];
    console.log('✅ Indicator Button 组件已销毁');
  }
}

// 导出单例
export const indicatorButton = new IndicatorButton();
