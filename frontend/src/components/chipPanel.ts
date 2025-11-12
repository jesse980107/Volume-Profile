/**
 * 筹码峰面板组件
 * 管理右侧筹码分布的完整 UI 和交互
 */

import type { ChipOptions } from '../types';
import { chipCalculator } from '../services/chipCalculator';
import { chipManager } from '../services/chipManager';

export class ChipPanel {
  private container: HTMLElement | null = null;
  private modal: HTMLElement | null = null;

  /**
   * 初始化组件（填充 HTML 内容到占位符）
   */
  init(): void {
    // 1. 获取占位符容器
    this.container = document.getElementById('chip-panel-container');
    const modalContainer = document.getElementById('chip-settings-modal-container');

    if (!this.container) {
      console.error('筹码峰面板占位符未找到: #chip-panel-container');
      return;
    }

    if (!modalContainer) {
      console.error('设置弹窗占位符未找到: #chip-settings-modal-container');
      return;
    }

    // 2. 填充面板内容（而不是创建新元素）
    this.container.innerHTML = this.getPanelHTML();

    // 3. 创建并插入设置弹窗
    this.modal = document.createElement('div');
    this.modal.id = 'chip-settings-modal';
    this.modal.className = 'modal';
    this.modal.innerHTML = this.getModalHTML();
    modalContainer.appendChild(this.modal);

    // 4. 初始化 ECharts（此时容器已经有布局了）
    chipManager.init();

    // 5. 绑定事件
    this.bindEvents();

    console.log('✓ ChipPanel 组件已初始化');
  }

  /**
   * 面板主体 HTML
   */
  private getPanelHTML(): string {
    return `
      <div id="chip-canvas" class="chip-canvas"></div>

      <div class="chip-stats">
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-label">筹码集中度</span>
            <span class="stat-value" id="concentration">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">主力成本</span>
            <span class="stat-value" id="main-cost">--</span>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-label">获利盘</span>
            <span class="stat-value profit" id="profit-ratio">--</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">套牢盘</span>
            <span class="stat-value loss" id="loss-ratio">--</span>
          </div>
        </div>
      </div>

      <div class="chip-legend">
        <div class="legend-item">
          <div class="legend-color profit"></div>
          <span>获利盘</span>
        </div>
        <div class="legend-item">
          <div class="legend-color loss"></div>
          <span>套牢盘</span>
        </div>
        <div class="legend-item">
          <div class="legend-color peak"></div>
          <span>筹码峰</span>
        </div>
      </div>

      <button id="chip-settings-btn" class="chip-settings-btn">⚙️ 筹码设置</button>
    `;
  }

  /**
   * 设置弹窗 HTML
   */
  private getModalHTML(): string {
    return `
      <div class="modal-content">
        <div class="modal-header">
          <h3>筹码峰设置</h3>
          <span class="modal-close">&times;</span>
        </div>

        <div class="modal-body">
          <!-- 回溯天数 -->
          <div class="setting-group">
            <label class="setting-label">回溯天数</label>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <input type="number" id="lookback-days" class="setting-input"
                     value="90" min="1" max="9999" style="flex: 1;">
              <label style="display: flex; align-items: center; gap: 5px; color: #d1d4dc; font-size: 13px; cursor: pointer; white-space: nowrap;">
                <input type="checkbox" id="use-all-history" style="cursor: pointer;">
                全部历史
              </label>
            </div>
            <p class="setting-desc">限制参与筹码计算的历史数据范围（勾选"全部历史"则使用所有数据）</p>
          </div>

          <!-- 算法选择 -->
          <div class="setting-group">
            <label class="setting-label">衰减算法</label>
            <select id="decay-algorithm" class="setting-select">
              <option value="cumulative" selected>简单累积（无衰减）</option>
              <option value="exponential_decay">指数衰减</option>
              <option value="linear_decay">线性衰减</option>
            </select>
            <p class="setting-desc">筹码的时间衰减方式，模拟换手转移</p>
          </div>

          <!-- 衰减率 -->
          <div class="setting-group">
            <label class="setting-label">
              衰减率 <span id="decay-rate-display">0.05</span>
            </label>
            <input type="range" id="decay-rate" class="setting-slider"
                   min="0" max="0.2" step="0.01" value="0.05">
            <p class="setting-desc">衰减速度，值越大历史筹码消失越快</p>
          </div>

          <!-- 价格档位数 -->
          <div class="setting-group">
            <label class="setting-label">价格档位数</label>
            <input type="number" id="num-bins" class="setting-input"
                   min="20" max="100" step="10" value="50">
            <p class="setting-desc">筹码分布的精细度，建议30-70之间</p>
          </div>
        </div>

        <div class="modal-footer">
          <button id="reset-settings-btn" class="btn-secondary">恢复默认</button>
          <button id="apply-settings-btn" class="btn-primary">应用设置</button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件监听
   */
  private bindEvents(): void {
    const modal = this.modal!;
    const settingsBtn = document.getElementById('chip-settings-btn');
    const closeBtn = modal.querySelector('.modal-close');
    const applyBtn = document.getElementById('apply-settings-btn');
    const resetBtn = document.getElementById('reset-settings-btn');

    const lookbackDaysInput = document.getElementById('lookback-days') as HTMLInputElement;
    const useAllHistoryCheckbox = document.getElementById('use-all-history') as HTMLInputElement;
    const decayRateSlider = document.getElementById('decay-rate') as HTMLInputElement;
    const decayRateDisplay = document.getElementById('decay-rate-display');

    if (!settingsBtn || !closeBtn || !applyBtn || !resetBtn) {
      console.warn('筹码设置面板元素未找到');
      return;
    }

    // 打开弹窗
    settingsBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });

    // 关闭弹窗
    const closeModal = () => {
      modal.classList.remove('active');
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // 回溯天数与"全部历史"联动
    useAllHistoryCheckbox.addEventListener('change', () => {
      lookbackDaysInput.disabled = useAllHistoryCheckbox.checked;
    });

    // 衰减率实时显示
    decayRateSlider.addEventListener('input', () => {
      if (decayRateDisplay) {
        decayRateDisplay.textContent = decayRateSlider.value;
      }
    });

    // 应用设置
    applyBtn.addEventListener('click', () => {
      this.applySettings();
      closeModal();
    });

    // 恢复默认
    resetBtn.addEventListener('click', () => {
      this.resetSettings();
    });
  }

  /**
   * 读取当前表单配置
   */
  getOptions(): ChipOptions {
    const lookbackDaysInput = document.getElementById('lookback-days') as HTMLInputElement;
    const useAllHistoryCheckbox = document.getElementById('use-all-history') as HTMLInputElement;
    const algorithmSelect = document.getElementById('decay-algorithm') as HTMLSelectElement;
    const decayRateSlider = document.getElementById('decay-rate') as HTMLInputElement;
    const numBinsInput = document.getElementById('num-bins') as HTMLInputElement;

    return {
      lookbackDays: useAllHistoryCheckbox.checked ? 'all' : parseInt(lookbackDaysInput.value),
      decayAlgorithm: algorithmSelect.value as 'cumulative' | 'exponential_decay' | 'linear_decay',
      decayRate: parseFloat(decayRateSlider.value),
      numBins: parseInt(numBinsInput.value),
    };
  }

  /**
   * 应用设置（触发回调）
   */
  private applySettings(): void {
    const newOptions = this.getOptions();

    // 触发自定义事件，让 main.ts 监听并处理
    const event = new CustomEvent('chipSettingsChanged', { detail: newOptions });
    window.dispatchEvent(event);

    console.log('✓ 筹码设置已应用:', newOptions);
  }

  /**
   * 恢复默认设置
   */
  private resetSettings(): void {
    const lookbackDaysInput = document.getElementById('lookback-days') as HTMLInputElement;
    const useAllHistoryCheckbox = document.getElementById('use-all-history') as HTMLInputElement;
    const algorithmSelect = document.getElementById('decay-algorithm') as HTMLSelectElement;
    const decayRateSlider = document.getElementById('decay-rate') as HTMLInputElement;
    const decayRateDisplay = document.getElementById('decay-rate-display');
    const numBinsInput = document.getElementById('num-bins') as HTMLInputElement;

    lookbackDaysInput.value = '90';
    useAllHistoryCheckbox.checked = false;
    lookbackDaysInput.disabled = false;
    algorithmSelect.value = 'cumulative';
    decayRateSlider.value = '0.05';
    if (decayRateDisplay) decayRateDisplay.textContent = '0.05';
    numBinsInput.value = '50';

    console.log('✓ 筹码设置已恢复默认');
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
    }
    if (this.modal) {
      this.modal.remove();
    }
    chipManager.destroy();
    console.log('✓ ChipPanel 组件已销毁');
  }
}

// 导出单例
export const chipPanel = new ChipPanel();
