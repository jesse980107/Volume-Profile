/**
 * Indicator Bar List Component
 * 显示在图表左侧，管理已添加的指标
 * 支持显示当前数值、hover 交互、显示/隐藏、删除
 */

interface IndicatorBarItem {
  id: string;
  label: string;
  visible: boolean;
  value: string; // 当前数值
}

type VisibilityChangeCallback = (id: string, visible: boolean) => void;
type RemoveCallback = (id: string) => void;
type SettingsCallback = (id: string) => void;

export class IndicatorBarList {
  private container: HTMLElement | null = null;
  private items: Map<string, IndicatorBarItem> = new Map();
  private visibilityListeners: VisibilityChangeCallback[] = [];
  private removeListeners: RemoveCallback[] = [];
  private settingsListeners: SettingsCallback[] = [];

  /**
   * 创建 HTML 容器
   */
  private createHTML(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'indicator-bar-list';
    container.className = 'indicator-bar-list';
    return container;
  }

  /**
   * 创建单个 indicator bar
   */
  private createBarHTML(item: IndicatorBarItem): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'indicator-bar';
    bar.setAttribute('data-id', item.id);

    // 左侧：名称和数值
    const infoDiv = document.createElement('div');
    infoDiv.className = 'indicator-bar-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'indicator-bar-name';
    nameSpan.textContent = item.label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'indicator-bar-value';
    valueSpan.textContent = item.value;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(valueSpan);

    // 右侧：操作按钮（hover 时显示）
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'indicator-bar-actions';

    // 设置按钮（齿轮图标）
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'indicator-bar-btn settings-btn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = '设置';
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSettings(item.id);
    });

    // 显示/隐藏按钮
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = `indicator-bar-btn visibility-btn${item.visible ? ' active' : ''}`;
    visibilityBtn.innerHTML = '👁'; // 使用 emoji
    visibilityBtn.title = item.visible ? '隐藏' : '显示';
    visibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleVisibility(item.id);
    });

    // 删除按钮
    const removeBtn = document.createElement('button');
    removeBtn.className = 'indicator-bar-btn remove-btn';
    removeBtn.innerHTML = '✕';
    removeBtn.title = '删除';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeIndicator(item.id);
    });

    actionsDiv.appendChild(settingsBtn);
    actionsDiv.appendChild(visibilityBtn);
    actionsDiv.appendChild(removeBtn);

    bar.appendChild(infoDiv);
    bar.appendChild(actionsDiv);

    return bar;
  }

  /**
   * 渲染整个列表
   */
  private render(): void {
    if (!this.container) return;

    // 清空容器
    this.container.innerHTML = '';

    // 渲染所有 bar
    this.items.forEach((item) => {
      const barElement = this.createBarHTML(item);
      this.container!.appendChild(barElement);
    });
  }

  /**
   * 添加指标
   */
  addIndicator(id: string, label: string, initialValue: string = '--'): void {
    if (this.items.has(id)) {
      console.warn(`指标 ${id} 已存在`);
      return;
    }

    this.items.set(id, {
      id,
      label,
      visible: true,
      value: initialValue,
    });

    this.render();
    console.log(`✅ 添加指标: ${label} (${id})`);
  }

  /**
   * 移除指标
   */
  removeIndicator(id: string): void {
    if (!this.items.has(id)) {
      console.warn(`指标 ${id} 不存在`);
      return;
    }

    this.items.delete(id);
    this.render();

    // 触发回调
    this.removeListeners.forEach((callback) => callback(id));
    console.log(`✅ 移除指标: ${id}`);
  }

  /**
   * 切换显示/隐藏
   */
  toggleVisibility(id: string): void {
    const item = this.items.get(id);
    if (!item) {
      console.warn(`指标 ${id} 不存在`);
      return;
    }

    item.visible = !item.visible;
    this.render();

    // 触发回调
    this.visibilityListeners.forEach((callback) => callback(id, item.visible));
    console.log(`✅ 切换指标可见性: ${id} -> ${item.visible}`);
  }

  /**
   * 打开设置面板
   */
  openSettings(id: string): void {
    const item = this.items.get(id);
    if (!item) {
      console.warn(`指标 ${id} 不存在`);
      return;
    }

    // 触发回调
    this.settingsListeners.forEach((callback) => callback(id));
    console.log(`⚙️ 打开设置面板: ${id}`);
  }

  /**
   * 更新指标数值
   */
  updateValue(id: string, value: string): void {
    const item = this.items.get(id);
    if (!item) return;

    item.value = value;

    // 只更新该 bar 的数值部分（避免重新渲染整个列表）
    if (this.container) {
      const barElement = this.container.querySelector(`[data-id="${id}"]`);
      if (barElement) {
        const valueSpan = barElement.querySelector('.indicator-bar-value');
        if (valueSpan) {
          valueSpan.textContent = value;
        }
      }
    }
  }

  /**
   * 检查指标是否已添加
   */
  hasIndicator(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * 获取所有指标 ID
   */
  getAllIndicatorIds(): string[] {
    return Array.from(this.items.keys());
  }

  /**
   * 初始化组件
   */
  init(containerId: string = 'main-chart'): boolean {
    console.log('📊 初始化 Indicator Bar List 组件...');

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

    // 创建容器
    this.container = this.createHTML();
    wrapper.appendChild(this.container);

    console.log('✅ Indicator Bar List 组件初始化完成');
    return true;
  }

  /**
   * 注册可见性变化监听器
   */
  onVisibilityChange(callback: VisibilityChangeCallback): void {
    this.visibilityListeners.push(callback);
  }

  /**
   * 注册删除监听器
   */
  onRemove(callback: RemoveCallback): void {
    this.removeListeners.push(callback);
  }

  /**
   * 注册设置按钮点击监听器
   */
  onSettings(callback: SettingsCallback): void {
    this.settingsListeners.push(callback);
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.items.clear();
    this.visibilityListeners = [];
    this.removeListeners = [];
    this.settingsListeners = [];
    console.log('✅ Indicator Bar List 组件已销毁');
  }
}

// 导出单例
export const indicatorBarList = new IndicatorBarList();
