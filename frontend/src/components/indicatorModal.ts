/**
 * Indicator Modal Component
 * 全屏模态窗口，显示可添加的指标列表
 * 点击指标即添加，点击遮罩或关闭按钮则关闭
 */

interface IndicatorConfig {
  id: string;
  label: string;
  description?: string;
}

type AddIndicatorCallback = (indicatorId: string) => void;

export class IndicatorModal {
  private modalElement: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private addListeners: AddIndicatorCallback[] = [];

  /**
   * 指标配置列表（不分组）
   */
  private readonly indicators: IndicatorConfig[] = [
    { id: 'show-ma', label: 'Moving Average', description: '移动平均线 (默认20日)' },
    { id: 'show-boll', label: '布林带', description: 'Bollinger Bands' },
    { id: 'show-macd', label: 'MACD', description: 'Moving Average Convergence Divergence' },
    { id: 'show-kdj', label: 'KDJ', description: '随机指标' },
    { id: 'show-rsi', label: 'RSI', description: 'Relative Strength Index' },
  ];

  /**
   * 创建 HTML 结构
   */
  private createHTML(): HTMLDivElement {
    // 外层遮罩
    const modal = document.createElement('div');
    modal.id = 'indicator-modal';
    modal.className = 'indicator-modal';

    // 内容区域
    const content = document.createElement('div');
    content.className = 'indicator-modal-content';

    // 头部
    const header = document.createElement('div');
    header.className = 'indicator-modal-header';

    const title = document.createElement('h3');
    title.textContent = '添加技术指标';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'indicator-modal-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 指标列表容器
    const listContainer = document.createElement('div');
    listContainer.className = 'indicator-modal-list';

    // 渲染所有指标
    this.indicators.forEach((indicator) => {
      const item = document.createElement('div');
      item.className = 'indicator-modal-item';
      item.setAttribute('data-id', indicator.id);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'indicator-modal-item-label';
      labelDiv.textContent = indicator.label;

      if (indicator.description) {
        const descDiv = document.createElement('div');
        descDiv.className = 'indicator-modal-item-desc';
        descDiv.textContent = indicator.description;
        item.appendChild(labelDiv);
        item.appendChild(descDiv);
      } else {
        item.appendChild(labelDiv);
      }

      // 点击添加指标
      item.addEventListener('click', () => {
        this.handleAddIndicator(indicator.id);
      });

      listContainer.appendChild(item);
    });

    content.appendChild(header);
    content.appendChild(listContainer);
    modal.appendChild(content);

    // 点击遮罩关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    return modal;
  }

  /**
   * 处理添加指标
   */
  private handleAddIndicator(indicatorId: string): void {
    console.log(`添加指标: ${indicatorId}`);

    // 触发回调
    this.addListeners.forEach((callback) => callback(indicatorId));

    // 关闭模态窗口
    this.close();
  }

  /**
   * 打开模态窗口
   */
  open(): void {
    if (this.isOpen || !this.modalElement) return;

    this.modalElement.classList.add('active');
    this.isOpen = true;
    console.log('✅ 打开 Indicator Modal');
  }

  /**
   * 关闭模态窗口
   */
  close(): void {
    if (!this.isOpen || !this.modalElement) return;

    this.modalElement.classList.remove('active');
    this.isOpen = false;
    console.log('✅ 关闭 Indicator Modal');
  }

  /**
   * 初始化组件
   */
  init(): boolean {
    console.log('📊 初始化 Indicator Modal 组件...');

    // 创建模态窗口
    this.modalElement = this.createHTML();

    // 添加到 body
    document.body.appendChild(this.modalElement);

    console.log('✅ Indicator Modal 组件初始化完成');
    return true;
  }

  /**
   * 注册添加指标监听器
   */
  onAdd(callback: AddIndicatorCallback): void {
    this.addListeners.push(callback);
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    this.addListeners = [];
    this.isOpen = false;
    console.log('✅ Indicator Modal 组件已销毁');
  }
}

// 导出单例
export const indicatorModal = new IndicatorModal();
