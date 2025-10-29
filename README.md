# 📈 股票分析系统

> 基于 **FastAPI + Lightweight Charts** 构建的现代化股票分析系统

## ✨ 特性

- 🚀 **高性能**: 使用 FastAPI 异步框架 + Lightweight Charts 原生渲染
- 🎨 **优雅设计**: 现代化 UI,流畅的交互体验
- 📊 **专业指标**: 支持 MA, MACD, KDJ, RSI, 布林带等技术指标
- 🧩 **模块化架构**: APIRouter + 依赖注入,代码清晰易维护
- 🔄 **实时更新**: 支持数据实时刷新

## 🏗️ 项目结构

```
stock-analysis/
├── backend/                    # FastAPI 后端
│   ├── main.py                 # 应用入口
│   ├── api/routes/             # API 路由
│   ├── core/                   # 核心配置
│   ├── services/               # 业务服务层
│   └── schemas/                # Pydantic 模型
├── frontend/                   # 前端资源
│   ├── index.html              # 主页面
│   ├── js/app.js               # 应用逻辑
│   └── css/styles.css          # 样式
├── data/                       # 数据文件
└── requirements.txt            # Python 依赖
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

**注意**: TA-Lib 在 Windows 上需要特殊安装:
- 下载 whl 文件: https://www.lfd.uci.edu/~gohlke/pythonlibs/#ta-lib
- 安装: `pip install TA_Lib-0.4.32-cp311-cp311-win_amd64.whl`

### 2. 启动服务器

```bash
python backend/main.py
```

或使用 uvicorn:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 访问应用

- **主页**: http://localhost:8000
- **API 文档**: http://localhost:8000/api/docs
- **健康检查**: http://localhost:8000/health

## 📚 API 文档

### 获取股票数据

```
GET /api/v1/stock/{symbol}
```

**参数**:
- `symbol`: 股票代码 (例如: 000155.sz)
- `start_date` (可选): 开始日期 YYYY-MM-DD
- `end_date` (可选): 结束日期 YYYY-MM-DD

**响应示例**:
```json
{
  "symbol": "000155.sz",
  "candlestick": [...],
  "volume": [...],
  "sma5": [...],
  "macd": {...},
  "kdj": {...},
  "rsi": [...],
  "boll": {...}
}
```

## 🎯 技术栈

### 后端
- **FastAPI 0.115+** - 现代高性能 Web 框架
- **pandas** - 数据处理
- **TA-Lib** - 技术指标计算
- **Pydantic V2** - 数据验证

### 前端
- **Lightweight Charts v5.x** - TradingView 官方图表库 (最新版本)
- **Vanilla JavaScript (ES6+)** - 无框架依赖
- **Modern CSS3** - 响应式设计 + 渐变动画

## 📖 代码亮点

### 1. 依赖注入 (Dependency Injection)

```python
@router.get("/{symbol}")
async def get_stock_data(
    symbol: str,
    data_service: Annotated[DataService, Depends(get_data_service)],
    indicator_service: Annotated[IndicatorService, Depends(get_indicator_service)],
):
    ...
```

### 2. 模块化路由 (APIRouter)

```python
# api/routes/stock.py
router = APIRouter(
    prefix="/stock",
    tags=["stock"],
)

# main.py
app.include_router(stock.router, prefix=API_V1_PREFIX)
```

### 3. 类型安全 (Pydantic)

```python
class StockDataResponse(BaseModel):
    symbol: str
    candlestick: List[CandleData]
    volume: List[VolumeData]
    ...
```

### 4. Lightweight Charts v5.x 新 API

```javascript
// ✅ v5.x 正确用法
const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#ef5350',
    downColor: '#26a69a',
});

// 虚线样式
lineStyle: LightweightCharts.LineStyle.Dashed
```

## 🛠️ 开发

### 添加新指标

1. 在 `indicator_service.py` 添加计算方法
2. 在 `stock.py` schema 添加响应模型
3. 在 `stock.py` route 添加到响应
4. 在 `app.js` 添加渲染逻辑

### 调试

启动开发模式:
```bash
python backend/main.py  # 自动重载
```

查看日志:
```bash
# 终端会显示所有请求日志
```

## 📝 TODO

- [ ] 添加筹码峰分析
- [ ] 支持多股票对比
- [ ] 添加实时数据源
- [ ] 添加用户认证
- [ ] 部署到云服务器

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

**Made with ❤️ using FastAPI + Lightweight Charts**
