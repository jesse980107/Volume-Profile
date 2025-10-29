"""
依赖注入 - 使用 FastAPI 的 Depends 系统
"""
from backend.services.data_service import DataService
from backend.services.indicator_service import IndicatorService


def get_data_service() -> DataService:
    """获取数据服务实例"""
    return DataService()


def get_indicator_service() -> IndicatorService:
    """获取指标服务实例"""
    return IndicatorService()
