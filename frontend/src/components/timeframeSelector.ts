/**
 * Timeframe Selector Component
 * 下拉式时间间隔选择器
 * 点击按钮显示下拉菜单，选择后更新按钮文字
 */

import type { TimeframeType } from '../types';

/**
 * 时间间隔项配置
 */
interface TimeframeItem {
  interval: TimeframeType;
  label: string;
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
  private buttonElement: HTMLButtonElement | null = null;
  private dropdownElement: HTMLDivElement | null = null;
  private listeners: TimeframeChangeCallback[] = [];
  private currentInterval: TimeframeType = 'daily';
  private isDropdownOpen: boolean = false;

  /**
   * 时间间隔配置
   */
  private readonly timeframes: TimeframeItem[] = [
    { interval: 'daily', label: 'D' },
    { interval: 'weekly', label: 'W' },
    { interval: 'monthly', label: 'M' },
  ];

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'timeframe-selector-wrapper';
    container.id = 'timeframe-selector';

    // 主按钮
    const button = document.createElement('button');
    button.className = 'timeframe-selector-button';
    button.textContent = this.getLabelByInterval(this.currentInterval);
    this.buttonElement = button;

    // 下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'timeframe-dropdown';
    this.dropdownElement = dropdown;

    this.timeframes.forEach((item) => {
      const option = document.createElement('div');
      option.className = 'timeframe-dropdown-item';
      option.setAttribute('data-interval', item.interval);
      option.textContent = item.label;

      option.addEventListener('click', () => {
        this.selectInterval(item.interval);
      });

      dropdown.appendChild(option);
    });

    container.appendChild(button);
    container.appendChild(dropdown);

    return container;
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    if (!this.buttonElement) return;

    // 点击按钮切换下拉菜单
    this.buttonElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  /**
   * 获取时间间隔对应的标签
   */
  private getLabelByInterval(interval: TimeframeType): string {
    const item = this.timeframes.find((t) => t.interval === interval);
    return item ? item.label : 'D';
  }

  /**
   * 切换下拉菜单显示/隐藏
   */
  private toggleDropdown(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * 打开下拉菜单
   */
  private openDropdown(): void {
    if (!this.dropdownElement) return;

    this.dropdownElement.classList.add('active');
    this.isDropdownOpen = true;
  }

  /**
   * 关闭下拉菜单
   */
  private closeDropdown(): void {
    if (!this.dropdownElement) return;

    this.dropdownElement.classList.remove('active');
    this.isDropdownOpen = false;
  }

  /**
   * 选择时间间隔
   */
  private selectInterval(interval: TimeframeType): void {
    if (interval === this.currentInterval) {
      this.closeDropdown();
      return;
    }

    console.log(`切换时间间隔: ${interval}`);

    // 更新当前间隔
    this.currentInterval = interval;

    // 更新按钮文字
    if (this.buttonElement) {
      this.buttonElement.textContent = this.getLabelByInterval(interval);
    }

    // 关闭下拉菜单
    this.closeDropdown();

    // 触发回调
    this.listeners.forEach((callback) => callback(interval));
  }

  /**
   * 初始化组件
   * @param containerId - 父容器 ID
   */
  init(containerId: string = 'main-chart'): boolean {
    console.log('📅 初始化 Timeframe Selector 组件...');

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

    // 创建容器（或查找已存在的 timeframe-controls）
    let controlsContainer = wrapper.querySelector('.timeframe-controls') as HTMLElement;
    if (!controlsContainer) {
      controlsContainer = document.createElement('div');
      controlsContainer.className = 'timeframe-controls';
      wrapper.appendChild(controlsContainer);
    }

    // 创建选择器并插入
    this.container = this.createHTML();
    controlsContainer.insertBefore(this.container, controlsContainer.firstChild);

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
    if (this.buttonElement) {
      this.buttonElement.textContent = this.getLabelByInterval(interval);
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.buttonElement = null;
    this.dropdownElement = null;
    this.listeners = [];
    console.log('✅ Timeframe Selector 组件已销毁');
  }
}

// 导出单例
export const timeframeSelector = new TimeframeSelector();
