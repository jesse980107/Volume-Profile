"""
数据加载服务 - 负责读取和预处理 CSV 数据
"""
import pandas as pd
from pathlib import Path
from backend.core.config import DATA_DIR


class DataService:
    """数据服务类"""

    @staticmethod
    async def load_stock_data(symbol: str) -> pd.DataFrame:
        """
        加载股票数据

        Args:
            symbol: 股票代码

        Returns:
            处理后的 DataFrame
        """
        csv_path = DATA_DIR / f"{symbol}.csv"

        if not csv_path.exists():
            raise FileNotFoundError(f"Data file not found: {csv_path}")

        # 读取 CSV
        df = pd.read_csv(csv_path)

        # 转换日期格式 (YYYYMMDD -> YYYY-MM-DD)
        df['trade_date'] = pd.to_datetime(df['trade_date'], format='%Y%m%d')
        df['time'] = df['trade_date'].dt.strftime('%Y-%m-%d')

        # 按日期排序 (从旧到新)
        df = df.sort_values('trade_date').reset_index(drop=True)

        return df
