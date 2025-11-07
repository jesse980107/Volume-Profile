# 筹码峰面板重构总结

## 🎯 重构目标

将原本散落在 `index.html` 和 `main.ts` 中的筹码峰 UI 和逻辑重构为**独立的 chipPanel 组件**，实现模块化设计。

---

## 📦 重构内容

### 1. 新增文件

**`frontend/src/components/chipPanel.ts`** - 筹码峰面板组件

```
职责：
✓ 动态生成右侧筹码面板的完整 HTML 结构
✓ 动态生成设置弹窗的 HTML 结构
✓ 管理所有 UI 交互（打开/关闭弹窗、表单验证）
✓ 通过自定义事件与 main.ts 通信
✓ 提供 getOptions() 方法供外部读取配置
✓ 初始化时自动调用 chipManager.init()
```

---

### 2. 修改文件

#### `frontend/src/main.ts`

**删除的代码：**
- ❌ `function getChipSettingsFromUI()` - 移至 `chipPanel.getOptions()`
- ❌ `function setupChipSettings()` - 移至 `chipPanel.bindEvents()`
- ❌ 所有手动操作 DOM 元素的代码（`document.getElementById` 查找筹码面板元素）

**新增的代码：**
- ✅ `import { chipPanel } from './components/chipPanel'`
- ✅ `function setupChipSettingsHandler()` - 监听组件触发的 `chipSettingsChanged` 事件

**修改的代码：**
```typescript
// 旧代码
chipManager.init();
setupChipDistributionSync();
setupChipSettings();

// 新代码
chipPanel.init('.chart-row');     // 自动渲染 HTML + 初始化 chipManager
setupChipDistributionSync();      // 设置与 Lightweight Charts 的联动
setupChipSettingsHandler();       // 监听设置变更事件
```

```typescript
// 旧代码
const options = getChipSettingsFromUI();

// 新代码
const options = chipPanel.getOptions();
```

---

#### `frontend/index.html`

**删除的内容：**
- ❌ 整个 `<div id="chip-panel" class="chip-panel">...</div>` 结构（~60 行）
- ❌ 整个 `<div id="chip-settings-modal" class="modal">...</div>` 结构（~50 行）

**保留的内容：**
```html
<div class="chart-row">
  <!-- 左侧：TradingView 图表 -->
  <div class="chart-main-wrapper">...</div>

  <!-- 右侧：筹码峰面板会由 chipPanel 组件动态插入 -->
</div>
```

---

## 🏗️ 新架构

### 组件化结构

```
┌─────────────────────────────────────────────────┐
│              main.ts (主应用)                    │
│  ┌──────────────────────────────────────────┐  │
│  │ chipPanel.init('.chart-row')             │  │
│  │   ↓                                      │  │
│  │ 1. 动态创建 DOM 元素                      │  │
│  │ 2. 调用 chipManager.init()               │  │
│  │ 3. 绑定事件监听                           │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  监听自定义事件：                                │
│  window.addEventListener('chipSettingsChanged') │
│     ↓                                           │
│  chipCalculator.updateOptions(newOptions)      │
│  chipCalculator.precomputeAll()                │
│  chipManager.updateGlobal(chipData)            │
└─────────────────────────────────────────────────┘
          ↑ 触发事件
┌─────────────────────────────────────────────────┐
│       chipPanel.ts (组件内部)                   │
│  ┌──────────────────────────────────────────┐  │
│  │ 用户点击"应用设置"                          │  │
│  │   ↓                                      │  │
│  │ this.applySettings()                     │  │
│  │   ↓                                      │  │
│  │ window.dispatchEvent(                    │  │
│  │   new CustomEvent('chipSettingsChanged') │  │
│  │ )                                        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

### 数据流

```
用户操作
  ↓
chipPanel 表单元素
  ↓
chipPanel.applySettings()
  ↓
触发 CustomEvent('chipSettingsChanged', { detail: newOptions })
  ↓
main.ts: setupChipSettingsHandler() 监听事件
  ↓
chipCalculator.updateOptions(newOptions)
chipCalculator.precomputeAll()
  ↓
chipManager.updateGlobal(chipData)
  ↓
ECharts 图表更新
```

---

## ✅ 优势

### 1. **模块化**
- 筹码面板的 HTML、CSS、JS 逻辑完全封装在 `chipPanel` 组件内
- `main.ts` 不再需要知道面板的 DOM 结构细节

### 2. **可复用性**
- 可以轻松在其他页面复用 `chipPanel` 组件
- 只需 `chipPanel.init(parentSelector)` 即可

### 3. **可维护性**
- 修改筹码面板 UI/交互逻辑，只需编辑 `chipPanel.ts`
- 不会影响 `main.ts` 的其他代码

### 4. **事件驱动**
- 组件与主应用通过**自定义事件**通信，松耦合
- 符合现代前端架构模式

### 5. **类型安全**
- `chipPanel.getOptions()` 返回 `ChipOptions` 类型
- TypeScript 保证类型正确性

---

## 🧪 测试要点

1. **初始化测试**
   - 页面加载后，右侧是否正确渲染筹码面板
   - 筹码峰图表是否正确显示

2. **设置面板测试**
   - 点击 "⚙️ 筹码设置" 按钮，弹窗是否正确打开
   - 修改回溯天数、算法、衰减率，点击"应用设置"，是否正确重新计算
   - 点击"恢复默认"，是否正确重置为默认值

3. **联动测试**
   - 鼠标悬停在 K 线上，筹码峰图表是否实时更新
   - 获利盘/套牢盘比例是否正确显示

4. **销毁测试**
   - 调用 `chipPanel.destroy()` 后，DOM 元素是否被移除
   - ECharts 实例是否正确销毁

---

## 📝 API 文档

### `chipPanel.init(parentSelector: string)`

初始化组件，动态渲染 HTML 并绑定事件。

**参数：**
- `parentSelector`: 父容器选择器（默认 `.chart-row`）

**示例：**
```typescript
chipPanel.init('.chart-row');
```

---

### `chipPanel.getOptions(): ChipOptions`

读取当前表单配置。

**返回值：**
```typescript
{
  lookbackDays: number | 'all',
  decayAlgorithm: 'cumulative' | 'exponential_decay' | 'linear_decay',
  decayRate: number,
  numBins: number
}
```

**示例：**
```typescript
const options = chipPanel.getOptions();
chipCalculator.updateOptions(options);
```

---

### `chipPanel.destroy()`

销毁组件，移除 DOM 元素并释放资源。

**示例：**
```typescript
chipPanel.destroy();
```

---

### 自定义事件：`chipSettingsChanged`

当用户点击"应用设置"时触发。

**监听方式：**
```typescript
window.addEventListener('chipSettingsChanged', (event: Event) => {
  const customEvent = event as CustomEvent<ChipOptions>;
  const newOptions = customEvent.detail;
  // 处理配置变更...
});
```

---

## 🔮 未来扩展

1. **支持主题切换**
   - 在组件内部添加 `setTheme(theme: 'light' | 'dark')` 方法

2. **支持配置持久化**
   - 将用户配置保存到 `localStorage`
   - 初始化时自动加载

3. **支持多筹码面板**
   - 允许同时显示多个股票的筹码分布对比

4. **添加导出功能**
   - 导出筹码分布数据为 CSV/JSON
   - 导出 ECharts 图表为图片

---

## 📚 相关文件

- **组件文件**: `frontend/src/components/chipPanel.ts`
- **计算引擎**: `frontend/src/services/chipCalculator.ts`
- **可视化管理**: `frontend/src/services/chipManager.ts`
- **主应用**: `frontend/src/main.ts`
- **页面结构**: `frontend/index.html`
- **样式**: `frontend/css/chip.css`

---

**重构完成时间**: 2025-11-06
**重构人**: Claude Code
**测试状态**: ✅ 待测试
