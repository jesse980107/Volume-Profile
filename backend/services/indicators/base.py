"""
指标参数系统 - 基础类定义
配置驱动的指标参数管理系统
"""
from enum import Enum
from typing import List, Any, Dict, Optional, Union
from pydantic import BaseModel, Field


class ParameterType(str, Enum):
    """
    参数类型枚举
    决定前端如何渲染表单控件
    """
    NUMBER = "number"              # 数字输入框
    COLOR = "color"                # 颜色选择器
    SELECT = "select"              # 下拉框
    BOOLEAN = "boolean"            # 开关/复选框
    MULTI_PERIOD = "multi_period"  # 多周期选择器（MA专用）


class ParameterOption(BaseModel):
    """
    下拉框或多选框的选项
    """
    value: Union[int, float, str] = Field(..., description="选项值")
    label: str = Field(..., description="显示标签")

    class Config:
        json_schema_extra = {
            "example": {
                "value": 20,
                "label": "20日"
            }
        }


class IndicatorParameter(BaseModel):
    """
    指标参数定义
    描述单个参数的类型、约束、默认值等
    """
    name: str = Field(..., description="参数名（英文），用于代码中引用")
    type: ParameterType = Field(..., description="参数类型")
    label: str = Field(..., description="显示标签（中文），用于UI展示")
    default: Any = Field(..., description="默认值")

    # 可选约束
    min: Optional[Union[int, float]] = Field(None, description="数字类型：最小值")
    max: Optional[Union[int, float]] = Field(None, description="数字类型：最大值")
    step: Optional[Union[int, float]] = Field(None, description="数字类型：步长")
    options: Optional[List[ParameterOption]] = Field(None, description="下拉框/多选框：选项列表")
    description: Optional[str] = Field(None, description="参数说明")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "period",
                "type": "number",
                "label": "周期",
                "default": 20,
                "min": 1,
                "max": 500,
                "description": "计算移动平均的周期数"
            }
        }


class IndicatorMetadata(BaseModel):
    """
    指标元数据
    描述指标的基本信息和参数配置
    """
    id: str = Field(..., description="指标唯一标识符")
    name: str = Field(..., description="指标显示名称")
    category: str = Field(..., description="指标分类：overlay/oscillator/volume")
    description: str = Field(..., description="指标描述")
    parameters: List[IndicatorParameter] = Field(..., description="参数列表")
    display_template: str = Field(..., description="Bar显示模板类型")
    supports_multiple: bool = Field(
        default=False,
        description="是否支持多实例（MA特殊，可添加多个不同配置）"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ma",
                "name": "Moving Average",
                "category": "overlay",
                "description": "移动平均线，显示价格趋势",
                "parameters": [],
                "display_template": "ma-multi",
                "supports_multiple": True
            }
        }


class IndicatorConfig(BaseModel):
    """
    用户的指标配置实例
    记录用户为某个指标配置的具体参数值
    """
    indicator_id: str = Field(..., description="指标类型ID")
    instance_id: str = Field(..., description="实例唯一ID")
    parameters: Dict[str, Any] = Field(..., description="参数配置")

    class Config:
        json_schema_extra = {
            "example": {
                "indicator_id": "ma",
                "instance_id": "ma-uuid-123",
                "parameters": {
                    "periods": [5, 20, 60],
                    "colors": {
                        "5": "#FF6B6B",
                        "20": "#45B7D1",
                        "60": "#FFA07A"
                    }
                }
            }
        }


class IndicatorCategory(str, Enum):
    """指标分类"""
    OVERLAY = "overlay"        # 主图指标（叠加在K线上）
    OSCILLATOR = "oscillator"  # 副图振荡器指标
    VOLUME = "volume"          # 成交量指标
