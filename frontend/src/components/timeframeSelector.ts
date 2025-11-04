/**
 * Timeframe Selector Component
 * 管理时间间隔选择器的创建、渲染和交互
 */

import type { TimeframeType } from '../types';

/**
 * 时间间隔项配置
 */
interface TimeframeItem {
  id: string;
  interval: TimeframeType;
  label: string;
  active: boolean;
}

/**
 * 时间间隔变化回调函数类型
 */
type TimeframeChangeCallback = (interval: TimeframeType) => void;

/**
 * Timeframe Selector 组件类
 */
export class TimeframeSelector {
  private container: HTMLElement | null = null;
  private listeners: TimeframeChangeCallback[] = [];
  private currentInterval: TimeframeType = 'daily';

  /**
   * 时间间隔配置
   */
  private readonly timeframes: TimeframeItem[] = [
    { id: 'btn-daily', interval: 'daily', label: 'D', active: true },
    { id: 'btn-weekly', interval: 'weekly', label: 'W', active: false },
    { id: 'btn-monthly', interval: 'monthly', label: 'M', active: false },
  ];

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLDivElement {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'timeframe-controls';
    controlsDiv.id = 'timeframe-selector';

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'timeframe-buttons';

    this.timeframes.forEach((item) => {
      const button = document.createElement('button');
      button.id = item.id;
      button.className = `timeframe-btn${item.active ? ' active' : ''}`;
      button.setAttribute('data-interval', item.interval);
      button.textContent = item.label;

      buttonsDiv.appendChild(button);
    });

    controlsDiv.appendChild(buttonsDiv);
    return controlsDiv;
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    this.timeframes.forEach((item) => {
      const button = document.getElementById(item.id) as HTMLButtonElement | null;
      if (button) {
        button.addEventListener('click', () => {
          const interval = button.dataset.interval as TimeframeType;
          if (interval && interval !== this.currentInterval) {
            this.handleChange(interval);
          }
        });
      }
    });
  }

  /**
   * 处理时间间隔切换事件
   */
  private handleChange(interval: TimeframeType): void {
    console.log(`切换时间间隔: ${interval}`);

    // 更新当前间隔
    this.currentInterval = interval;

    // 更新按钮状态
    this.updateButtonStates(interval);

    // 触发回调
    this.listeners.forEach((callback) => callback(interval));
  }

  /**
   * 更新按钮状态
   */
  private updateButtonStates(activeInterval: TimeframeType): void {
    this.timeframes.forEach((item) => {
      const button = document.getElementById(item.id);
      if (button) {
        if (item.interval === activeInterval) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    });
  }

  /**
   * 初始化组件
   * @param containerId - 父容器 ID
   * @param insertPosition - 插入位置 ('prepend' | 'append')
   */
  init(
    containerId: string = 'main-chart',
    insertPosition: 'prepend' | 'append' = 'prepend'
  ): boolean {
    console.log('📅 初始化 Timeframe Selector 组件...');

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

    // 根据插入位置决定插入方式
    if (insertPosition === 'prepend') {
      this.container.insertBefore(selectorHTML, parentContainer);
    } else {
      this.container.appendChild(selectorHTML);
    }

    // 绑定事件
    this.bindEvents();

    console.log('✅ Timeframe Selector 组件初始化完成');
    return true;
  }

  /**
   * 注册时间间隔变化监听器
   * @param callback - 回调函数
   */
  onChange(callback: TimeframeChangeCallback): void {
    this.listeners.push(callback);
  }

  /**
   * 移除时间间隔变化监听器
   */
  offChange(callback: TimeframeChangeCallback): void {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  /**
   * 获取当前时间间隔
   */
  getCurrentInterval(): TimeframeType {
    return this.currentInterval;
  }

  /**
   * 设置当前时间间隔（不触发回调）
   */
  setCurrentInterval(interval: TimeframeType): void {
    this.currentInterval = interval;
    this.updateButtonStates(interval);
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      const selector = document.getElementById('timeframe-selector');
      if (selector) {
        selector.remove();
      }
    }
    this.listeners = [];
    console.log('✅ Timeframe Selector 组件已销毁');
  }
}

// 导出单例
export const timeframeSelector = new TimeframeSelector();
