/**
 * Indicator Configuration Manager
 * 统一管理所有指标的配置，作为唯一数据源 (Single Source of Truth)
 */

// ==================== 类型定义 ====================

interface IndicatorConfig {
  enabled: boolean;       // 是否启用该指标
  visible: boolean;       // 是否在图表上可见
  parameters: Record<string, any>;  // 指标参数
}

interface ConfigFile {
  version: string;
  indicators: Record<string, IndicatorConfig>;
}

// ==================== 配置管理器 ====================

class IndicatorConfigManager {
  private config: ConfigFile | null = null;
  private readonly CONFIG_URL = '/config/indicators.config.json';
  private readonly SAVE_API_URL = '/api/v1/config/indicators';

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<void> {
    try {
      console.log('📂 加载指标配置文件...');
      const response = await fetch(this.CONFIG_URL);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }
      this.config = await response.json();
      console.log('✅ 配置文件加载成功:', this.config);
    } catch (error) {
      console.error('❌ 加载配置文件失败:', error);
      throw error;
    }
  }

  /**
   * 保存配置文件到服务器（持久化到本地 JSON 文件）
   */
  async saveConfig(): Promise<void> {
    try {
      console.log('💾 保存配置文件到服务器...');
      const response = await fetch(this.SAVE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.config),
      });

      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 配置文件保存成功:', result);
    } catch (error) {
      console.error('❌ 保存配置文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有启用的指标 ID 列表
   */
  getEnabledIndicators(): string[] {
    if (!this.config) return [];
    return Object.entries(this.config.indicators)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([id, _]) => id);
  }

  /**
   * 获取指标配置
   */
  getIndicatorConfig(indicatorId: string): IndicatorConfig | null {
    if (!this.config) return null;
    return this.config.indicators[indicatorId] || null;
  }

  /**
   * 获取指标参数
   */
  getIndicatorParams(indicatorId: string): Record<string, any> {
    const config = this.getIndicatorConfig(indicatorId);
    return config?.parameters || {};
  }

  /**
   * 更新指标参数（内存 + 持久化）
   */
  async updateIndicatorParams(
    indicatorId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    if (!this.config) throw new Error('Config not loaded');

    if (this.config.indicators[indicatorId]) {
      // 更新内存中的配置
      this.config.indicators[indicatorId].parameters = parameters;
      console.log(`📝 更新指标参数 [${indicatorId}]:`, parameters);

      // 持久化到文件
      await this.saveConfig();
    } else {
      console.warn(`⚠️ 指标不存在: ${indicatorId}`);
    }
  }

  /**
   * 切换指标启用状态（内存 + 持久化）
   */
  async toggleIndicator(indicatorId: string, enabled: boolean): Promise<void> {
    if (!this.config) throw new Error('Config not loaded');

    if (this.config.indicators[indicatorId]) {
      this.config.indicators[indicatorId].enabled = enabled;
      console.log(`🔄 切换指标 [${indicatorId}]: ${enabled ? '启用' : '禁用'}`);

      // 持久化到文件
      await this.saveConfig();
    }
  }

  /**
   * 切换指标可见性（内存 + 持久化）
   */
  async toggleVisibility(indicatorId: string, visible: boolean): Promise<void> {
    if (!this.config) throw new Error('Config not loaded');

    if (this.config.indicators[indicatorId]) {
      this.config.indicators[indicatorId].visible = visible;
      console.log(`👁️ 切换指标可见性 [${indicatorId}]: ${visible ? '显示' : '隐藏'}`);

      // 持久化到文件
      await this.saveConfig();
    }
  }

  /**
   * 构建 API 查询字符串
   * 格式: ma:sma:5,20,60;kdj:9-3-3;macd:12-26-9
   */
  buildQueryString(): string {
    if (!this.config) return '';

    const parts: string[] = [];
    const indicators = this.config.indicators;

    // MA 指标
    if (indicators.ma?.enabled) {
      const params = indicators.ma.parameters;
      const periods: number[] = [];

      // 只检查 period > 0，不检查颜色
      if (params.period1 && params.period1 > 0) {
        periods.push(params.period1);
      }
      if (params.period2 && params.period2 > 0) {
        periods.push(params.period2);
      }
      if (params.period3 && params.period3 > 0) {
        periods.push(params.period3);
      }

      if (periods.length > 0) {
        const maType = params.ma_type || 'sma';  // 默认为 SMA
        parts.push(`ma:${maType}:${periods.join(',')}`);
      }
    }

    // MACD 指标
    if (indicators.macd?.enabled) {
      const p = indicators.macd.parameters;
      parts.push(`macd:${p.fast_period}-${p.slow_period}-${p.signal_period}`);
    }

    // KDJ 指标
    if (indicators.kdj?.enabled) {
      const p = indicators.kdj.parameters;
      parts.push(`kdj:${p.n}-${p.m1}-${p.m2}`);
    }

    // RSI 指标
    if (indicators.rsi?.enabled) {
      const p = indicators.rsi.parameters;
      parts.push(`rsi:${p.period}`);
    }

    // BOLL 指标
    if (indicators.boll?.enabled) {
      const p = indicators.boll.parameters;
      parts.push(`boll:${p.period}-${p.std_dev}`);
    }

    const queryString = parts.join(';');
    console.log(`🔨 构建查询字符串: ${queryString}`);
    return queryString;
  }

  /**
   * 获取 MA 颜色和周期信息（供渲染使用）
   */
  getMaRenderInfo(): { periods: number[]; colors: string[] } {
    if (!this.config) return { periods: [], colors: [] };

    const maConfig = this.config.indicators.ma;
    if (!maConfig?.enabled) return { periods: [], colors: [] };

    const params = maConfig.parameters;
    const periods: number[] = [];
    const colors: string[] = [];

    // 只检查 period > 0，不检查颜色
    if (params.period1 && params.period1 > 0) {
      periods.push(params.period1);
      colors.push(params.color1);
    }
    if (params.period2 && params.period2 > 0) {
      periods.push(params.period2);
      colors.push(params.color2);
    }
    if (params.period3 && params.period3 > 0) {
      periods.push(params.period3);
      colors.push(params.color3);
    }

    return { periods, colors };
  }

  /**
   * 检查指标是否启用
   */
  isIndicatorEnabled(indicatorId: string): boolean {
    return this.config?.indicators[indicatorId]?.enabled || false;
  }

  /**
   * 检查指标是否可见
   */
  isIndicatorVisible(indicatorId: string): boolean {
    return this.config?.indicators[indicatorId]?.visible || false;
  }
}

// 导出单例
export const indicatorConfigManager = new IndicatorConfigManager();
