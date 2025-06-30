// src/services/analysisEngine.ts
import type { GliderData, TyphoonData, WaveFieldData } from '../types';

// 分析结果类型定义
export interface AnalysisResult {
  id: string;
  timestamp: number;
  status: 'running' | 'completed' | 'error';
  progress: number;
  data?: any;
  error?: string;
}

export interface SpatialCorrelationResult {
  correlationCoefficient: number;
  significanceLevel: number;
  spatialPoints: Array<{
    longitude: number;
    latitude: number;
    correlation: number;
    intensity: number;
  }>;
  bufferZones: Array<{
    center: [number, number];
    radius: number;
    avgWaveHeight: number;
    typhoonDistance: number;
  }>;
  summary: {
    maxCorrelation: number;
    minCorrelation: number;
    avgCorrelation: number;
    analysisCount: number;
  };
}

export interface TemporalComparisonResult {
  timeSeries: Array<{
    timestamp: number;
    typhoonIntensity: number;
    waveHeight: number;
    correlation: number;
  }>;
  trends: {
    typhoonTrend: 'increasing' | 'decreasing' | 'stable';
    waveTrend: 'increasing' | 'decreasing' | 'stable';
    correlation: number;
  };
  peaks: Array<{
    timestamp: number;
    type: 'typhoon' | 'wave';
    value: number;
  }>;
  summary: {
    maxWaveHeight: number;
    maxTyphoonIntensity: number;
    avgDelay: number; // 台风变化与波浪响应的平均延迟（小时）
  };
}

export interface WaveFieldValidationResult {
  consistency: {
    score: number; // 0-100
    issues: Array<{
      type: 'gap' | 'outlier' | 'discontinuity';
      location: [number, number];
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };
  statistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
    gridCoverage: number; // 网格覆盖率 %
  };
  spatialContinuity: {
    score: number;
    discontinuities: Array<{
      location: [number, number];
      magnitude: number;
    }>;
  };
  temporalStability: {
    score: number;
    variance: number;
    abruptChanges: Array<{
      timestamp: number;
      magnitude: number;
    }>;
  };
}

export interface GliderTimeSeriesResult {
  timeSeries: Array<{
    timestamp: number;
    longitude: number;
    latitude: number;
    expectedHeading: number;
    currentHeading: number;
    headingError: number; // 期望航向与实际航向的差值
    speed: number;
    effectiveSpeed: number;
    speedEfficiency: number; // 有效速度/实际速度
    voltage: number;
    airTemp: number;
    waterTemp: number;
    tempDiff: number; // 气温与水温差
    windSpeed: number;
    windDirection: number;
    pressure: number;
    pitch: number;
    roll: number;
    rudderAngle: number;
    distance: number;
  }>;
  statistics: {
    trajectory: {
      totalDistance: number;
      averageSpeed: number;
      maxSpeed: number;
      minSpeed: number;
      speedVariance: number;
    };
    heading: {
      averageError: number;
      maxError: number;
      rmsError: number;
      errorTrend: 'improving' | 'degrading' | 'stable';
    };
    environment: {
      tempStats: {
        airTempRange: [number, number];
        waterTempRange: [number, number];
        avgTempDiff: number;
      };
      windStats: {
        avgWindSpeed: number;
        maxWindSpeed: number;
        predominantDirection: number;
      };
      pressureStats: {
        range: [number, number];
        trend: 'rising' | 'falling' | 'stable';
      };
    };
    performance: {
      avgSpeedEfficiency: number;
      batteryConsumption: {
        voltageRange: [number, number];
        drainRate: number; // 电压下降速率 V/hour
      };
      stabilityScore: number; // 基于pitch/roll的稳定性评分 0-100
    };
  };
  trends: {
    trajectory: {
      direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
      consistency: number; // 航向一致性 0-1
    };
    performance: {
      speedTrend: 'increasing' | 'decreasing' | 'stable';
      efficiencyTrend: 'improving' | 'degrading' | 'stable';
      batteryTrend: 'draining' | 'stable' | 'charging';
    };
    environment: {
      tempTrend: 'warming' | 'cooling' | 'stable';
      windTrend: 'strengthening' | 'weakening' | 'stable';
    };
  };
  anomalies: Array<{
    timestamp: number;
    type: 'heading_deviation' | 'speed_anomaly' | 'environmental_extreme' | 'power_issue';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    threshold: number;
  }>;
  correlations: {
    speedVsWind: number;
    headingErrorVsRudder: number;
    efficiencyVsEnvironment: number;
    batteryVsPerformance: number;
  };
  summary: {
    timeRange: [number, number];
    dataPoints: number;
    missionEffectiveness: number; // 综合任务有效性评分 0-100
    keyInsights: string[];
  };
}

// 分析参数类型
export interface SpatialAnalysisParams {
  bufferRadius: number;
  correlationMethod: 'pearson' | 'spearman' | 'kendall';
  includeIntensity: boolean;
}

export interface TemporalAnalysisParams {
  timeWindow: number;
  smoothing: boolean;
  showTrends: boolean;
}

export interface ValidationParams {
  validationType: 'consistency' | 'continuity' | 'temporal';
  gridResolution: 'high' | 'medium' | 'low';
  includeStatistics: boolean;
}

export interface GliderAnalysisParams {
  timeWindow?: number; // 分析时间窗口（小时）
  smoothing: boolean;
  includeAnomalies: boolean;
  correlationAnalysis: boolean;
  performanceMetrics: boolean;
}

// 分析引擎类
export class AnalysisEngine {
  private static instance: AnalysisEngine;
  private runningAnalyses: Map<string, AnalysisResult> = new Map();

  public static getInstance(): AnalysisEngine {
    if (!AnalysisEngine.instance) {
      AnalysisEngine.instance = new AnalysisEngine();
    }
    return AnalysisEngine.instance;
  }

  // 空间相关性分析
  public async runSpatialCorrelationAnalysis(
    typhoonData: TyphoonData[],
    waveFieldData: WaveFieldData[],
    params: SpatialAnalysisParams,
    progressCallback?: (progress: number) => void
  ): Promise<SpatialCorrelationResult> {
    const analysisId = `spatial_${Date.now()}`;
    
    try {
      // 初始化分析结果
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'running',
        progress: 0,
      });

      progressCallback?.(10);

      // 1. 数据预处理和时间对齐
      const alignedData = this.alignTyphoonWaveData(typhoonData, waveFieldData);
      progressCallback?.(30);

      // 2. 空间缓冲区分析
      const bufferZones = this.createSpatialBuffers(alignedData.typhoon, params.bufferRadius);
      progressCallback?.(50);

      // 3. 计算空间相关性
      const spatialPoints = this.calculateSpatialCorrelation(
        alignedData.typhoon,
        alignedData.wave,
        bufferZones,
        params.correlationMethod
      );
      progressCallback?.(70);

      // 4. 统计分析
      const correlations = spatialPoints.map(p => p.correlation);
      const summary = {
        maxCorrelation: Math.max(...correlations),
        minCorrelation: Math.min(...correlations),
        avgCorrelation: correlations.reduce((a, b) => a + b, 0) / correlations.length,
        analysisCount: spatialPoints.length,
      };

      progressCallback?.(90);

      const result: SpatialCorrelationResult = {
        correlationCoefficient: summary.avgCorrelation,
        significanceLevel: this.calculateSignificance(correlations),
        spatialPoints,
        bufferZones,
        summary,
      };

      // 更新分析状态
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'completed',
        progress: 100,
        data: result,
      });

      progressCallback?.(100);
      return result;

    } catch (error) {
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '分析失败',
      });
      throw error;
    }
  }

  // 时序对比分析
  public async runTemporalComparisonAnalysis(
    typhoonData: TyphoonData[],
    waveFieldData: WaveFieldData[],
    params: TemporalAnalysisParams,
    progressCallback?: (progress: number) => void
  ): Promise<TemporalComparisonResult> {
    const analysisId = `temporal_${Date.now()}`;

    try {
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'running',
        progress: 0,
      });

      progressCallback?.(10);

      // 1. 时间序列对齐
      const timeSeries = this.createTimeSeries(typhoonData, waveFieldData, params.timeWindow);
      progressCallback?.(30);

      // 2. 数据平滑处理
      if (params.smoothing) {
        this.applySmoothing(timeSeries);
      }
      progressCallback?.(50);

      // 3. 趋势分析
      const trends = this.analyzeTrends(timeSeries);
      progressCallback?.(70);

      // 4. 峰值检测
      const peaks = this.detectPeaks(timeSeries);
      progressCallback?.(85);

      // 5. 统计摘要
      const summary = this.calculateTemporalSummary(timeSeries);
      progressCallback?.(95);

      const result: TemporalComparisonResult = {
        timeSeries,
        trends,
        peaks,
        summary,
      };

      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'completed',
        progress: 100,
        data: result,
      });

      progressCallback?.(100);
      return result;

    } catch (error) {
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '分析失败',
      });
      throw error;
    }
  }

  // 滑翔机时序分析
  public async runGliderTimeSeriesAnalysis(
    gliderData: GliderData[],
    params: GliderAnalysisParams,
    progressCallback?: (progress: number) => void
  ): Promise<GliderTimeSeriesResult> {
    const analysisId = `glider_timeseries_${Date.now()}`;

    try {
      // 初始化分析结果
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'running',
        progress: 0,
      });

      progressCallback?.(10);

      if (gliderData.length === 0) {
        throw new Error('滑翔机数据为空');
      }

      // 1. 数据预处理和排序
      const sortedData = [...gliderData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      progressCallback?.(20);

      // 2. 创建时序数据
      const timeSeries = sortedData.map((point, index) => {
        const headingError = Math.abs(point.expectedHeading - point.currentHeading);
        const speedEfficiency = point.speed > 0 ? point.effectiveSpeed / point.speed : 0;
        const tempDiff = point.airTemp - point.waterTemp;

        return {
          timestamp: new Date(point.timestamp).getTime(),
          longitude: point.longitude,
          latitude: point.latitude,
          expectedHeading: point.expectedHeading,
          currentHeading: point.currentHeading,
          headingError: headingError > 180 ? 360 - headingError : headingError,
          speed: point.speed,
          effectiveSpeed: point.effectiveSpeed,
          speedEfficiency: Math.min(speedEfficiency, 1.0),
          voltage: point.voltage,
          airTemp: point.airTemp,
          waterTemp: point.waterTemp,
          tempDiff: tempDiff,
          windSpeed: point.windSpeed,
          windDirection: point.windDirection,
          pressure: point.pressure,
          pitch: point.pitch,
          roll: point.roll,
          rudderAngle: point.rudderAngle,
          distance: point.distance
        };
      });

      progressCallback?.(40);

      // 3. 应用平滑处理（如果启用）
      if (params.smoothing) {
        this.applyGliderSmoothing(timeSeries);
      }

      progressCallback?.(50);

      // 4. 计算统计信息
      const statistics = this.calculateGliderStatistics(timeSeries);

      progressCallback?.(65);

      // 5. 分析趋势
      const trends = this.analyzeGliderTrends(timeSeries);

      progressCallback?.(75);

      // 6. 异常检测
      const anomalies = params.includeAnomalies ? 
        this.detectGliderAnomalies(timeSeries) : [];

      progressCallback?.(85);

      // 7. 相关性分析
      const correlations = params.correlationAnalysis ? 
        this.calculateGliderCorrelations(timeSeries) : {
          speedVsWind: 0,
          headingErrorVsRudder: 0,
          efficiencyVsEnvironment: 0,
          batteryVsPerformance: 0
        };

      progressCallback?.(95);

      // 8. 生成洞察和总结
      const summary = this.generateGliderSummary(timeSeries, statistics, trends, anomalies);

      progressCallback?.(100);

      const result: GliderTimeSeriesResult = {
        timeSeries,
        statistics,
        trends,
        anomalies,
        correlations,
        summary
      };

      // 更新分析状态
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'completed',
        progress: 100,
        data: result,
      });

      return result;

    } catch (error) {
      // 更新错误状态
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '未知错误',
      });
      
      // console.error('滑翔机时序分析失败:', error);
      throw error;
    }
  }

  // 波浪场验证分析
  public async runWaveFieldValidation(
    waveFieldData: WaveFieldData[],
    params: ValidationParams,
    progressCallback?: (progress: number) => void
  ): Promise<WaveFieldValidationResult> {
    const analysisId = `validation_${Date.now()}`;

    try {
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'running',
        progress: 0,
      });

      progressCallback?.(10);

      // 1. 数据一致性检验
      const consistency = this.validateDataConsistency(waveFieldData);
      progressCallback?.(30);

      // 2. 统计分析
      const statistics = params.includeStatistics 
        ? this.calculateWaveStatistics(waveFieldData)
        : { mean: 0, std: 0, min: 0, max: 0, gridCoverage: 0 };
      progressCallback?.(50);

      // 3. 空间连续性检验
      const spatialContinuity = this.validateSpatialContinuity(waveFieldData);
      progressCallback?.(70);

      // 4. 时间稳定性检验
      const temporalStability = this.validateTemporalStability(waveFieldData);
      progressCallback?.(90);

      const result: WaveFieldValidationResult = {
        consistency,
        statistics,
        spatialContinuity,
        temporalStability,
      };

      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'completed',
        progress: 100,
        data: result,
      });

      progressCallback?.(100);
      return result;

    } catch (error) {
      this.runningAnalyses.set(analysisId, {
        id: analysisId,
        timestamp: Date.now(),
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '分析失败',
      });
      throw error;
    }
  }

  // 私有辅助方法
  private alignTyphoonWaveData(typhoonData: TyphoonData[], waveFieldData: WaveFieldData[]) {
    // 按时间戳对齐台风和波浪场数据
    const aligned = {
      typhoon: [] as TyphoonData[],
      wave: [] as WaveFieldData[],
    };

    // 简化：使用最接近的时间点匹配
    typhoonData.forEach(typhoon => {
      const closestWave = waveFieldData.reduce((prev, curr) => 
        Math.abs(curr.unixTimestamp - typhoon.unixTimestamp) < 
        Math.abs(prev.unixTimestamp - typhoon.unixTimestamp) ? curr : prev
      );
      
      aligned.typhoon.push(typhoon);
      aligned.wave.push(closestWave);
    });

    return aligned;
  }

  private createSpatialBuffers(typhoonData: TyphoonData[], radius: number) {
    return typhoonData.map(typhoon => ({
      center: [typhoon.longitude, typhoon.latitude] as [number, number],
      radius,
      avgWaveHeight: 2.5 + Math.random() * 2, // 模拟波高数据
      typhoonDistance: 0,
    }));
  }

  private calculateSpatialCorrelation(
    typhoonData: TyphoonData[],
    waveData: WaveFieldData[],
    bufferZones: any[],
    method: string
  ) {
    // 模拟空间相关性计算
    return typhoonData.map((typhoon, index) => ({
      longitude: typhoon.longitude,
      latitude: typhoon.latitude,
      correlation: 0.3 + Math.random() * 0.6, // 模拟相关系数
      intensity: typhoon.radius || 50,
    }));
  }

  private calculateSignificance(correlations: number[]): number {
    // 简化的显著性检验
    const avgCorr = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    return avgCorr > 0.5 ? 0.05 : 0.1; // p值
  }

  private createTimeSeries(
    typhoonData: TyphoonData[],
    waveFieldData: WaveFieldData[],
    timeWindow: number
  ) {
    // 创建时间序列数据
    const aligned = this.alignTyphoonWaveData(typhoonData, waveFieldData);
    
    return aligned.typhoon.map((typhoon, index) => ({
      timestamp: typhoon.unixTimestamp,
      typhoonIntensity: typhoon.radius || 50,
      waveHeight: 2 + Math.random() * 3, // 模拟波高
      correlation: 0.4 + Math.random() * 0.4,
    }));
  }

  private applySmoothing(timeSeries: any[]) {
    // 简单的移动平均平滑
    const windowSize = 3;
    for (let i = windowSize; i < timeSeries.length - windowSize; i++) {
      const window = timeSeries.slice(i - windowSize, i + windowSize + 1);
      timeSeries[i].waveHeight = window.reduce((sum, item) => sum + item.waveHeight, 0) / window.length;
      timeSeries[i].typhoonIntensity = window.reduce((sum, item) => sum + item.typhoonIntensity, 0) / window.length;
    }
  }

  // 滑翔机数据平滑处理
  private applyGliderSmoothing(timeSeries: any[]) {
    const windowSize = 3;
    for (let i = windowSize; i < timeSeries.length - windowSize; i++) {
      const window = timeSeries.slice(i - windowSize, i + windowSize + 1);
      
      // 平滑数值型字段
      const numFields = ['speed', 'effectiveSpeed', 'voltage', 'airTemp', 'waterTemp', 
                        'windSpeed', 'pressure', 'pitch', 'roll', 'rudderAngle'];
      
      numFields.forEach(field => {
        const values = window.map(item => item[field]).filter(v => !isNaN(v));
        if (values.length > 0) {
          timeSeries[i][field] = values.reduce((sum, val) => sum + val, 0) / values.length;
        }
      });
    }
  }

  // 计算滑翔机统计信息
  private calculateGliderStatistics(timeSeries: any[]) {
    const speeds = timeSeries.map(t => t.speed).filter(s => s > 0);
    const headingErrors = timeSeries.map(t => t.headingError);
    const efficiencies = timeSeries.map(t => t.speedEfficiency);
    const voltages = timeSeries.map(t => t.voltage);
    const airTemps = timeSeries.map(t => t.airTemp);
    const waterTemps = timeSeries.map(t => t.waterTemp);
    const windSpeeds = timeSeries.map(t => t.windSpeed);
    const pressures = timeSeries.map(t => t.pressure);
    const pitches = timeSeries.map(t => t.pitch);
    const rolls = timeSeries.map(t => t.roll);
    
    // 计算轨迹总距离
    let totalDistance = 0;
    for (let i = 1; i < timeSeries.length; i++) {
      const prev = timeSeries[i - 1];
      const curr = timeSeries[i];
      const dist = this.calculateDistance(prev.longitude, prev.latitude, curr.longitude, curr.latitude);
      totalDistance += dist;
    }

    return {
      trajectory: {
        totalDistance: totalDistance,
        averageSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
        maxSpeed: Math.max(...speeds),
        minSpeed: Math.min(...speeds),
        speedVariance: this.calculateVariance(speeds)
      },
      heading: {
        averageError: headingErrors.reduce((a, b) => a + b, 0) / headingErrors.length,
        maxError: Math.max(...headingErrors),
        rmsError: Math.sqrt(headingErrors.reduce((a, b) => a + b * b, 0) / headingErrors.length),
        errorTrend: this.determineTrend(headingErrors) as 'improving' | 'degrading' | 'stable'
      },
      environment: {
        tempStats: {
          airTempRange: [Math.min(...airTemps), Math.max(...airTemps)] as [number, number],
          waterTempRange: [Math.min(...waterTemps), Math.max(...waterTemps)] as [number, number],
          avgTempDiff: timeSeries.reduce((sum, t) => sum + t.tempDiff, 0) / timeSeries.length
        },
        windStats: {
          avgWindSpeed: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
          maxWindSpeed: Math.max(...windSpeeds),
          predominantDirection: this.calculatePredominantDirection(timeSeries.map(t => t.windDirection))
        },
        pressureStats: {
          range: [Math.min(...pressures), Math.max(...pressures)] as [number, number],
          trend: this.determineTrend(pressures) as 'rising' | 'falling' | 'stable'
        }
      },
      performance: {
        avgSpeedEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
        batteryConsumption: {
          voltageRange: [Math.min(...voltages), Math.max(...voltages)] as [number, number],
          drainRate: this.calculateBatteryDrainRate(timeSeries)
        },
        stabilityScore: this.calculateStabilityScore(pitches, rolls)
      }
    };
  }

  // 分析滑翔机趋势
  private analyzeGliderTrends(timeSeries: any[]) {
    const speeds = timeSeries.map(t => t.speed);
    const efficiencies = timeSeries.map(t => t.speedEfficiency);
    const voltages = timeSeries.map(t => t.voltage);
    const temps = timeSeries.map(t => t.tempDiff);
    const winds = timeSeries.map(t => t.windSpeed);

    // 计算航向一致性
    const headings = timeSeries.map(t => t.currentHeading);
    const consistency = this.calculateHeadingConsistency(headings);

    // 确定主要方向
    const avgLon = timeSeries.reduce((sum, t) => sum + t.longitude, 0) / timeSeries.length;
    const avgLat = timeSeries.reduce((sum, t) => sum + t.latitude, 0) / timeSeries.length;
    const startPoint = timeSeries[0];
    const endPoint = timeSeries[timeSeries.length - 1];
    const direction = this.calculateDirection(startPoint, endPoint);

    return {
      trajectory: {
        direction: direction as 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest',
        consistency: consistency
      },
      performance: {
        speedTrend: this.determineTrend(speeds) as 'increasing' | 'decreasing' | 'stable',
        efficiencyTrend: this.determineTrend(efficiencies) as 'improving' | 'degrading' | 'stable',
        batteryTrend: this.determineTrend(voltages.map(v => -v)) as 'draining' | 'stable' | 'charging'
      },
      environment: {
        tempTrend: this.determineTrend(temps) as 'warming' | 'cooling' | 'stable',
        windTrend: this.determineTrend(winds) as 'strengthening' | 'weakening' | 'stable'
      }
    };
  }

  // 检测滑翔机异常
  private detectGliderAnomalies(timeSeries: any[]): Array<{
    timestamp: number;
    type: 'heading_deviation' | 'speed_anomaly' | 'environmental_extreme' | 'power_issue';
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    threshold: number;
  }> {
    const anomalies: Array<{
      timestamp: number;
      type: 'heading_deviation' | 'speed_anomaly' | 'environmental_extreme' | 'power_issue';
      severity: 'low' | 'medium' | 'high';
      description: string;
      value: number;
      threshold: number;
    }> = [];
    
    // 计算各项指标的阈值
    const speeds = timeSeries.map(t => t.speed);
    const speedMean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const speedStd = Math.sqrt(this.calculateVariance(speeds));
    
    const headingErrors = timeSeries.map(t => t.headingError);
    const headingErrorMean = headingErrors.reduce((a, b) => a + b, 0) / headingErrors.length;
    const headingErrorStd = Math.sqrt(this.calculateVariance(headingErrors));
    
    const voltages = timeSeries.map(t => t.voltage);
    const voltageMean = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const voltageStd = Math.sqrt(this.calculateVariance(voltages));

    timeSeries.forEach((point, index) => {
      // 速度异常
      if (Math.abs(point.speed - speedMean) > 2 * speedStd) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'speed_anomaly' as const,
          severity: Math.abs(point.speed - speedMean) > 3 * speedStd ? 'high' as const : 'medium' as const,
          description: `速度异常: ${point.speed.toFixed(2)} (正常范围: ${(speedMean - speedStd).toFixed(2)}-${(speedMean + speedStd).toFixed(2)})`,
          value: point.speed,
          threshold: speedMean + 2 * speedStd
        });
      }

      // 航向偏差异常
      if (point.headingError > headingErrorMean + 2 * headingErrorStd) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'heading_deviation' as const,
          severity: point.headingError > headingErrorMean + 3 * headingErrorStd ? 'high' as const : 'medium' as const,
          description: `航向偏差过大: ${point.headingError.toFixed(1)}°`,
          value: point.headingError,
          threshold: headingErrorMean + 2 * headingErrorStd
        });
      }

      // 电压异常
      if (point.voltage < voltageMean - 2 * voltageStd) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'power_issue' as const,
          severity: point.voltage < voltageMean - 3 * voltageStd ? 'high' as const : 'medium' as const,
          description: `电压过低: ${point.voltage.toFixed(2)}V`,
          value: point.voltage,
          threshold: voltageMean - 2 * voltageStd
        });
      }

      // 环境极值
      if (point.windSpeed > 15 || point.airTemp > 40 || point.airTemp < -10) {
        anomalies.push({
          timestamp: point.timestamp,
          type: 'environmental_extreme' as const,
          severity: 'medium' as const,
          description: `环境条件极值: 风速${point.windSpeed.toFixed(1)}m/s, 气温${point.airTemp.toFixed(1)}°C`,
          value: Math.max(point.windSpeed, Math.abs(point.airTemp)),
          threshold: 15
        });
      }
    });

    return anomalies;
  }

  // 计算滑翔机相关性
  private calculateGliderCorrelations(timeSeries: any[]) {
    const speeds = timeSeries.map(t => t.speed);
    const winds = timeSeries.map(t => t.windSpeed);
    const headingErrors = timeSeries.map(t => t.headingError);
    const rudderAngles = timeSeries.map(t => t.rudderAngle);
    const efficiencies = timeSeries.map(t => t.speedEfficiency);
    const tempDiffs = timeSeries.map(t => t.tempDiff);
    const voltages = timeSeries.map(t => t.voltage);

    return {
      speedVsWind: this.calculateCorrelation(speeds, winds),
      headingErrorVsRudder: this.calculateCorrelation(headingErrors, rudderAngles),
      efficiencyVsEnvironment: this.calculateCorrelation(efficiencies, tempDiffs),
      batteryVsPerformance: this.calculateCorrelation(voltages, speeds)
    };
  }

  // 生成滑翔机分析总结
  private generateGliderSummary(timeSeries: any[], statistics: any, trends: any, anomalies: any[]) {
    const timeRange: [number, number] = [
      timeSeries[0].timestamp,
      timeSeries[timeSeries.length - 1].timestamp
    ];

    // 计算任务有效性评分
    const efficiencyScore = Math.min(statistics.performance.avgSpeedEfficiency * 100, 100);
    const headingScore = Math.max(0, 100 - statistics.heading.averageError * 2);
    const stabilityScore = statistics.performance.stabilityScore;
    const anomalyPenalty = Math.min(anomalies.length * 5, 30);
    
    const missionEffectiveness = Math.max(0, 
      (efficiencyScore + headingScore + stabilityScore) / 3 - anomalyPenalty
    );

    // 生成关键洞察
    const keyInsights = [];
    
    if (statistics.performance.avgSpeedEfficiency > 0.8) {
      keyInsights.push('滑翔机运行效率良好，速度性能优秀');
    } else if (statistics.performance.avgSpeedEfficiency < 0.6) {
      keyInsights.push('速度效率偏低，建议检查推进系统');
    }

    if (statistics.heading.averageError < 5) {
      keyInsights.push('航向控制精度高，导航系统工作正常');
    } else if (statistics.heading.averageError > 15) {
      keyInsights.push('航向偏差较大，建议校准导航系统');
    }

    if (anomalies.length > timeSeries.length * 0.1) {
      keyInsights.push('检测到较多异常事件，建议详细检查系统状态');
    }

    if (trends.performance.batteryTrend === 'draining') {
      const drainRate = statistics.performance.batteryConsumption.drainRate;
      if (drainRate > 0.5) {
        keyInsights.push('电池消耗率较高，需要监控电源系统');
      }
    }

    return {
      timeRange,
      dataPoints: timeSeries.length,
      missionEffectiveness: Math.round(missionEffectiveness),
      keyInsights
    };
  }

  // 辅助计算方法
  private calculateDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
    const R = 6371; // 地球半径 km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  }

  private determineTrend(values: number[]): string {
    if (values.length < 2) return 'stable';
    const start = values.slice(0, Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const end = values.slice(-Math.floor(values.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 3);
    const change = (end - start) / start;
    
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  private calculatePredominantDirection(directions: number[]): number {
    // 计算角度的平均值（考虑角度的循环性）
    let x = 0, y = 0;
    directions.forEach(dir => {
      x += Math.cos(dir * Math.PI / 180);
      y += Math.sin(dir * Math.PI / 180);
    });
    return Math.atan2(y, x) * 180 / Math.PI;
  }

  private calculateBatteryDrainRate(timeSeries: any[]): number {
    if (timeSeries.length < 2) return 0;
    const startVoltage = timeSeries[0].voltage;
    const endVoltage = timeSeries[timeSeries.length - 1].voltage;
    const timeHours = (timeSeries[timeSeries.length - 1].timestamp - timeSeries[0].timestamp) / (1000 * 60 * 60);
    return timeHours > 0 ? (startVoltage - endVoltage) / timeHours : 0;
  }

  private calculateStabilityScore(pitches: number[], rolls: number[]): number {
    const pitchVariance = this.calculateVariance(pitches);
    const rollVariance = this.calculateVariance(rolls);
    const totalVariance = pitchVariance + rollVariance;
    return Math.max(0, 100 - totalVariance * 10);
  }

  private calculateHeadingConsistency(headings: number[]): number {
    if (headings.length < 2) return 1;
    let totalDeviation = 0;
    for (let i = 1; i < headings.length; i++) {
      let diff = Math.abs(headings[i] - headings[i-1]);
      if (diff > 180) diff = 360 - diff;
      totalDeviation += diff;
    }
    const avgDeviation = totalDeviation / (headings.length - 1);
    return Math.max(0, 1 - avgDeviation / 180);
  }

  private calculateDirection(start: any, end: any): string {
    const dLon = end.longitude - start.longitude;
    const dLat = end.latitude - start.latitude;
    
    if (Math.abs(dLon) < 0.01 && Math.abs(dLat) < 0.01) return 'stable';
    
    const angle = Math.atan2(dLat, dLon) * 180 / Math.PI;
    const normalizedAngle = (angle + 360) % 360;
    
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'east';
    if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'northeast';
    if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'north';
    if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'northwest';
    if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'west';
    if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'southwest';
    if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'south';
    return 'southeast';
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // 获取分析状态
  public getAnalysisStatus(analysisId: string): AnalysisResult | undefined {
    return this.runningAnalyses.get(analysisId);
  }

  // 清理完成的分析
  public clearCompletedAnalyses(): void {
    for (const [id, result] of this.runningAnalyses.entries()) {
      if (result.status === 'completed' || result.status === 'error') {
        this.runningAnalyses.delete(id);
      }
    }
  }

  // 缺失的波浪场验证方法
  private validateDataConsistency(waveFieldData: WaveFieldData[]) {
    // 模拟数据一致性检验
    const issues = [];
    
    if (Math.random() > 0.8) {
      issues.push({
        type: 'gap' as const,
        location: [125.5, 29.1] as [number, number],
        severity: 'medium' as const,
        description: '发现数据缺失区域',
      });
    }
    
    if (Math.random() > 0.7) {
      issues.push({
        type: 'outlier' as const,
        location: [126.1, 29.5] as [number, number],
        severity: 'low' as const,
        description: '发现异常高值点',
      });
    }
    
    return {
      score: 85 + Math.random() * 10, // 85-95分
      issues,
    };
  }

  private calculateWaveStatistics(waveFieldData: WaveFieldData[]) {
    // 模拟统计计算
    const values = Array.from({length: 1000}, () => 2 + Math.random() * 4);
    
    return {
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      std: Math.sqrt(values.reduce((acc, val, _, arr) => {
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return acc + Math.pow(val - mean, 2);
      }, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      gridCoverage: 92 + Math.random() * 6, // 92-98%
    };
  }

  private validateSpatialContinuity(waveFieldData: WaveFieldData[]) {
    const discontinuities = [];
    
    // 模拟空间不连续点
    if (Math.random() > 0.6) {
      discontinuities.push({
        location: [125.8, 28.8] as [number, number],
        magnitude: 0.5 + Math.random() * 1.5,
      });
    }
    
    return {
      score: 80 + Math.random() * 15, // 80-95分
      discontinuities,
    };
  }

  private validateTemporalStability(waveFieldData: WaveFieldData[]) {
    const abruptChanges = [];
    
    // 模拟突变检测
    if (Math.random() > 0.7) {
      const randomTimestamp = Math.floor(Date.now() / 1000) - Math.random() * 86400;
      abruptChanges.push({
        timestamp: randomTimestamp,
        magnitude: 1.5 + Math.random() * 2,
      });
    }
    
    return {
      score: 75 + Math.random() * 20, // 75-95分
      variance: 0.3 + Math.random() * 0.4,
      abruptChanges,
    };
  }

  // 缺失的时序分析方法
  private analyzeTrends(timeSeries: any[]): {
    typhoonTrend: 'increasing' | 'decreasing' | 'stable';
    waveTrend: 'increasing' | 'decreasing' | 'stable';
    correlation: number;
  } {
    // 模拟趋势分析
    const trends = ['increasing', 'decreasing', 'stable'] as const;
    return {
      typhoonTrend: trends[Math.floor(Math.random() * 3)],
      waveTrend: trends[Math.floor(Math.random() * 3)],
      correlation: 0.3 + Math.random() * 0.4
    };
  }

  private detectPeaks(timeSeries: any[]): Array<{
    timestamp: number;
    type: 'typhoon' | 'wave';
    value: number;
  }> {
    // 模拟峰值检测
    const peaks = [];
    const numPeaks = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numPeaks; i++) {
      peaks.push({
        timestamp: Date.now() - Math.random() * 86400000,
        type: Math.random() > 0.5 ? 'typhoon' as const : 'wave' as const,
        value: 3 + Math.random() * 5
      });
    }
    
    return peaks;
  }

  private calculateTemporalSummary(timeSeries: any[]) {
    return {
      maxWaveHeight: 4 + Math.random() * 3,
      maxTyphoonIntensity: 8 + Math.random() * 4,
      avgDelay: 2 + Math.random() * 4 // 小时
    };
  }
}

// 导出单例实例
export const analysisEngine = AnalysisEngine.getInstance();
