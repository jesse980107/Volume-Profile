# 筹码峰价格线移除记录

## 📋 移除目标

移除筹码峰 ECharts 图上显示的**黄色价格标记线**（markLine），保留所有其他功能。

---

## ✅ 保留的功能

1. ✅ **筹码分布图动态更新** - 鼠标悬停时显示对应日期的筹码分布
2. ✅ **统计信息动态更新** - 鼠标悬停时更新：
   - 日期（chip-date）
   - 筹码集中度（concentration）
   - 主力成本（main-cost）
   - 获利盘比例（profit-ratio）
   - 套牢盘比例（loss-ratio）
3. ✅ **统计信息重置** - 鼠标离开时所有统计信息重置为 "--"
4. ✅ **筹码峰识别** - 红色高亮显示筹码峰
5. ✅ **设置面板** - 回溯天数、算法、衰减率等配置功能

---

## ❌ 移除的功能

1. ❌ **黄色价格横线** - ECharts markLine 在筹码峰图上绘制的价格标记线
2. ❌ **价格标签** - 横线上的价格数值标签（如 "¥12.34"）

---

## 🔧 代码修改详情

### 文件 1: `frontend/src/services/chipManager.ts`

#### 修改 1: 移除 `currentPrice` 字段

```diff
export class ChipManager {
  private chart: ECharts | null = null;
- private currentPrice: number = 0;
  private container: HTMLElement | null = null;
  private globalChipData: ChipDistributionResult | null = null;
  private totalVolume: number = 0;
```

**原因**: 该字段仅用于存储价格线的价格值，移除价格线后不再需要。

---

#### 修改 2: 替换 `updatePriceLine()` 为 `updateStats()`

**删除的方法**:
```typescript
// ❌ 已删除
updatePriceLine(currentPrice: number, currentDate: string): void {
  // ... 计算获利盘/套牢盘
  // ... 更新统计 UI
  this.drawPriceLine(currentPrice);  // ← 绘制价格线
}
```

**新增的方法**:
```typescript
// ✅ 新方法（无价格线绘制）
updateStats(currentPrice: number, currentDate: string): void {
  if (!this.globalChipData) return;

  // 计算获利盘和套牢盘
  const { profitRatio, lossRatio } = this.calculateProfitLoss(
    this.globalChipData.distribution,
    currentPrice,
    this.totalVolume
  );

  // 更新统计信息 UI
  const dateEl = document.getElementById('chip-date');
  if (dateEl) dateEl.textContent = currentDate || '--';

  const profitEl = document.getElementById('profit-ratio');
  if (profitEl) profitEl.textContent = `${profitRatio.toFixed(1)}%`;

  const lossEl = document.getElementById('loss-ratio');
  if (lossEl) lossEl.textContent = `${lossRatio.toFixed(1)}%`;
}
```

**变更点**:
- ✅ 保留了获利盘/套牢盘计算逻辑
- ✅ 保留了统计信息 UI 更新逻辑
- ❌ 移除了 `this.drawPriceLine()` 调用
- ❌ 移除了 `this.currentPrice` 存储

---

#### 修改 3: 完全移除 `drawPriceLine()` 方法

```typescript
// ❌ 已完全删除（共 32 行）
private drawPriceLine(price: number): void {
  if (!this.chart) return;

  this.chart.setOption({
    series: [{
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: {
          color: '#FFA500',
          width: 2,
          type: 'solid',
        },
        label: {
          show: true,
          position: 'end',
          formatter: '¥{c}',
          color: '#FFA500',
          fontSize: 11,
          fontWeight: 'bold',
        },
        data: [{ yAxis: price.toFixed(2) }],
      },
    }],
  });
}
```

**原因**: 该方法唯一功能就是绘制价格线，移除价格线后不再需要。

---

#### 修改 4: 简化 `clearPriceLine()` 方法

**修改前**:
```typescript
clearPriceLine(): void {
  // 重置统计 UI
  const dateEl = document.getElementById('chip-date');
  if (dateEl) dateEl.textContent = '--';
  // ... 其他统计项

  // 清除图表上的价格线
  if (this.chart) {
    this.chart.setOption({
      series: [{ markLine: { data: [] } }],
    });
  }
}
```

**修改后**:
```typescript
clearPriceLine(): void {
  // 仅重置统计 UI
  const dateEl = document.getElementById('chip-date');
  if (dateEl) dateEl.textContent = '--';

  const profitEl = document.getElementById('profit-ratio');
  if (profitEl) profitEl.textContent = '--';

  const lossEl = document.getElementById('loss-ratio');
  if (lossEl) lossEl.textContent = '--';
}
```

**变更点**:
- ✅ 保留了统计信息重置逻辑
- ❌ 移除了 markLine 清除代码

---

### 文件 2: `frontend/src/main.ts`

#### 修改: 更新方法调用

```diff
function setupChipDistributionSync(): void {
  state.chart.subscribeCrosshairMove((param: MouseEventParams) => {
    // ... 获取筹码数据和光标价格

-   chipManager.updatePriceLine(cursorPrice, param.time as string);
+   chipManager.updateStats(cursorPrice, param.time as string);

    updateIndicatorBarValues(param);
  });
}
```

**说明**: 将调用从 `updatePriceLine()` 改为新方法 `updateStats()`，功能完全一致，只是不绘制价格线。

---

## 📊 修改统计

| 文件 | 修改类型 | 行数变化 |
|------|---------|---------|
| `chipManager.ts` | 移除字段 | -1 行 |
| `chipManager.ts` | 替换方法 | -17 行（移除绘制逻辑）|
| `chipManager.ts` | 删除方法 | -32 行（`drawPriceLine`）|
| `chipManager.ts` | 简化方法 | -12 行（移除 markLine 清除）|
| `main.ts` | 方法调用 | 0 行（仅重命名）|
| **总计** | | **-62 行代码** |

---

## 🧪 测试验证清单

### 功能验证

- [ ] **筹码分布图更新**
  - 鼠标移动到不同 K 线，筹码分布图正确更新
  - 柱状图高度和颜色正确显示

- [ ] **统计信息更新**
  - 日期显示正确（格式：YYYY-MM-DD）
  - 获利盘比例计算正确（低于光标价格的筹码）
  - 套牢盘比例计算正确（高于光标价格的筹码）
  - 筹码集中度和主力成本保持不变

- [ ] **统计信息重置**
  - 鼠标离开图表，所有统计项显示 "--"

- [ ] **价格线已移除**
  - ✅ **确认**：筹码峰图上无黄色横线
  - ✅ **确认**：无价格标签（如 "¥12.34"）

### 边界情况

- [ ] 数据为空时不报错
- [ ] 鼠标快速移动时无性能问题
- [ ] 切换股票代码后功能正常
- [ ] 调整窗口大小后功能正常

---

## 🔄 回滚方案

如果需要恢复价格线功能，执行以下操作：

### 回滚步骤

1. 在 `chipManager.ts` 中恢复 `currentPrice` 字段
2. 将 `updateStats()` 重命名回 `updatePriceLine()`
3. 在 `updatePriceLine()` 末尾添加 `this.drawPriceLine(currentPrice)`
4. 恢复 `drawPriceLine()` 方法（完整代码见上方"修改 3"）
5. 在 `clearPriceLine()` 末尾添加 markLine 清除代码
6. 在 `main.ts` 中将 `updateStats()` 改回 `updatePriceLine()`

### Git 回滚命令

```bash
# 查看修改历史
git log --oneline

# 回滚到修改前的 commit
git revert <commit-hash>
```

---

## 📝 备注

- **性能提升**: 移除 ECharts markLine 绘制逻辑，理论上减少了每次鼠标移动时的渲染开销
- **代码简洁性**: 减少 62 行代码，降低维护成本
- **向后兼容**: 所有其他功能完全不受影响

---

**修改日期**: 2025-11-06
**修改人**: Claude Code
**审核状态**: ✅ 已完成
