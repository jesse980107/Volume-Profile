# 📊 可配置指标系统设计文档

## 🎯 核心设计理念

**配置驱动的UI系统（Configuration-driven UI）**

- 后端定义每个指标的**参数Schema**（类型、范围、默认值）
- 前端根据Schema**自动生成设置面板**，无需为每个指标写UI代码
- 用户修改参数后，**重新请求API**获取新数据
- MA指标特殊处理：支持**多周期同时显示**在一个Bar中

---

## 📐 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                     用户操作                              │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │ 点击 "Indicators"  │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────────────┐
        │ 1. 获取指标配置 Schema     │
        │    GET /api/v1/indicators  │
        └─────────┬─────────────────┘
                  │
        ┌─────────▼──────────────────────────┐
        │ 2. 显示 Indicator Modal            │
        │    （列表：MA, MACD, KDJ, RSI...） │
        └─────────┬──────────────────────────┘
                  │
        ┌─────────▼─────────────────────────────┐
        │ 3. 用户选择 "MA"                       │
        │    → 打开设置面板                      │
        │    → 根据Schema自动生成表单            │
        └─────────┬─────────────────────────────┘
                  │
        ┌─────────▼──────────────────────────────┐
        │ 4. 用户配置参数                         │
        │    ☑ 5日线   颜色: [🔴 红]            │
        │    ☑ 20日线  颜色: [🔵 蓝]            │
        │    ☑ 60日线  颜色: [🟢 绿]            │
        └─────────┬──────────────────────────────┘
                  │
        ┌─────────▼────────────────────────────────────┐
        │ 5. 请求数据                                   │
        │    GET /api/v1/stock/000155.sz?               │
        │        indicators=ma:5:red,ma:20:blue,ma:60:green │
        └─────────┬────────────────────────────────────┘
                  │
        ┌─────────▼─────────────────────┐
        │ 6. 后端计算 MA5/MA20/MA60      │
        │    返回：{sma5: [...], ...}    │
        └─────────┬─────────────────────┘
                  │
        ┌─────────▼──────────────────────────┐
        │ 7. 前端渲染                         │
        │    - 图表显示3条MA线（不同颜色）     │
        │    - Bar显示：MA(5,20,60)  11.5 12.3 13.1 │
        └─────────────────────────────────────┘
```

---

## 🔧 后端设计

### **1. 指标配置Schema定义**

```python
# backend/services/indicators/base.py

from enum import Enum
from typing import List, Any, Dict, Optional
from pydantic import BaseModel


class ParameterType(str, Enum):
    """参数类型枚举"""
    NUMBER = "number"      # 数字输入框
    COLOR = "color"        # 颜色选择器
    SELECT = "select"      # 下拉框
    BOOLEAN = "boolean"    # 开关
    MULTI_PERIOD = "multi_period"  # 🆕 多周期选择（MA专用）


class ParameterOption(BaseModel):
    """下拉框选项"""
    value: Any
    label: str


class IndicatorParameter(BaseModel):
    """指标参数定义"""
    name: str                          # 参数名，如 "period"
    type: ParameterType                # 参数类型
    label: str                         # 显示标签，如 "周期"
    default: Any                       # 默认值
    min: Optional[int] = None          # number类型：最小值
    max: Optional[int] = None          # number类型：最大值
    step: Optional[float] = None       # number类型：步长
    options: Optional[List[ParameterOption]] = None  # select类型：选项列表
    description: Optional[str] = None  # 参数说明


class IndicatorMetadata(BaseModel):
    """指标元数据"""
    id: str                            # 指标唯一ID，如 "ma"
    name: str                          # 显示名称，如 "Moving Average"
    category: str                      # 分类：'overlay', 'oscillator', 'volume'
    description: str                   # 指标说明
    parameters: List[IndicatorParameter]  # 参数列表
    display_template: str              # Bar显示模板类型
    supports_multiple: bool = False    # 是否支持多实例（MA特殊）


class IndicatorConfig(BaseModel):
    """用户的指标配置实例"""
    indicator_id: str                  # 指标类型，如 "ma"
    instance_id: str                   # 实例唯一ID，如 "ma-uuid1"
    parameters: Dict[str, Any]         # 用户配置的参数值
```

---

### **2. MA指标配置示例**

```python
# backend/services/indicators/moving_average.py

MA_METADATA = IndicatorMetadata(
    id="ma",
    name="Moving Average",
    category="overlay",
    description="移动平均线，显示价格趋势",
    supports_multiple=True,  # 🔑 MA支持多周期
    display_template="ma-multi",  # 🔑 特殊的显示模板
    parameters=[
        IndicatorParameter(
            name="periods",
            type=ParameterType.MULTI_PERIOD,  # 🔑 多周期选择
            label="周期",
            default=[5, 20, 60],
            description="可同时选择多个周期",
            options=[  # 预设选项
                ParameterOption(value=5, label="5日"),
                ParameterOption(value=10, label="10日"),
                ParameterOption(value=20, label="20日"),
                ParameterOption(value=60, label="60日"),
                ParameterOption(value=120, label="120日"),
                ParameterOption(value=250, label="250日"),
            ]
        ),
        IndicatorParameter(
            name="colors",
            type=ParameterType.COLOR,
            label="颜色配置",
            default={
                "5": "#FF6B6B",
                "10": "#4ECDC4",
                "20": "#45B7D1",
                "60": "#FFA07A",
                "120": "#95E1D3",
                "250": "#F38181"
            },
            description="每个周期的线条颜色"
        ),
        IndicatorParameter(
            name="lineWidth",
            type=ParameterType.NUMBER,
            label="线宽",
            default=2,
            min=1,
            max=5,
            step=1
        ),
        IndicatorParameter(
            name="lineStyle",
            type=ParameterType.SELECT,
            label="线型",
            default="solid",
            options=[
                ParameterOption(value="solid", label="实线"),
                ParameterOption(value="dashed", label="虚线"),
                ParameterOption(value="dotted", label="点线"),
            ]
        )
    ]
)
```

---

### **3. KDJ指标配置示例**

```python
# backend/services/indicators/kdj.py

KDJ_METADATA = IndicatorMetadata(
    id="kdj",
    name="KDJ",
    category="oscillator",
    description="随机指标，判断超买超卖",
    supports_multiple=False,  # 🔑 KDJ只能添加一个实例
    display_template="kdj-triple",  # 🔑 显示3个值
    parameters=[
        IndicatorParameter(
            name="fastk_period",
            type=ParameterType.NUMBER,
            label="K周期",
            default=9,
            min=1,
            max=100,
            description="RSV计算周期"
        ),
        IndicatorParameter(
            name="slowk_period",
            type=ParameterType.NUMBER,
            label="K平滑",
            default=3,
            min=1,
            max=20
        ),
        IndicatorParameter(
            name="slowd_period",
            type=ParameterType.NUMBER,
            label="D平滑",
            default=3,
            min=1,
            max=20
        ),
        IndicatorParameter(
            name="k_color",
            type=ParameterType.COLOR,
            label="K线颜色",
            default="#2962FF"
        ),
        IndicatorParameter(
            name="d_color",
            type=ParameterType.COLOR,
            label="D线颜色",
            default="#FF6D00"
        ),
        IndicatorParameter(
            name="j_color",
            type=ParameterType.COLOR,
            label="J线颜色",
            default="#00C853"
        )
    ]
)
```

---

### **4. 指标注册表**

```python
# backend/services/indicators/registry.py

from .moving_average import MA_METADATA
from .kdj import KDJ_METADATA
from .macd import MACD_METADATA
from .rsi import RSI_METADATA
from .bollinger import BOLL_METADATA

INDICATOR_REGISTRY: Dict[str, IndicatorMetadata] = {
    "ma": MA_METADATA,
    "kdj": KDJ_METADATA,
    "macd": MACD_METADATA,
    "rsi": RSI_METADATA,
    "boll": BOLL_METADATA,
}


def get_indicator_metadata(indicator_id: str) -> IndicatorMetadata:
    """获取指标元数据"""
    return INDICATOR_REGISTRY.get(indicator_id)


def get_all_indicators() -> List[IndicatorMetadata]:
    """获取所有指标元数据"""
    return list(INDICATOR_REGISTRY.values())
```

---

### **5. API端点**

```python
# backend/api/routes/indicators.py

from fastapi import APIRouter
from backend.services.indicators.registry import get_all_indicators, get_indicator_metadata

router = APIRouter(prefix="/indicators", tags=["indicators"])


@router.get("/", response_model=List[IndicatorMetadata])
async def list_indicators():
    """
    获取所有指标的配置Schema
    前端用这个接口来自动生成设置面板
    """
    return get_all_indicators()


@router.get("/{indicator_id}", response_model=IndicatorMetadata)
async def get_indicator(indicator_id: str):
    """
    获取单个指标的配置Schema
    """
    metadata = get_indicator_metadata(indicator_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return metadata
```

---

### **6. 修改股票数据API支持动态指标**

```python
# backend/api/routes/stock.py

@router.get("/{symbol}", response_model=StockDataResponse)
async def get_stock_data(
    symbol: str,
    interval: TimeframeType = Query(default="daily"),
    indicators: str = Query(default="", description="指标配置，格式：ma:5:red,ma:20:blue,kdj:9-3-3")
):
    """
    获取股票数据及技术指标

    indicators参数格式：
    - MA: ma:5:red,ma:20:blue  （周期:颜色，可多个）
    - KDJ: kdj:9-3-3  （fastk-slowk-slowd）
    - MACD: macd:12-26-9  （fast-slow-signal）
    - RSI: rsi:14
    """
    # 加载数据
    df = await data_service.load_stock_data(symbol)

    # 解析indicators参数
    indicator_configs = parse_indicator_params(indicators)

    # 根据用户配置计算指标
    for config in indicator_configs:
        if config.type == "ma":
            df = calculate_sma(df, config.period)
        elif config.type == "kdj":
            df = calculate_kdj(df, config.fastk, config.slowk, config.slowd)
        # ...

    return build_response(df, symbol, indicator_configs)
```

---

## 🎨 前端设计

### **1. 项目结构**

```
frontend/src/components/indicators/
├── base/
│   ├── IndicatorSettingsPanel.ts   # 🔑 通用设置面板（根据Schema渲染）
│   ├── IndicatorBarRenderer.ts     # 🔑 Bar渲染器（根据模板渲染）
│   └── types.ts                    # TypeScript类型定义
│
├── templates/
│   ├── SingleValueBar.ts           # Bar模板：单个值（如RSI）
│   ├── MAMultiBar.ts               # Bar模板：MA多周期
│   ├── KDJTripleBar.ts             # Bar模板：KDJ三值
│   └── MACDBar.ts                  # Bar模板：MACD
│
├── indicatorModal.ts               # Indicator Modal（添加指标）
├── indicatorBarList.ts             # Bar List（重构，支持模板）
└── index.ts
```

---

### **2. 通用设置面板**

```typescript
// frontend/src/components/indicators/base/IndicatorSettingsPanel.ts

import type { IndicatorMetadata, IndicatorParameter } from './types';

export class IndicatorSettingsPanel {
  private modalElement: HTMLDivElement | null = null;
  private metadata: IndicatorMetadata;
  private currentConfig: Record<string, any> = {};
  private onApplyCallback: ((config: Record<string, any>) => void) | null = null;

  constructor(metadata: IndicatorMetadata) {
    this.metadata = metadata;

    // 初始化默认配置
    metadata.parameters.forEach(param => {
      this.currentConfig[param.name] = param.default;
    });
  }

  /**
   * 根据参数类型渲染表单字段
   */
  private renderParameter(param: IndicatorParameter): HTMLElement {
    const container = document.createElement('div');
    container.className = 'indicator-param-field';

    const label = document.createElement('label');
    label.textContent = param.label;
    container.appendChild(label);

    let input: HTMLElement;

    switch (param.type) {
      case 'number':
        input = this.createNumberInput(param);
        break;
      case 'color':
        input = this.createColorPicker(param);
        break;
      case 'select':
        input = this.createSelectBox(param);
        break;
      case 'boolean':
        input = this.createCheckbox(param);
        break;
      case 'multi_period':
        input = this.createMultiPeriodSelector(param);  // 🔑 MA专用
        break;
      default:
        input = this.createTextInput(param);
    }

    container.appendChild(input);

    if (param.description) {
      const desc = document.createElement('small');
      desc.className = 'param-description';
      desc.textContent = param.description;
      container.appendChild(desc);
    }

    return container;
  }

  /**
   * 创建数字输入框
   */
  private createNumberInput(param: IndicatorParameter): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'indicator-param-input';
    input.value = String(this.currentConfig[param.name]);

    if (param.min !== undefined) input.min = String(param.min);
    if (param.max !== undefined) input.max = String(param.max);
    if (param.step !== undefined) input.step = String(param.step);

    input.addEventListener('change', () => {
      this.currentConfig[param.name] = parseFloat(input.value);
    });

    return input;
  }

  /**
   * 创建颜色选择器
   */
  private createColorPicker(param: IndicatorParameter): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'indicator-param-color';
    input.value = this.currentConfig[param.name];

    input.addEventListener('change', () => {
      this.currentConfig[param.name] = input.value;
    });

    return input;
  }

  /**
   * 创建下拉框
   */
  private createSelectBox(param: IndicatorParameter): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'indicator-param-select';

    param.options?.forEach(option => {
      const opt = document.createElement('option');
      opt.value = String(option.value);
      opt.textContent = option.label;
      if (option.value === this.currentConfig[param.name]) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      this.currentConfig[param.name] = select.value;
    });

    return select;
  }

  /**
   * 🔑 创建多周期选择器（MA专用）
   */
  private createMultiPeriodSelector(param: IndicatorParameter): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'multi-period-selector';

    const selectedPeriods = this.currentConfig[param.name] || [];
    const colors = this.currentConfig['colors'] || {};

    param.options?.forEach(option => {
      const row = document.createElement('div');
      row.className = 'period-row';

      // 复选框
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedPeriods.includes(option.value);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selectedPeriods.push(option.value);
        } else {
          const index = selectedPeriods.indexOf(option.value);
          if (index > -1) selectedPeriods.splice(index, 1);
        }
        this.currentConfig[param.name] = selectedPeriods;
      });

      // 标签
      const label = document.createElement('span');
      label.textContent = option.label;

      // 颜色选择器
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = colors[String(option.value)] || '#000000';
      colorInput.addEventListener('change', () => {
        colors[String(option.value)] = colorInput.value;
        this.currentConfig['colors'] = colors;
      });

      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(colorInput);
      container.appendChild(row);
    });

    return container;
  }

  /**
   * 打开设置面板
   */
  open(): void {
    // 创建Modal HTML
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'indicator-settings-modal active';

    const content = document.createElement('div');
    content.className = 'indicator-settings-content';

    // 标题
    const header = document.createElement('div');
    header.className = 'indicator-settings-header';
    const title = document.createElement('h3');
    title.textContent = `${this.metadata.name} 设置`;
    header.appendChild(title);
    content.appendChild(header);

    // 参数表单
    const form = document.createElement('div');
    form.className = 'indicator-settings-form';
    this.metadata.parameters.forEach(param => {
      form.appendChild(this.renderParameter(param));
    });
    content.appendChild(form);

    // 按钮
    const actions = document.createElement('div');
    actions.className = 'indicator-settings-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.className = 'btn-cancel';
    cancelBtn.addEventListener('click', () => this.close());

    const applyBtn = document.createElement('button');
    applyBtn.textContent = '应用';
    applyBtn.className = 'btn-apply';
    applyBtn.addEventListener('click', () => this.handleApply());

    actions.appendChild(cancelBtn);
    actions.appendChild(applyBtn);
    content.appendChild(actions);

    this.modalElement.appendChild(content);
    document.body.appendChild(this.modalElement);
  }

  /**
   * 应用配置
   */
  private handleApply(): void {
    if (this.onApplyCallback) {
      this.onApplyCallback(this.currentConfig);
    }
    this.close();
  }

  /**
   * 关闭面板
   */
  close(): void {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }

  /**
   * 注册应用回调
   */
  onApply(callback: (config: Record<string, any>) => void): void {
    this.onApplyCallback = callback;
  }
}
```

---

### **3. Bar渲染模板**

```typescript
// frontend/src/components/indicators/templates/MAMultiBar.ts

/**
 * MA多周期Bar模板
 * 显示：MA(5,20,60)  11.5  12.3  13.1
 */
export class MAMultiBar {
  render(data: {
    periods: number[];      // [5, 20, 60]
    values: number[];       // [11.5, 12.3, 13.1]
  }): string {
    const periodsStr = data.periods.join(',');
    const valuesStr = data.values.map(v => v.toFixed(2)).join('  ');

    return `
      <span class="indicator-bar-name">MA(${periodsStr})</span>
      <span class="indicator-bar-value">${valuesStr}</span>
    `;
  }
}
```

```typescript
// frontend/src/components/indicators/templates/KDJTripleBar.ts

/**
 * KDJ三值Bar模板
 * 显示：KDJ  K:82.5  D:75.3  J:96.9
 */
export class KDJTripleBar {
  render(data: {
    k: number;
    d: number;
    j: number;
  }): string {
    return `
      <span class="indicator-bar-name">KDJ</span>
      <span class="indicator-bar-value">
        K:${data.k.toFixed(2)}
        D:${data.d.toFixed(2)}
        J:${data.j.toFixed(2)}
      </span>
    `;
  }
}
```

---

### **4. Bar渲染器（注册表）**

```typescript
// frontend/src/components/indicators/base/IndicatorBarRenderer.ts

import { MAMultiBar } from '../templates/MAMultiBar';
import { KDJTripleBar } from '../templates/KDJTripleBar';
import { SingleValueBar } from '../templates/SingleValueBar';
import { MACDBar } from '../templates/MACDBar';

const BAR_TEMPLATES = {
  'ma-multi': MAMultiBar,
  'kdj-triple': KDJTripleBar,
  'macd': MACDBar,
  'single-value': SingleValueBar,
};

export class IndicatorBarRenderer {
  static render(templateType: string, data: any): string {
    const TemplateClass = BAR_TEMPLATES[templateType];
    if (!TemplateClass) {
      console.error(`Unknown template: ${templateType}`);
      return '';
    }

    const template = new TemplateClass();
    return template.render(data);
  }
}
```

---

## 🔄 完整数据流

### **场景1：用户添加MA指标**

```
1. 页面加载
   ↓
   GET /api/v1/indicators/
   ← 返回所有指标的Schema

2. 用户点击 "Indicators" → 选择 "Moving Average"
   ↓
   打开 IndicatorSettingsPanel(MA_METADATA)
   ↓
   根据MA_METADATA自动渲染表单：
   - multi_period: 复选框列表（5/10/20/60...）
   - colors: 每个周期的颜色选择器
   - lineWidth: 数字输入框

3. 用户配置：
   ☑ 5日线   🔴 #FF6B6B
   ☑ 20日线  🔵 #45B7D1
   ☑ 60日线  🟢 #FFA07A
   点击"应用"

4. 前端构建API请求
   ↓
   GET /api/v1/stock/000155.sz?indicators=ma:5,20,60
   ← 返回 {sma5: [...], sma20: [...], sma60: [...]}

5. 前端渲染
   - 图表：显示3条MA线（不同颜色）
   - BarList：添加MA Bar
     ├─ 使用 MAMultiBar 模板
     ├─ 显示：MA(5,20,60)  11.5  12.3  13.1
     └─ 添加 ⚙️ 按钮（点击重新打开设置面板）
```

---

### **场景2：用户修改MA配置**

```
1. 用户点击 MA Bar 上的 ⚙️ 按钮
   ↓
   打开 IndicatorSettingsPanel
   ↓
   显示当前配置（5/20/60已勾选）

2. 用户修改：
   ☐ 5日线   （取消勾选）
   ☑ 20日线
   ☑ 60日线
   ☑ 120日线 🟡 #95E1D3 （新增）
   点击"应用"

3. 前端重新请求
   ↓
   GET /api/v1/stock/000155.sz?indicators=ma:20,60,120
   ← 返回新数据

4. 前端更新
   - 图表：隐藏MA5线，显示MA20/60/120线
   - Bar：更新显示 MA(20,60,120)  12.3  13.1  13.8
```

---

### **场景3：用户添加KDJ指标**

```
1. 用户点击 "Indicators" → 选择 "KDJ"
   ↓
   打开 IndicatorSettingsPanel(KDJ_METADATA)
   ↓
   渲染表单：
   - K周期: [9]
   - K平滑: [3]
   - D平滑: [3]
   - K线颜色: [🔵]
   - D线颜色: [🟠]
   - J线颜色: [🟢]

2. 用户点击"应用"（使用默认配置）
   ↓
   GET /api/v1/stock/000155.sz?indicators=ma:20,60,120,kdj:9-3-3

3. 前端渲染
   - 图表：创建KDJ pane，显示K/D/J三条线
   - BarList：添加KDJ Bar
     └─ 使用 KDJTripleBar 模板
     └─ 显示：KDJ  K:82.5  D:75.3  J:96.9
```

---

## 📊 API设计

### **端点1：获取指标配置**

```
GET /api/v1/indicators/

Response:
[
  {
    "id": "ma",
    "name": "Moving Average",
    "category": "overlay",
    "description": "移动平均线",
    "supports_multiple": true,
    "display_template": "ma-multi",
    "parameters": [
      {
        "name": "periods",
        "type": "multi_period",
        "label": "周期",
        "default": [5, 20, 60],
        "options": [
          {"value": 5, "label": "5日"},
          {"value": 10, "label": "10日"},
          ...
        ]
      },
      ...
    ]
  },
  {
    "id": "kdj",
    "name": "KDJ",
    ...
  }
]
```

---

### **端点2：获取股票数据（支持动态指标）**

```
GET /api/v1/stock/000155.sz?indicators=ma:5,20,60,kdj:9-3-3,rsi:14

参数格式：
- MA: ma:5,20,60  （多个周期用逗号分隔）
- KDJ: kdj:9-3-3  （fastk-slowk-slowd）
- MACD: macd:12-26-9
- RSI: rsi:14
- BOLL: boll:20-2.0

Response:
{
  "symbol": "000155.sz",
  "candlestick": [...],
  "volume": [...],
  "sma5": [...],
  "sma20": [...],
  "sma60": [...],
  "kdj": {
    "k": [...],
    "d": [...],
    "j": [...]
  },
  "rsi": [...]
}
```

---

## ✅ 总结

### **核心设计原则**

1. **配置驱动**：后端定义Schema，前端自动生成UI
2. **API动态参数**：用户修改参数后重新请求API
3. **MA特殊处理**：支持多周期，一个Bar显示所有值
4. **模板系统**：不同指标使用不同的Bar显示模板

---

### **技术栈**

**后端**：
- FastAPI + Pydantic（参数验证）
- TA-Lib（指标计算）
- 指标注册表（元数据管理）

**前端**：
- TypeScript（类型安全）
- 通用设置面板（自动生成表单）
- Bar模板系统（可扩展）

---

### **优势**

✅ **可扩展**：添加新指标只需定义Schema，无需写UI代码
✅ **灵活**：支持任意参数配置
✅ **用户友好**：类似TradingView的交互体验
✅ **类型安全**：前后端都有完整的类型定义
✅ **易维护**：参数配置集中管理

---

### **实现计划**

1. **第一阶段：后端**
   - 定义参数Schema基类
   - 为每个指标创建Metadata
   - 实现指标注册表
   - 添加 `/api/v1/indicators/` 端点
   - 修改股票API支持动态参数

2. **第二阶段：前端**
   - 创建 `IndicatorSettingsPanel` 通用组件
   - 创建Bar模板系统
   - 重构 `IndicatorBarList` 支持模板
   - 实现MA多周期支持

3. **第三阶段：集成测试**
   - 测试MA多周期添加/修改
   - 测试其他指标添加/修改
   - 测试API动态参数解析
   - 性能优化

---

**下一步：开始实现吗？** 🚀
