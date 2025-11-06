/**
 * Indicator Settings Panel Component
 * 通用设置面板 - 根据后端返回的 metadata 自动生成表单
 * 支持参数类型：number, color, select, boolean, multi_period
 */

// ==================== 类型定义 ====================
// 对应后端 Pydantic 模型

interface ParameterOption {
  value: number | string;
  label: string;
}

type ParameterType = 'number' | 'color' | 'select' | 'boolean' | 'multi_period';

interface IndicatorParameter {
  name: string;
  type: ParameterType;
  label: string;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
}

interface IndicatorMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: IndicatorParameter[];
  display_template: string;
  supports_multiple: boolean;
}

type SaveCallback = (indicatorId: string, parameters: Record<string, any>) => void;

// ==================== 设置面板组件 ====================

export class IndicatorSettingsPanel {
  private container: HTMLElement | null = null;
  private currentIndicatorId: string | null = null;
  private currentMetadata: IndicatorMetadata | null = null;
  private currentValues: Record<string, any> = {};
  private saveCallback: SaveCallback | null = null;

  /**
   * 创建面板容器
   */
  private createHTML(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'indicator-settings-overlay';
    overlay.className = 'indicator-settings-overlay';

    const panel = document.createElement('div');
    panel.className = 'indicator-settings-panel';
    panel.addEventListener('click', (e) => e.stopPropagation());

    // 标题栏
    const header = document.createElement('div');
    header.className = 'settings-panel-header';

    const title = document.createElement('h3');
    title.textContent = '指标设置';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-panel-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 表单容器
    const form = document.createElement('form');
    form.className = 'settings-panel-form';
    form.id = 'settings-form';

    // 底部按钮
    const footer = document.createElement('div');
    footer.className = 'settings-panel-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => this.close());

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', () => this.save());

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    panel.appendChild(header);
    panel.appendChild(form);
    panel.appendChild(footer);

    overlay.appendChild(panel);

    // 点击遮罩关闭
    overlay.addEventListener('click', () => this.close());

    return overlay;
  }

  /**
   * 渲染表单控件（根据参数类型）
   */
  private renderParameter(param: IndicatorParameter): HTMLDivElement {
    const field = document.createElement('div');
    field.className = 'settings-field';

    const label = document.createElement('label');
    label.textContent = param.label;
    label.setAttribute('for', `param-${param.name}`);
    field.appendChild(label);

    let input: HTMLElement;

    switch (param.type) {
      case 'number':
        input = this.renderNumberInput(param);
        break;
      case 'color':
        input = this.renderColorInput(param);
        break;
      case 'select':
        input = this.renderSelectInput(param);
        break;
      case 'boolean':
        input = this.renderBooleanInput(param);
        break;
      case 'multi_period':
        input = this.renderMultiPeriodInput(param);
        break;
      default:
        input = this.renderNumberInput(param);
    }

    field.appendChild(input);
    return field;
  }

  /**
   * 渲染数字输入框
   */
  private renderNumberInput(param: IndicatorParameter): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `param-${param.name}`;
    input.name = param.name;
    input.value = this.currentValues[param.name] ?? param.default;
    if (param.min !== undefined) input.min = param.min.toString();
    if (param.max !== undefined) input.max = param.max.toString();
    if (param.step !== undefined) input.step = param.step.toString();

    input.addEventListener('change', () => {
      this.currentValues[param.name] = parseFloat(input.value);
    });

    return input;
  }

  /**
   * 渲染颜色选择器
   */
  private renderColorInput(param: IndicatorParameter): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.id = `param-${param.name}`;
    input.name = param.name;
    input.value = this.currentValues[param.name] ?? param.default;

    input.addEventListener('change', () => {
      this.currentValues[param.name] = input.value;
    });

    return input;
  }

  /**
   * 渲染下拉选择框
   */
  private renderSelectInput(param: IndicatorParameter): HTMLSelectElement {
    const select = document.createElement('select');
    select.id = `param-${param.name}`;
    select.name = param.name;

    param.options?.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value.toString();
      opt.textContent = option.label;
      select.appendChild(opt);
    });

    select.value = (this.currentValues[param.name] ?? param.default).toString();

    select.addEventListener('change', () => {
      this.currentValues[param.name] = select.value;
    });

    return select;
  }

  /**
   * 渲染布尔开关
   */
  private renderBooleanInput(param: IndicatorParameter): HTMLLabelElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `param-${param.name}`;
    input.name = param.name;
    input.checked = this.currentValues[param.name] ?? param.default;

    input.addEventListener('change', () => {
      this.currentValues[param.name] = input.checked;
    });

    const slider = document.createElement('span');
    slider.className = 'slider';

    wrapper.appendChild(input);
    wrapper.appendChild(slider);

    return wrapper;
  }

  /**
   * 渲染多周期选择器（MA专用）
   */
  private renderMultiPeriodInput(param: IndicatorParameter): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'multi-period-selector';

    const currentPeriods: number[] = this.currentValues[param.name] ?? param.default;

    // 渲染可用选项（复选框）
    param.options?.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = option.value.toString();
      checkbox.checked = currentPeriods.includes(Number(option.value));

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          currentPeriods.push(Number(option.value));
        } else {
          const index = currentPeriods.indexOf(Number(option.value));
          if (index > -1) currentPeriods.splice(index, 1);
        }
        currentPeriods.sort((a, b) => a - b); // 排序
        this.currentValues[param.name] = currentPeriods;
      });

      const span = document.createElement('span');
      span.textContent = option.label;

      label.appendChild(checkbox);
      label.appendChild(span);
      wrapper.appendChild(label);
    });

    return wrapper;
  }

  /**
   * 从 API 获取指标元数据
   */
  private async fetchMetadata(indicatorId: string): Promise<IndicatorMetadata | null> {
    try {
      const response = await fetch(`/api/v1/indicators/${indicatorId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('获取指标元数据失败:', error);
      return null;
    }
  }

  /**
   * 打开设置面板
   */
  async open(indicatorId: string, currentParams: Record<string, any> = {}): Promise<void> {
    console.log(`⚙️ 打开设置面板: ${indicatorId}`);

    this.currentIndicatorId = indicatorId;
    this.currentValues = { ...currentParams };

    // 获取元数据
    this.currentMetadata = await this.fetchMetadata(indicatorId);
    if (!this.currentMetadata) {
      alert('无法加载指标配置');
      return;
    }

    // 创建容器（如果不存在）
    if (!this.container) {
      this.container = this.createHTML();
      document.body.appendChild(this.container);
    }

    // 更新标题
    const title = this.container.querySelector('.settings-panel-header h3');
    if (title) {
      title.textContent = `${this.currentMetadata.name} - 设置`;
    }

    // 渲染表单
    const form = this.container.querySelector('#settings-form');
    if (form) {
      form.innerHTML = ''; // 清空

      // 初始化所有参数的默认值
      this.currentMetadata.parameters.forEach((param) => {
        // 如果 currentValues 中没有该参数，使用默认值
        if (this.currentValues[param.name] === undefined) {
          this.currentValues[param.name] = param.default;
        }

        const field = this.renderParameter(param);
        form.appendChild(field);
      });
    }

    // 显示面板
    this.container.classList.add('active');
  }

  /**
   * 关闭面板
   */
  close(): void {
    if (this.container) {
      this.container.classList.remove('active');
    }
    console.log('✅ 关闭设置面板');
  }

  /**
   * 保存设置
   */
  save(): void {
    if (!this.currentIndicatorId) return;

    console.log('💾 保存设置:', this.currentValues);

    // 触发回调
    if (this.saveCallback) {
      this.saveCallback(this.currentIndicatorId, this.currentValues);
    }

    this.close();
  }

  /**
   * 注册保存回调
   */
  onSave(callback: SaveCallback): void {
    this.saveCallback = callback;
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.currentIndicatorId = null;
    this.currentMetadata = null;
    this.currentValues = {};
    this.saveCallback = null;
    console.log('✅ Indicator Settings Panel 组件已销毁');
  }
}

// 导出单例
export const indicatorSettingsPanel = new IndicatorSettingsPanel();
