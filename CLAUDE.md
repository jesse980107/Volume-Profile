# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A stock analysis system built with **FastAPI** (backend) and **Lightweight Charts v5.x** (frontend). The system analyzes stock data, calculates technical indicators using TA-Lib, and visualizes them with interactive charts.

**Key characteristics:**
- Backend: FastAPI with dependency injection pattern and APIRouter-based modular routing
- Frontend: Vanilla JavaScript with Lightweight Charts v5.x (no frameworks)
- Data flow: CSV files → pandas → TA-Lib indicators → Pydantic schemas → Lightweight Charts
- Architecture: Service-oriented with clear separation between data loading and indicator calculation

## Commands

### Development
```bash
# Start development server (with auto-reload)
python backend/main.py

# Alternative: using uvicorn directly
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# Windows quick start
start.bat
```

### Dependencies
```bash
# Install dependencies
pip install -r requirements.txt

# TA-Lib on Windows requires special installation:
# 1. Download whl from: https://www.lfd.uci.edu/~gohlke/pythonlibs/#ta-lib
# 2. pip install TA_Lib-0.4.32-cp311-cp311-win_amd64.whl
```

### Access Points
- Main app: http://localhost:8000
- API docs (Swagger): http://localhost:8000/api/docs
- Health check: http://localhost:8000/health

## Architecture

### Backend Structure

```
backend/
├── main.py                 # FastAPI app entry point, CORS, static file mounting
├── core/
│   ├── config.py          # Global config (DATA_DIR, API_V1_PREFIX, CORS origins)
│   └── dependencies.py    # Dependency injection functions for services
├── api/routes/
│   └── stock.py           # Stock API routes with dependency injection
├── services/
│   ├── data_service.py    # CSV data loading and preprocessing
│   └── indicator_service.py # TA-Lib technical indicator calculations
└── schemas/
    └── stock.py           # Pydantic models for type-safe API responses
```

**Key design patterns:**
1. **Dependency Injection**: Services are injected via FastAPI's `Depends()` mechanism (see `backend/core/dependencies.py`)
2. **APIRouter Modularity**: Routes are modularized using `APIRouter` and included in main app with `app.include_router()`
3. **Service Layer**: Business logic separated into `DataService` (data loading) and `IndicatorService` (indicator calculation)
4. **Type Safety**: All API responses use Pydantic V2 models for validation and serialization

### Data Flow

1. **Data Loading** (`data_service.py`):
   - Reads CSV from `data/{symbol}.csv`
   - Converts date format: `YYYYMMDD` → `YYYY-MM-DD`
   - Sorts chronologically (oldest to newest)

2. **Indicator Calculation** (`indicator_service.py`):
   - Uses TA-Lib for all calculations
   - Supports: SMA (5/10/20/60), MACD, KDJ, RSI, Bollinger Bands
   - `add_all_indicators()` method adds all indicators to DataFrame in one call
   - Fills NaN values with 0

3. **Response Building** (`api/routes/stock.py`):
   - `_build_response()` converts DataFrame to Pydantic models
   - Filters out 0 values (NaN placeholders) from indicators
   - Adds color to volume bars based on candle direction

### Frontend Architecture

```
frontend/
├── index.html          # Single page with controls and chart container
├── js/app.js          # Main application logic
└── css/styles.css     # Styling
```

**Frontend design:**
- Uses Lightweight Charts v5.x **standalone production** build from CDN
- Single `chart` instance with multiple **panes** (main, volume, MACD, KDJ, RSI)
- State management via global `state` object containing chart/panes/series references
- Modular functions: `fetchStockData()`, `initChart()`, indicator rendering functions

**Important Lightweight Charts v5.x API changes:**
- Create series: `chart.addSeries(LightweightCharts.CandlestickSeries, options)`
- Line styles: `lineStyle: LightweightCharts.LineStyle.Dashed`
- Multiple panes: Create with `chart.panes()` and attach series to specific panes

## Adding New Technical Indicators

Follow this 4-step process:

1. **Add calculation to `indicator_service.py`**:
   ```python
   @staticmethod
   def calculate_new_indicator(df: pd.DataFrame) -> pd.Series:
       return talib.SOME_INDICATOR(df['close'].values, ...)
   ```

2. **Update `add_all_indicators()` in `indicator_service.py`**:
   ```python
   df['NewIndicator'] = cls.calculate_new_indicator(df)
   ```

3. **Add response model in `schemas/stock.py`**:
   ```python
   class StockDataResponse(BaseModel):
       # ... existing fields
       new_indicator: List[ValueData] | None = None
   ```

4. **Update `_build_response()` in `api/routes/stock.py`**:
   ```python
   new_indicator=to_value_data('NewIndicator')
   ```

5. **Add rendering in `frontend/js/app.js`**:
   - Add series to `state.series`
   - Create rendering function
   - Add toggle control in HTML

## Data Format

CSV files in `data/` directory must have these columns:
- `trade_date`: Date in `YYYYMMDD` format
- `open`, `high`, `low`, `close`: Price data (float)
- `vol`: Volume (float)

Example: `data/000155.sz.csv`

## Configuration

**Important config locations:**
- API prefix: `backend/core/config.py` → `API_V1_PREFIX`
- CORS origins: `backend/core/config.py` → `ALLOWED_ORIGINS`
- Default stock symbol: `backend/core/config.py` → `DEFAULT_SYMBOL`
- Data directory: `backend/core/config.py` → `DATA_DIR`
- Frontend config: `frontend/js/app.js` → `config` object

## Python Path Handling

`backend/main.py` adds project root to `sys.path` to enable imports from project root:
```python
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))
```

This allows imports like `from backend.core.config import ...` to work correctly.

## Notes

- Frontend uses **Vanilla JavaScript** (no build step required)
- All indicators are calculated server-side with TA-Lib
- Date format conversion happens in `DataService` to ensure Lightweight Charts compatibility
- Static files are served from `/static` route mapped to `frontend/` directory
- Development mode has auto-reload enabled by default
