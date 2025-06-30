// src/components/analysis/AnalysisResultDisplay.tsx
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import clsx from "clsx";
import type {
  SpatialCorrelationResult,
  TemporalComparisonResult,
  WaveFieldValidationResult,
  GliderTimeSeriesResult,
} from "../../services/analysisEngine";

interface AnalysisResultDisplayProps {
  analysisType?: "spatial" | "temporal" | "validation" | "glider-timeseries";
  result:
    | SpatialCorrelationResult
    | TemporalComparisonResult
    | WaveFieldValidationResult
    | GliderTimeSeriesResult;
  isLoading?: boolean;
  type?: "spatial" | "temporal" | "validation"; // 保持向后兼容
}

const AnalysisResultDisplay: React.FC<AnalysisResultDisplayProps> = ({
  analysisType,
  type, // 向后兼容
  result,
  isLoading = false,
}) => {
  // 支持旧的type参数以及新的analysisType参数
  const displayType = analysisType || type;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">分析计算中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayType === "spatial" && (
        <SpatialCorrelationDisplay
          result={result as SpatialCorrelationResult}
        />
      )}
      {displayType === "temporal" && (
        <TemporalComparisonDisplay
          result={result as TemporalComparisonResult}
        />
      )}
      {displayType === "validation" && (
        <WaveFieldValidationDisplay
          result={result as WaveFieldValidationResult}
        />
      )}
      {displayType === "glider-timeseries" && (
        <GliderTimeSeriesDisplay result={result as GliderTimeSeriesResult} />
      )}
    </div>
  );
};

// 空间相关性结果展示
const SpatialCorrelationDisplay: React.FC<{
  result: SpatialCorrelationResult;
}> = ({ result }) => {
  const correlationData = result.spatialPoints.map((point, index) => ({
    index: index + 1,
    correlation: point.correlation,
    intensity: point.intensity,
  }));

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.7) return "text-green-600";
    if (correlation > 0.4) return "text-yellow-600";
    return "text-red-600";
  };

  const getCorrelationLabel = (correlation: number) => {
    if (correlation > 0.7) return "强相关";
    if (correlation > 0.4) return "中等相关";
    return "弱相关";
  };

  return (
    <div className="space-y-6">
      {/* 摘要统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">平均相关系数</div>
          <div
            className={clsx(
              "text-2xl font-bold",
              getCorrelationColor(result.summary.avgCorrelation)
            )}
          >
            {result.summary.avgCorrelation.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">
            {getCorrelationLabel(result.summary.avgCorrelation)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最大相关系数</div>
          <div className="text-2xl font-bold text-green-600">
            {result.summary.maxCorrelation.toFixed(3)}
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最小相关系数</div>
          <div className="text-2xl font-bold text-orange-600">
            {result.summary.minCorrelation.toFixed(3)}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">分析点数</div>
          <div className="text-2xl font-bold text-purple-600">
            {result.summary.analysisCount}
          </div>
        </div>
      </div>

      {/* 相关性分布图 */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">空间相关性分布</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={correlationData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="intensity"
              name="台风强度"
              label={{
                value: "台风强度 (km)",
                position: "insideBottom",
                offset: -10,
              }}
            />
            <YAxis
              dataKey="correlation"
              name="相关系数"
              label={{ value: "相关系数", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                typeof value === "number" ? value.toFixed(3) : value,
                name === "correlation" ? "相关系数" : "台风强度",
              ]}
            />
            <Scatter name="相关性" dataKey="correlation" fill="#3B82F6" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 显著性检验结果 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">统计显著性</h4>
        <div className="flex items-center gap-2">
          {result.significanceLevel < 0.05 ? (
            <CheckCircle size={20} className="text-green-600" />
          ) : (
            <AlertTriangle size={20} className="text-yellow-600" />
          )}
          <span className="text-sm text-gray-700">
            显著性水平: p = {result.significanceLevel.toFixed(3)}
            {result.significanceLevel < 0.05 ? " (统计显著)" : " (不显著)"}
          </span>
        </div>
      </div>
    </div>
  );
};

// 时序对比结果展示
const TemporalComparisonDisplay: React.FC<{
  result: TemporalComparisonResult;
}> = ({ result }) => {
  const chartData = result.timeSeries.map((item) => ({
    time: new Date(item.timestamp * 1000).toLocaleDateString(),
    台风强度: item.typhoonIntensity,
    波高: item.waveHeight,
    相关系数: item.correlation,
  }));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp size={16} className="text-green-600" />;
      case "decreasing":
        return <TrendingDown size={16} className="text-red-600" />;
      case "stable":
        return <Minus size={16} className="text-gray-600" />;
      default:
        return null;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "上升趋势";
      case "decreasing":
        return "下降趋势";
      case "stable":
        return "稳定趋势";
      default:
        return "未知";
    }
  };

  return (
    <div className="space-y-6">
      {/* 趋势分析摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon(result.trends.typhoonTrend)}
            <span className="font-medium text-gray-800">台风趋势</span>
          </div>
          <div className="text-sm text-gray-600">
            {getTrendLabel(result.trends.typhoonTrend)}
          </div>
        </div>

        <div className="bg-cyan-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon(result.trends.waveTrend)}
            <span className="font-medium text-gray-800">波浪趋势</span>
          </div>
          <div className="text-sm text-gray-600">
            {getTrendLabel(result.trends.waveTrend)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">总体相关性</div>
          <div className="text-2xl font-bold text-green-600">
            {result.trends.correlation.toFixed(3)}
          </div>
        </div>
      </div>

      {/* 时间序列图 */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">时间序列对比</h4>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="台风强度"
              stroke="#EF4444"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="波高"
              stroke="#3B82F6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 峰值分析 */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">峰值检测结果</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              台风强度峰值
            </h5>
            <div className="space-y-2">
              {result.peaks
                .filter((p) => p.type === "typhoon")
                .slice(0, 3)
                .map((peak, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(peak.timestamp * 1000).toLocaleString()}
                    </span>
                    <span className="font-medium text-red-600">
                      {peak.value.toFixed(1)} km
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">波高峰值</h5>
            <div className="space-y-2">
              {result.peaks
                .filter((p) => p.type === "wave")
                .slice(0, 3)
                .map((peak, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(peak.timestamp * 1000).toLocaleString()}
                    </span>
                    <span className="font-medium text-blue-600">
                      {peak.value.toFixed(1)} m
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最大台风强度</div>
          <div className="text-2xl font-bold text-red-600">
            {result.summary.maxTyphoonIntensity.toFixed(1)} km
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最大波高</div>
          <div className="text-2xl font-bold text-blue-600">
            {result.summary.maxWaveHeight.toFixed(1)} m
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">平均响应延迟</div>
          <div className="text-2xl font-bold text-purple-600">
            {result.summary.avgDelay.toFixed(1)} 小时
          </div>
        </div>
      </div>
    </div>
  );
};

// 波浪场验证结果展示
const WaveFieldValidationDisplay: React.FC<{
  result: WaveFieldValidationResult;
}> = ({ result }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    return "需改进";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <XCircle size={16} className="text-red-600" />;
      case "medium":
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case "low":
        return <Info size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 验证评分总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">数据一致性</div>
          <div
            className={clsx(
              "text-2xl font-bold",
              getScoreColor(result.consistency.score)
            )}
          >
            {result.consistency.score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">
            {getScoreLevel(result.consistency.score)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">空间连续性</div>
          <div
            className={clsx(
              "text-2xl font-bold",
              getScoreColor(result.spatialContinuity.score)
            )}
          >
            {result.spatialContinuity.score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">
            {getScoreLevel(result.spatialContinuity.score)}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">时间稳定性</div>
          <div
            className={clsx(
              "text-2xl font-bold",
              getScoreColor(result.temporalStability.score)
            )}
          >
            {result.temporalStability.score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">
            {getScoreLevel(result.temporalStability.score)}
          </div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">数据统计指标</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">平均值</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.statistics.mean.toFixed(2)} m
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">标准差</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.statistics.std.toFixed(2)} m
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">最大值</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.statistics.max.toFixed(2)} m
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">网格覆盖率</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.statistics.gridCoverage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 问题检测 */}
      {result.consistency.issues.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-4">检测到的问题</h4>
          <div className="space-y-3">
            {result.consistency.issues.map((issue, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {issue.type === "gap"
                      ? "数据缺失"
                      : issue.type === "outlier"
                      ? "异常值"
                      : "不连续性"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {issue.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    位置: {issue.location[0].toFixed(3)},{" "}
                    {issue.location[1].toFixed(3)}
                  </div>
                </div>
                <span
                  className={clsx(
                    "px-2 py-1 rounded text-xs font-medium",
                    issue.severity === "high"
                      ? "bg-red-100 text-red-800"
                      : issue.severity === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {issue.severity === "high"
                    ? "高"
                    : issue.severity === "medium"
                    ? "中"
                    : "低"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 时间稳定性详情 */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">时间稳定性分析</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">时间方差</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.temporalStability.variance.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">突变次数</div>
            <div className="text-lg font-semibold text-gray-800">
              {result.temporalStability.abruptChanges.length}
            </div>
          </div>
        </div>

        {result.temporalStability.abruptChanges.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              检测到的突变
            </h5>
            <div className="space-y-2">
              {result.temporalStability.abruptChanges
                .slice(0, 3)
                .map((change, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(change.timestamp * 1000).toLocaleString()}
                    </span>
                    <span className="font-medium text-red-600">
                      变化幅度: {change.magnitude.toFixed(2)} m
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 滑翔机时序分析结果展示
const GliderTimeSeriesDisplay: React.FC<{
  result: GliderTimeSeriesResult;
}> = ({ result }) => {
  // 准备时序图表数据
  const timeSeriesData = result.timeSeries.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    timestamp: point.timestamp,
    speed: point.speed,
    effectiveSpeed: point.effectiveSpeed,
    headingError: point.headingError,
    voltage: point.voltage,
    speedEfficiency: point.speedEfficiency * 100, // 转换为百分比
    windSpeed: point.windSpeed,
    temperature: point.airTemp,
  }));

  // 轨迹数据
  const trajectoryData = result.timeSeries.map((point) => ({
    longitude: point.longitude,
    latitude: point.latitude,
    time: new Date(point.timestamp).toLocaleTimeString(),
  }));

  return (
    <div className="space-y-6">
      {/* 性能图表 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-800 mb-4">速度性能分析</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#8884d8"
              name="实际速度 (m/s)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="effectiveSpeed"
              stroke="#82ca9d"
              name="有效速度 (m/s)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 航向误差图表 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-800 mb-4">航向控制分析</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="headingError"
              stroke="#ff7300"
              name="航向误差 (°)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 电池和效率 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-4">电池电压</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="voltage"
                stroke="#dc2626"
                name="电压 (V)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-4">速度效率</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="speedEfficiency"
                stroke="#059669"
                name="效率 (%)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 环境条件 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-800 mb-4">环境条件监测</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="windSpeed"
              stroke="#0ea5e9"
              name="风速 (m/s)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="temperature"
              stroke="#f59e0b"
              name="气温 (°C)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 轨迹散点图 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-800 mb-4">航行轨迹</h4>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={trajectoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="longitude"
              name="经度"
              type="number"
              domain={["dataMin - 0.01", "dataMax + 0.01"]}
            />
            <YAxis
              dataKey="latitude"
              name="纬度"
              type="number"
              domain={["dataMin - 0.01", "dataMax + 0.01"]}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter dataKey="latitude" fill="#8884d8" name="航行轨迹点" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 相关性分析 */}
      {result.correlations && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-4">相关性分析</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {result.correlations.speedVsWind.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">速度-风速相关性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.correlations.headingErrorVsRudder.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">航向误差-舵角相关性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {result.correlations.efficiencyVsEnvironment.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">效率-环境相关性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {result.correlations.batteryVsPerformance.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">电池-性能相关性</div>
            </div>
          </div>
        </div>
      )}

      {/* 趋势总结 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">趋势分析总结</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-purple-700">轨迹趋势</div>
            <div className="text-gray-600">
              主方向: {result.trends.trajectory.direction}
            </div>
            <div className="text-gray-600">
              一致性: {(result.trends.trajectory.consistency * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium text-purple-700">性能趋势</div>
            <div className="text-gray-600">
              速度: {result.trends.performance.speedTrend}
            </div>
            <div className="text-gray-600">
              效率: {result.trends.performance.efficiencyTrend}
            </div>
          </div>
          <div>
            <div className="font-medium text-purple-700">环境趋势</div>
            <div className="text-gray-600">
              温度: {result.trends.environment.tempTrend}
            </div>
            <div className="text-gray-600">
              风况: {result.trends.environment.windTrend}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultDisplay;
