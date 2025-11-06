# 📊 技术指标库

所有技术指标的计算函数，基于 TA-Lib 实现。

## 📁 文件结构

```
indicators/
├── __init__.py           # 统一导出
├── moving_average.py     # SMA, EMA, WMA 等移动平均线
├── macd.py              # MACD 指标
├── kdj.py               # KDJ 指标
├── rsi.py               # RSI 指标
├── bollinger.py         # 布林带
└── README.md            # 本文件
```

## 🎯 设计理念

### **一个指标 = 一个文件 = 清晰的公式**

每个文件包含：
- 📝 详细的指标说明
- 📐 完整的计算公式
- 📊 参数说明
- 📈 交易信号解读
- ⚙️ 典型参数设置

## 🚀 使用方式

### 1️⃣ **直接调用指标函数**

```python
from backend.services.indicators import calculate_sma, calculate_macd
import pandas as pd

# 准备数据
df = pd.DataFrame({
    'close': [10.0, 10.5, 11.0, 10.8, 11.2],
    'high': [10.5, 11.0, 11.5, 11.0, 11.5],
    'low': [9.8, 10.0, 10.5, 10.5, 10.8]
})

# 计算 SMA5
df = calculate_sma(df, period=5)
print(df['SMA5'])

# 计算 MACD
df = calculate_macd(df)
print(df[['MACD', 'MACD_signal', 'MACD_hist']])
```

### 2️⃣ **通过注册表自动调用**

```python
from backend.services.indicator_registry import calculate_all_indicators

# 一次性计算所有注册的指标
df = calculate_all_indicators(df)
```

## ➕ 添加新指标 - 3步完成

### **Step 1: 创建指标文件**

在 `indicators/` 文件夹中创建新文件，例如 `atr.py`：

```python
"""
ATR 指标 (Average True Range)
平均真实波幅
"""
import pandas as pd
import talib


def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """
    计算 ATR 指标

    公式：
        TR = max(high - low, |high - close_prev|, |low - close_prev|)
        ATR = EMA(TR, period)

    Args:
        df: 包含 'high', 'low', 'close' 列的 DataFrame
        period: 计算周期，默认 14

    Returns:
        添加了 'ATR' 列的 DataFrame

    用途：
        - 衡量市场波动性
        - 设置止损位：价格 ± n * ATR
        - ATR 上升：波动加大
        - ATR 下降：波动减小
    """
    result = df.copy()
    result['ATR'] = talib.ATR(
        df['high'].values,
        df['low'].values,
        df['close'].values,
        timeperiod=period
    )
    return result
```

### **Step 2: 在 `__init__.py` 中导出**

```python
# indicators/__init__.py
from .atr import calculate_atr

__all__ = [
    # ... 其他指标
    'calculate_atr',
]
```

### **Step 3: 在注册表中注册**

```python
# indicator_registry.py
from .indicators import calculate_atr  # 导入

INDICATOR_REGISTRY.append(
    IndicatorConfig(
        id='atr',
        label='ATR',
        calculator=lambda df: calculate_atr(df, 14),
        response_fields=['ATR'],
        category='volatility'
    )
)
```

**就这么简单！** 🎉

## 📚 已实现的指标

| 指标 | 文件 | 函数名 | 用途 |
|------|------|--------|------|
| SMA | `moving_average.py` | `calculate_sma()` | 简单移动平均 |
| EMA | `moving_average.py` | `calculate_ema()` | 指数移动平均 |
| WMA | `moving_average.py` | `calculate_wma()` | 加权移动平均 |
| MACD | `macd.py` | `calculate_macd()` | 趋势+动量 |
| KDJ | `kdj.py` | `calculate_kdj()` | 超买超卖 |
| RSI | `rsi.py` | `calculate_rsi()` | 强弱指标 |
| 布林带 | `bollinger.py` | `calculate_bollinger_bands()` | 波动通道 |

## 🔧 修改指标参数

### **方式1：直接修改文件**

打开对应指标文件，修改默认参数：

```python
# indicators/rsi.py
def calculate_rsi(df: pd.DataFrame, period: int = 14):  # 改成 period: int = 9
    ...
```

### **方式2：在注册表中覆盖**

```python
# indicator_registry.py
IndicatorConfig(
    id='rsi',
    label='RSI',
    calculator=lambda df: calculate_rsi(df, 9),  # 使用9周期
    ...
)
```

## 📊 查看指标公式

**想知道某个指标怎么算的？**

直接打开对应文件，里面有：
- ✅ 完整公式
- ✅ 参数说明
- ✅ 交易信号
- ✅ 使用建议

**例如：** 想知道 MACD 怎么算？
→ 打开 `indicators/macd.py`
→ 看函数注释，一目了然！

## 🎓 学习资源

### **推荐阅读顺序**：
1. `moving_average.py` - 最简单的指标
2. `rsi.py` - 单一数值指标
3. `macd.py` - 多数值指标
4. `bollinger.py` - 复杂计算
5. `kdj.py` - 中国特色指标

## 🛠️ 开发规范

### **每个指标函数应该：**
1. ✅ 接收 DataFrame 作为第一个参数
2. ✅ 返回添加了新列的 DataFrame（不修改原数据）
3. ✅ 使用 TA-Lib 进行计算
4. ✅ 包含详细的文档字符串
5. ✅ 参数有合理的默认值

### **命名规范：**
- 函数名：`calculate_指标名()`
- 列名：`指标名` 或 `指标名_子指标`
- 示例：`calculate_macd()` → `'MACD'`, `'MACD_signal'`, `'MACD_hist'`

## ❓ 常见问题

### **Q: 为什么不用 pandas-ta？**
**A:** TA-Lib 是行业标准，性能更好，社区更大。

### **Q: 可以用自定义公式吗？**
**A:** 可以！创建新文件，不用 TA-Lib，自己实现即可。

### **Q: 如何测试指标计算是否正确？**
**A:** 可以对比 TradingView 或其他平台的计算结果。

## 📞 需要帮助？

- 查看 [TA-Lib 官方文档](https://ta-lib.org/function.html)
- 参考 TradingView 指标库
- 在项目 Issues 中提问

---

**Happy Coding!** 📈✨
