/**
 * 筹码峰管理器
 * 负责筹码分布的可视化和统计计算
 * 使用 ECharts 实现横向柱状图
 */

class ChipManager {
    constructor() {
        this.chart = null;
        this.currentPrice = 0;
        this.container = null;
    }

    /**
     * 初始化 ECharts 实例
     */
    init() {
        this.container = document.getElementById('chip-canvas');

        if (!this.container) {
            console.error('筹码峰容器未找到: #chip-canvas');
            return;
        }

        // 检查 ECharts 是否已加载
        if (typeof echarts === 'undefined') {
            console.error('ECharts 未加载，请在 HTML 中引入 ECharts');
            return;
        }

        // 初始化深色主题
        this.chart = echarts.init(this.container, 'dark');

        // 设置基础配置
        const option = this.getBaseOption();
        this.chart.setOption(option);

        // 响应式处理
        this.setupResize();

        console.log('✓ 筹码峰管理器初始化成功');
    }

    /**
     * 获取基础 ECharts 配置
     */
    getBaseOption() {
        return {
            backgroundColor: 'transparent',
            grid: {
                left: 10,
                right: 50,
                top: 20,
                bottom: 20,
                containLabel: true
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params) => {
                    if (!params || params.length === 0) return '';
                    const data = params[0];
                    const price = data.name;
                    const volume = data.value;
                    const percentage = data.data.percentage || 0;
                    return `
                        <div style="padding: 5px;">
                            <div style="font-weight: 600;">价格: ¥${price}</div>
                            <div>成交量: ${this.formatVolume(volume)}</div>
                            <div>占比: ${percentage.toFixed(2)}%</div>
                        </div>
                    `;
                },
                backgroundColor: 'rgba(30, 34, 45, 0.95)',
                borderColor: '#2a2e39',
                textStyle: {
                    color: '#d1d4dc',
                    fontSize: 12
                }
            },
            xAxis: {
                type: 'value',
                show: false,
                min: 0
            },
            yAxis: {
                type: 'category',
                position: 'right',
                data: [],
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#787b86',
                    fontSize: 11,
                    formatter: (value) => '¥' + value
                },
                splitLine: { show: false }
            },
            series: [{
                type: 'bar',
                data: [],
                barWidth: 8,
                itemStyle: {
                    borderRadius: [0, 4, 4, 0]
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(255, 107, 107, 0.5)'
                    }
                },
                animationDuration: 300,
                animationEasing: 'cubicOut'
            }]
        };
    }

    /**
     * 更新筹码峰数据（全局视图）
     * @param {Object} chipData - 筹码数据 { distribution: [], peaks: [] }
     */
    updateGlobal(chipData) {
        if (!this.chart) {
            console.warn('ECharts 实例未初始化');
            return;
        }

        if (!chipData || !chipData.distribution || chipData.distribution.length === 0) {
            this.hide();
            return;
        }

        // 按价格排序（从低到高）
        const sorted = [...chipData.distribution].sort((a, b) => a.price - b.price);

        // 计算总成交量
        const totalVolume = sorted.reduce((sum, d) => sum + d.volume, 0);

        // 提取数据
        const prices = sorted.map(d => d.price.toFixed(2));
        const chartData = sorted.map(d => {
            const isPeak = this.isPeak(d.price, chipData.peaks);
            const percentage = (d.volume / totalVolume) * 100;

            return {
                value: d.volume,
                percentage: percentage,
                itemStyle: this.getBarStyle(isPeak, false) // 不区分获利盘套牢盘
            };
        });

        // 构建 Y 轴配置
        const yAxisConfig = {
            type: 'category',
            data: prices,
            position: 'right',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#787b86',
                fontSize: 11,
                formatter: (value) => '¥' + value
            },
            splitLine: { show: false }
        };

        // 更新图表
        this.chart.setOption({
            yAxis: yAxisConfig,
            series: [{
                data: chartData
            }]
        });

        // 存储数据供后续使用
        this.globalChipData = chipData;
        this.totalVolume = totalVolume;

        // 更新统计信息（不显示当前价格相关的）
        this.updateGlobalStats(chipData, totalVolume);
    }


    /**
     * 更新价格标记线（鼠标悬停时调用）
     * @param {number} currentPrice - 当前价格
     * @param {string} currentDate - 当前日期
     */
    updatePriceLine(currentPrice, currentDate) {
        if (!this.chart || !this.globalChipData) return;

        this.currentPrice = currentPrice;

        // 重新计算获利盘和套牢盘
        const { profitRatio, lossRatio } = this.calculateProfitLoss(
            this.globalChipData.distribution,
            currentPrice,
            this.totalVolume
        );

        // 更新统计信息中的价格相关部分
        const dateEl = document.getElementById('chip-date');
        if (dateEl) {
            dateEl.textContent = currentDate || '--';
        }

        const profitEl = document.getElementById('profit-ratio');
        if (profitEl) {
            profitEl.textContent = `${profitRatio.toFixed(1)}%`;
        }

        const lossEl = document.getElementById('loss-ratio');
        if (lossEl) {
            lossEl.textContent = `${lossRatio.toFixed(1)}%`;
        }

        // 在图表上画一条横线标记当前价格
        this.drawPriceLine(currentPrice);
    }

    /**
     * 绘制价格标记线
     * @param {number} price - 价格值
     */
    drawPriceLine(price) {
        if (!this.chart) return;

        this.chart.setOption({
            series: [{
                markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: {
                        color: '#FFA500',
                        width: 2,
                        type: 'solid'
                    },
                    label: {
                        show: true,
                        position: 'end',
                        formatter: '¥{c}',
                        color: '#FFA500',
                        fontSize: 11,
                        fontWeight: 'bold'
                    },
                    data: [
                        {
                            yAxis: price.toFixed(2)
                        }
                    ]
                }
            }]
        });
    }

    /**
     * 清除价格标记（鼠标离开时调用）
     */
    clearPriceLine() {
        const dateEl = document.getElementById('chip-date');
        if (dateEl) {
            dateEl.textContent = '--';
        }

        const profitEl = document.getElementById('profit-ratio');
        if (profitEl) {
            profitEl.textContent = '--';
        }

        const lossEl = document.getElementById('loss-ratio');
        if (lossEl) {
            lossEl.textContent = '--';
        }

        // 清除图表上的价格线
        if (this.chart) {
            this.chart.setOption({
                series: [{
                    markLine: {
                        data: []
                    }
                }]
            });
        }
    }

    /**
     * 判断是否为峰值
     */
    isPeak(price, peaks) {
        if (!peaks || peaks.length === 0) return false;
        return peaks.some(p => Math.abs(p.price - price) < 0.01);
    }

    /**
     * 获取柱状图样式
     * @param {boolean} isPeak - 是否为峰值
     * @param {boolean} isAbovePrice - 是否高于当前价（可选，全局视图时为false）
     */
    getBarStyle(isPeak, isAbovePrice = null) {
        if (isPeak) {
            // 峰值 - 红色渐变高亮
            return {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: 'rgba(255, 107, 107, 0.5)' },
                    { offset: 1, color: 'rgba(255, 107, 107, 1)' }
                ])
            };
        } else if (isAbovePrice === null || isAbovePrice === false) {
            // 全局视图或获利盘 - 蓝灰色渐变
            return {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
                    { offset: 1, color: 'rgba(69, 183, 209, 0.7)' }
                ])
            };
        } else {
            // 套牢盘 - 绿色渐变
            return {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: 'rgba(38, 166, 154, 0.2)' },
                    { offset: 1, color: 'rgba(38, 166, 154, 0.6)' }
                ])
            };
        }
    }

    /**
     * 更新全局统计信息（不包含当前价格相关的）
     */
    updateGlobalStats(chipData, totalVolume) {
        // 计算集中度
        const concentration = this.calculateConcentration(chipData.distribution, totalVolume);
        const concentrationEl = document.getElementById('concentration');
        if (concentrationEl) {
            concentrationEl.textContent = `${concentration.toFixed(1)}%`;
        }

        // 主力成本（主峰价格）
        const mainPeak = chipData.peaks?.find(p => p.intensity === 'high');
        const mainCostEl = document.getElementById('main-cost');
        if (mainCostEl) {
            mainCostEl.textContent = mainPeak ? `¥${mainPeak.price.toFixed(2)}` : '--';
        }

        // 初始化时，获利盘和套牢盘显示为 --
        const dateEl = document.getElementById('chip-date');
        if (dateEl) {
            dateEl.textContent = '全局视图';
        }

        const profitEl = document.getElementById('profit-ratio');
        if (profitEl) {
            profitEl.textContent = '--';
        }

        const lossEl = document.getElementById('loss-ratio');
        if (lossEl) {
            lossEl.textContent = '--';
        }
    }

    /**
     * 计算筹码集中度
     * 前 20% 价格区间的筹码占比
     */
    calculateConcentration(distribution, totalVolume) {
        const sorted = [...distribution].sort((a, b) => b.volume - a.volume);
        const top20Count = Math.ceil(sorted.length * 0.2);
        const top20Volume = sorted.slice(0, top20Count).reduce((sum, d) => sum + d.volume, 0);
        return (top20Volume / totalVolume) * 100;
    }

    /**
     * 计算获利盘和套牢盘
     */
    calculateProfitLoss(distribution, currentPrice, totalVolume) {
        let profitVolume = 0;
        let lossVolume = 0;

        distribution.forEach(d => {
            if (d.price < currentPrice) {
                profitVolume += d.volume;
            } else {
                lossVolume += d.volume;
            }
        });

        return {
            profitRatio: (profitVolume / totalVolume) * 100,
            lossRatio: (lossVolume / totalVolume) * 100
        };
    }

    /**
     * 隐藏筹码峰（无数据时）
     */
    hide() {
        if (!this.chart) return;

        this.chart.setOption({
            yAxis: { data: [] },
            series: [{ data: [] }]
        });

        // 清空统计信息
        this.clearStats();
    }

    /**
     * 清空统计信息显示
     */
    clearStats() {
        const ids = ['chip-date', 'concentration', 'main-cost', 'profit-ratio', 'loss-ratio'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
    }

    /**
     * 格式化成交量显示
     */
    formatVolume(volume) {
        if (volume >= 100000000) {
            return (volume / 100000000).toFixed(2) + '亿';
        } else if (volume >= 10000) {
            return (volume / 10000).toFixed(2) + '万';
        } else {
            return volume.toFixed(0);
        }
    }

    /**
     * 设置响应式
     */
    setupResize() {
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.chart) {
                    this.chart.resize();
                }
            }, 200);
        });
    }

    /**
     * 销毁实例
     */
    destroy() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
}

// 导出单例
const chipManager = new ChipManager();
