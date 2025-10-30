/**
 * 筹码计算引擎
 * 支持多种算法和自定义参数
 */

class ChipCalculator {
    constructor(options = {}) {
        // 默认配置
        this.options = {
            lookbackDays: options.lookbackDays || null,      // null = 全部历史
            decayRate: options.decayRate || 0,               // 衰减率（0 = 不衰减）
            numBins: options.numBins || 50,                  // 价格档位数
            algorithm: options.algorithm || 'cumulative'     // 算法类型
        };

        // 缓存
        this.cache = new Map();
        this.volumeMap = new Map();

        // 数据引用
        this.candles = null;
        this.volumes = null;

        // 价格范围
        this.minPrice = 0;
        this.maxPrice = 0;
        this.binSize = 0;
    }

    /**
     * 更新配置
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.cache.clear();
        console.log('✓ 筹码计算器配置已更新:', this.options);
    }

    /**
     * 初始化数据
     */
    initialize(candles, volumes) {
        this.candles = candles;
        this.volumes = volumes;

        // 创建时间到成交量的映射
        this.volumeMap.clear();
        volumes.forEach(v => {
            this.volumeMap.set(v.time, v.value);
        });

        // 计算价格范围
        const prices = candles.flatMap(c => [c.high, c.low]);
        this.minPrice = Math.min(...prices);
        this.maxPrice = Math.max(...prices);
        const priceRange = this.maxPrice - this.minPrice;
        this.binSize = priceRange / this.options.numBins;

        console.log(`✓ 筹码计算器已初始化: ${candles.length} 根K线, 价格范围 [${this.minPrice.toFixed(2)}, ${this.maxPrice.toFixed(2)}]`);
    }

    /**
     * 预计算所有日期的筹码分布
     */
    precomputeAll(progressCallback) {
        if (!this.candles || !this.volumes) {
            console.error('请先调用 initialize() 初始化数据');
            return null;
        }

        console.log(`开始预计算筹码分布 (算法: ${this.options.algorithm}, 回溯: ${this.options.lookbackDays || '全部'}天)...`);

        const startTime = Date.now();
        const total = this.candles.length;

        this.candles.forEach((candle, index) => {
            const chipData = this.compute(candle.time, index);
            this.cache.set(candle.time, chipData);

            // 进度回调（每100根K线报告一次）
            if (progressCallback && index % 100 === 0) {
                progressCallback(index, total);
            }
        });

        const elapsed = Date.now() - startTime;
        console.log(`✓ 预计算完成: ${total} 个数据点, 耗时 ${elapsed}ms`);

        return this.cache;
    }

    /**
     * 计算指定日期的筹码分布
     */
    compute(targetDate, targetIndex = null) {
        // 如果已缓存，直接返回
        if (this.cache.has(targetDate)) {
            return this.cache.get(targetDate);
        }

        // 找到目标日期的索引
        if (targetIndex === null) {
            targetIndex = this.candles.findIndex(c => c.time === targetDate);
            if (targetIndex === -1) return null;
        }

        // 确定起始索引（根据 lookbackDays）
        let startIndex = 0;
        if (this.options.lookbackDays) {
            const lookbackDate = this.addDays(targetDate, -this.options.lookbackDays);
            startIndex = this.candles.findIndex(c => c.time >= lookbackDate);
            if (startIndex === -1) startIndex = 0;
        }

        // 裁剪数据窗口
        const windowCandles = this.candles.slice(startIndex, targetIndex + 1);

        // 根据算法计算
        return this.calculateDistribution(windowCandles, targetDate);
    }

    /**
     * 获取缓存的筹码数据
     */
    get(date) {
        return this.cache.get(date) || null;
    }

    /**
     * 计算分布（算法分发）
     */
    calculateDistribution(candles, targetDate) {
        switch (this.options.algorithm) {
            case 'cumulative':
                return this.cumulativeAlgorithm(candles);
            case 'exponential_decay':
                return this.exponentialDecayAlgorithm(candles, targetDate);
            case 'linear_decay':
                return this.linearDecayAlgorithm(candles, targetDate);
            default:
                return this.cumulativeAlgorithm(candles);
        }
    }

    /**
     * 算法1: 简单累积（所有历史数据平等权重）
     */
    cumulativeAlgorithm(candles) {
        // 🔧 动态计算窗口的价格范围
        const windowPrices = candles.flatMap(c => [c.high, c.low]);
        const windowMinPrice = Math.min(...windowPrices);
        const windowMaxPrice = Math.max(...windowPrices);
        const windowPriceRange = windowMaxPrice - windowMinPrice;

        if (windowPriceRange === 0) {
            console.warn('价格范围为0，无法计算筹码分布');
            return { distribution: [], peaks: [] };
        }

        const windowBinSize = windowPriceRange / this.options.numBins;
        const distribution = new Array(this.options.numBins).fill(0);

        // 遍历每根K线
        candles.forEach(candle => {
            const volume = this.volumeMap.get(candle.time) || 0;
            if (volume === 0) return;

            // 将成交量分配到价格档位（使用动态价格范围）
            this.distributeVolumeToBins(
                candle,
                volume,
                distribution,
                1.0,
                windowMinPrice,
                windowBinSize
            );
        });

        // 转换为对象数组
        const result = [];
        for (let i = 0; i < distribution.length; i++) {
            if (distribution[i] > 0) {
                const price = windowMinPrice + windowBinSize * (i + 0.5);
                result.push({ price, volume: distribution[i] });
            }
        }

        // 识别峰值
        const peaks = this.findPeaks(result);

        return { distribution: result, peaks };
    }

    /**
     * 算法2: 指数衰减（越早的数据权重越低）
     */
    exponentialDecayAlgorithm(candles, targetDate) {
        // 🔧 动态计算窗口的价格范围
        const windowPrices = candles.flatMap(c => [c.high, c.low]);
        const windowMinPrice = Math.min(...windowPrices);
        const windowMaxPrice = Math.max(...windowPrices);
        const windowPriceRange = windowMaxPrice - windowMinPrice;

        if (windowPriceRange === 0) {
            console.warn('价格范围为0，无法计算筹码分布');
            return { distribution: [], peaks: [] };
        }

        const windowBinSize = windowPriceRange / this.options.numBins;
        const distribution = new Array(this.options.numBins).fill(0);
        const decayRate = this.options.decayRate;

        candles.forEach(candle => {
            const volume = this.volumeMap.get(candle.time) || 0;
            if (volume === 0) return;

            // 计算衰减权重
            const daysDiff = this.dateDiff(candle.time, targetDate);
            const weight = Math.exp(-decayRate * daysDiff);

            // 分配成交量（应用权重，使用动态价格范围）
            this.distributeVolumeToBins(
                candle,
                volume,
                distribution,
                weight,
                windowMinPrice,
                windowBinSize
            );
        });

        const result = [];
        for (let i = 0; i < distribution.length; i++) {
            if (distribution[i] > 0) {
                const price = windowMinPrice + windowBinSize * (i + 0.5);
                result.push({ price, volume: distribution[i] });
            }
        }

        const peaks = this.findPeaks(result);
        return { distribution: result, peaks };
    }

    /**
     * 算法3: 线性衰减
     */
    linearDecayAlgorithm(candles, targetDate) {
        // 🔧 动态计算窗口的价格范围
        const windowPrices = candles.flatMap(c => [c.high, c.low]);
        const windowMinPrice = Math.min(...windowPrices);
        const windowMaxPrice = Math.max(...windowPrices);
        const windowPriceRange = windowMaxPrice - windowMinPrice;

        if (windowPriceRange === 0) {
            console.warn('价格范围为0，无法计算筹码分布');
            return { distribution: [], peaks: [] };
        }

        const windowBinSize = windowPriceRange / this.options.numBins;
        const distribution = new Array(this.options.numBins).fill(0);
        const totalDays = this.options.lookbackDays || candles.length;

        candles.forEach(candle => {
            const volume = this.volumeMap.get(candle.time) || 0;
            if (volume === 0) return;

            // 线性衰减权重
            const daysDiff = this.dateDiff(candle.time, targetDate);
            const weight = Math.max(0, 1 - (daysDiff / totalDays));

            this.distributeVolumeToBins(
                candle,
                volume,
                distribution,
                weight,
                windowMinPrice,
                windowBinSize
            );
        });

        const result = [];
        for (let i = 0; i < distribution.length; i++) {
            if (distribution[i] > 0) {
                const price = windowMinPrice + windowBinSize * (i + 0.5);
                result.push({ price, volume: distribution[i] });
            }
        }

        const peaks = this.findPeaks(result);
        return { distribution: result, peaks };
    }

    /**
     * 将K线的成交量分配到价格档位
     * @param {Object} candle - K线数据
     * @param {number} volume - 成交量
     * @param {Array} distribution - 分布数组
     * @param {number} weight - 权重
     * @param {number} minPrice - 动态最低价（可选，默认使用全局）
     * @param {number} binSize - 动态档位大小（可选，默认使用全局）
     */
    distributeVolumeToBins(candle, volume, distribution, weight, minPrice = null, binSize = null) {
        // 使用传入的动态价格范围，或回退到全局价格范围
        const useMinPrice = minPrice !== null ? minPrice : this.minPrice;
        const useBinSize = binSize !== null ? binSize : this.binSize;

        const priceSpan = candle.high - candle.low;

        if (priceSpan === 0) {
            // 高低价相同，全部分配到对应档位
            const binIndex = Math.floor((candle.close - useMinPrice) / useBinSize);
            if (binIndex >= 0 && binIndex < distribution.length) {
                distribution[binIndex] += volume * weight;
            }
            return;
        }

        // 遍历K线覆盖的价格档位
        const startBin = Math.floor((candle.low - useMinPrice) / useBinSize);
        const endBin = Math.floor((candle.high - useMinPrice) / useBinSize);

        for (let i = Math.max(0, startBin); i <= Math.min(distribution.length - 1, endBin); i++) {
            const binPrice = useMinPrice + useBinSize * (i + 0.5);

            // 使用正态分布权重（假设成交量集中在中间价格）
            const relativePosition = (binPrice - candle.low) / priceSpan;
            const normalWeight = Math.exp(-Math.pow((relativePosition - 0.5) * 4, 2));

            distribution[i] += volume * weight * normalWeight;
        }
    }

    /**
     * 识别峰值
     */
    findPeaks(distribution) {
        if (distribution.length === 0) return [];

        // 按成交量排序
        const sorted = [...distribution].sort((a, b) => b.volume - a.volume);

        const peaks = [];

        // 主峰（成交量最大）
        if (sorted.length > 0) {
            peaks.push({ price: sorted[0].price, intensity: 'high' });
        }

        // 次峰（成交量第二大，且与主峰距离足够远）
        if (sorted.length > 1) {
            const mainPeakPrice = sorted[0].price;
            for (let i = 1; i < sorted.length; i++) {
                const priceDiff = Math.abs(sorted[i].price - mainPeakPrice);
                // 至少相差5%
                if (priceDiff > mainPeakPrice * 0.05) {
                    peaks.push({ price: sorted[i].price, intensity: 'medium' });
                    break;
                }
            }
        }

        return peaks;
    }

    /**
     * 计算两个日期之间的天数差
     */
    dateDiff(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    /**
     * 日期加减
     */
    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('✓ 筹码计算器缓存已清空');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            candlesCount: this.candles?.length || 0,
            priceRange: [this.minPrice, this.maxPrice],
            binSize: this.binSize,
            options: this.options
        };
    }
}

// 导出单例
const chipCalculator = new ChipCalculator();
