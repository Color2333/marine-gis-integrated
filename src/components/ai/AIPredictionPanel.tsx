// src/components/ai/AIPredictionPanel.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Brain,
  Navigation,
  Target,
  TrendingUp,
  Zap,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  Play,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useMapManagerStore } from "../../hooks/useMapManager";
import {
  deepSeekAPI,
  DeepSeekAPIError,
  type PredictionResult as APIPredictionResult,
  type GliderDataPoint,
} from "../../services/deepseekAPI";

interface PredictionParams {
  startIndex: number;
  historyPoints: number;
  predictPoints: number;
  aiModel: string;
  includePosition: boolean;
  includeHeading: boolean;
  includeSpeed: boolean;
  includeTime: boolean;
}

// 使用 API 服务中的类型定义
type PredictedPoint = import("../../services/deepseekAPI").PredictedPoint;
type PredictionResult = APIPredictionResult;

const AIPredictionPanel: React.FC = () => {
  const { data, activeModule } = useAppStore();
  const { mapManager } = useMapManagerStore();

  const [params, setParams] = useState<PredictionParams>({
    startIndex: 0,
    historyPoints: 10,
    predictPoints: 5,
    aiModel: "deepseek-chat",
    includePosition: true,
    includeHeading: true,
    includeSpeed: false,
    includeTime: false,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    connected: boolean;
    latency: number;
    message: string;
    error?: string;
  }>({
    connected: false,
    latency: 0,
    message: "正在检查 DeepSeek API 连接...",
  });

  // 检查 DeepSeek API 连接状态
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const status = await deepSeekAPI.testConnection();
        setApiStatus({
          connected: status.connected,
          latency: status.latency,
          message: status.message,
        });
      } catch (error) {
        const errorMessage =
          error instanceof DeepSeekAPIError
            ? error.message
            : error instanceof Error
            ? error.message
            : "未知错误";

        setApiStatus({
          connected: false,
          latency: 0,
          message: "API 连接失败",
          error: errorMessage,
        });
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // 每30秒检查一次
    return () => clearInterval(interval);
  }, []);

  // 当模块激活/非激活时，控制 AI 预测图层的显示
  useEffect(() => {
    if (mapManager) {
      const isAIModule = activeModule === "ai-prediction";
      mapManager.setAIPredictionLayersVisible(isAIModule);

      if (!isAIModule) {
        // 当离开 AI 模块时，清除图层但保留结果数据
        // 这样用户切换回来时还能看到之前的预测结果
        // // console.log("📝 离开AI预测模块，隐藏相关图层");
      } else {
        // // console.log("🤖 进入AI预测模块，显示相关图层");
        // 如果有选取的数据，重新显示
        updateMapDisplay();
      }
    }
  }, [activeModule, mapManager]);

  // 当参数变化时，更新地图显示的选取点
  useEffect(() => {
    if (activeModule === "ai-prediction") {
      updateMapDisplay();
    }
  }, [params.startIndex, params.historyPoints, activeModule]);

  // 更新地图显示
  const updateMapDisplay = useCallback(() => {
    if (
      !mapManager ||
      activeModule !== "ai-prediction" ||
      data.glider.length === 0
    )
      return;

    try {
      // 获取选取的数据点
      const selectedData = prepareTrainingData();

      if (selectedData.length > 0) {
        // 显示选取的训练点
        mapManager.showAISelectedPoints(
          selectedData,
          params.startIndex,
          params.historyPoints
        );

        // 如果有预测结果，也一起显示
        if (result && result.predictedPoints.length > 0) {
          const lastTrainingPoint = selectedData[selectedData.length - 1];
          mapManager.showAIPredictedResults(
            result.predictedPoints,
            result.confidence,
            lastTrainingPoint
          );
        }
      }
    } catch (error) {
      // // console.warn("更新地图显示失败:", error);
    }
  }, [
    mapManager,
    activeModule,
    data.glider,
    params.startIndex,
    params.historyPoints,
    result,
  ]);

  // 清除地图显示
  const clearMapDisplay = useCallback(() => {
    if (mapManager) {
      mapManager.clearAIPredictionLayers();
    }
  }, [mapManager]);

  // 获取可选的数据点范围
  const getAvailableRanges = useCallback(() => {
    const ranges = [];
    const maxStart = Math.max(0, data.glider.length - params.historyPoints);

    for (let i = 0; i <= maxStart; i += 5) {
      const endIndex = Math.min(
        i + params.historyPoints - 1,
        data.glider.length - 1
      );
      const startPoint = data.glider[i];
      const endPoint = data.glider[endIndex];

      ranges.push({
        value: i,
        label: `点 ${i + 1}-${endIndex + 1}`,
        description: `${startPoint?.date} ${startPoint?.time} ~ ${endPoint?.date} ${endPoint?.time}`,
      });
    }

    return ranges;
  }, [data.glider, params.historyPoints]);

  // 准备AI预测的数据
  const prepareTrainingData = useCallback((): GliderDataPoint[] => {
    const startIdx = params.startIndex;
    const endIdx = startIdx + params.historyPoints;
    const selectedPoints = data.glider.slice(startIdx, endIdx);

    return selectedPoints.map((point, index) => ({
      index: startIdx + index + 1,
      timestamp: `${point.date} ${point.time}`,
      latitude: point.latitude,
      longitude: point.longitude,
      expectedHeading: point.expectedHeading,
      currentHeading: point.currentHeading,
      waterTemp: point.waterTemp,
      windSpeed: point.windSpeed,
      windDirection: point.windDirection,
      speed: point.speed,
    }));
  }, [data.glider, params.startIndex, params.historyPoints]);

  // 真实的 AI 预测过程（使用 DeepSeek API）
  const runAIPrediction = async () => {
    if (data.glider.length < params.historyPoints) {
      alert(`需要至少 ${params.historyPoints} 个数据点才能进行预测`);
      return;
    }

    if (!apiStatus.connected) {
      alert("DeepSeek API 未连接，请检查 API Key 配置和网络连接");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    // 先清除之前的预测结果显示
    clearMapDisplay();

    try {
      // 准备训练数据
      const trainingData = prepareTrainingData();
      // // console.log("🤖 准备AI预测数据:", trainingData);

      // 在地图上显示选取的训练数据点
      if (mapManager && activeModule === "ai-prediction") {
        mapManager.showAISelectedPoints(
          trainingData,
          params.startIndex,
          params.historyPoints
        );
      }

      // 调用 DeepSeek API 进行预测
      const predictionResult = await deepSeekAPI.predictTrajectory(
        trainingData,
        params.predictPoints,
        params.aiModel,
        params.includeHeading,
        params.includeSpeed,
        (progress) => setProgress(progress)
      );

      setResult(predictionResult);

      // 在地图上显示预测结果
      if (
        mapManager &&
        predictionResult.predictedPoints.length > 0 &&
        activeModule === "ai-prediction"
      ) {
        const lastTrainingPoint = trainingData[trainingData.length - 1];
        mapManager.showAIPredictedResults(
          predictionResult.predictedPoints,
          predictionResult.confidence,
          lastTrainingPoint
        );

        // 可选：自动缩放到预测数据范围
        setTimeout(() => {
          if (mapManager) {
            // // console.log("🎯 自动缩放到预测数据范围");
            try {
              mapManager.zoomToAIPredictionData(
                trainingData,
                predictionResult.predictedPoints
              );
            } catch (error) {
              // // console.warn("自动缩放失败:", error);
            }
          }
        }, 500);

        // // console.log("🗺️ 在地图上显示AI预测结果完成");
      }

      // // console.log("✅ AI预测完成:", predictionResult);
    } catch (error) {
      // // console.error("AI预测失败:", error);

      if (error instanceof DeepSeekAPIError) {
        alert(`AI预测失败: ${error.message}`);
      } else {
        alert("AI预测过程中出现未知错误，请重试");
      }
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  // 清除预测结果
  const clearResults = () => {
    setResult(null);
    setProgress(0);
    clearMapDisplay();
  };

  return (
    <div className="space-y-4">
      {/* DeepSeek API 连接状态 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Zap size={16} className="mr-2 text-blue-500" />
          DeepSeek API 连接状态
        </h4>
        <div
          className={`p-3 rounded border ${
            apiStatus.connected
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {apiStatus.connected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm font-medium ${
                apiStatus.connected ? "text-green-800" : "text-red-800"
              }`}
            >
              {apiStatus.connected ? "已连接到 DeepSeek API" : "连接断开"}
            </span>
          </div>
          <div
            className={`text-xs mt-1 ${
              apiStatus.connected ? "text-green-600" : "text-red-600"
            }`}
          >
            {apiStatus.message} • 延迟: {apiStatus.latency.toFixed(0)}ms
          </div>
          {apiStatus.error && (
            <div className="text-xs mt-1 text-red-700 bg-red-100 p-2 rounded">
              错误详情: {apiStatus.error}
            </div>
          )}
        </div>
      </div>

      {/* 预测参数设置 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Brain size={16} className="mr-2 text-purple-500" />
          AI预测参数
        </h4>

        <div className="space-y-4">
          {/* 数据范围选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              选择训练数据范围
            </label>
            <select
              value={params.startIndex}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  startIndex: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={isRunning}
            >
              {getAvailableRanges().map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label} ({range.description})
                </option>
              ))}
            </select>
            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-700">
                💡 <strong>地图显示：</strong>选取的数据点将在地图上以
                <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mx-1"></span>
                橙色圆点标出，便于查看数据分布
              </p>
            </div>
          </div>

          {/* 预测参数 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                历史数据点数
              </label>
              <select
                value={params.historyPoints}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    historyPoints: Number(e.target.value),
                  }))
                }
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={isRunning}
              >
                <option value={10}>10 个点</option>
                <option value={15}>15 个点</option>
                <option value={20}>20 个点</option>
                <option value={25}>25 个点</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                预测点数
              </label>
              <select
                value={params.predictPoints}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    predictPoints: Number(e.target.value),
                  }))
                }
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={isRunning}
              >
                <option value={3}>3 个点</option>
                <option value={5}>5 个点</option>
                <option value={8}>8 个点</option>
                <option value={10}>10 个点</option>
              </select>
            </div>
          </div>

          {/* AI模型选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              DeepSeek 模型
            </label>
            <select
              value={params.aiModel}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, aiModel: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={isRunning}
            >
              <option value="deepseek-chat">DeepSeek Chat (推荐)</option>
              <option value="deepseek-coder">DeepSeek Coder</option>
              <option value="deepseek-reasoner">DeepSeek Reasoner</option>
            </select>
          </div>

          {/* 预测内容选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              预测内容
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={params.includePosition}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      includePosition: e.target.checked,
                    }))
                  }
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-700">位置坐标</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={params.includeHeading}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      includeHeading: e.target.checked,
                    }))
                  }
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-700">航向角度</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={params.includeSpeed}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      includeSpeed: e.target.checked,
                    }))
                  }
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-700">航行速度</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={params.includeTime}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      includeTime: e.target.checked,
                    }))
                  }
                  className="mr-2"
                  disabled={isRunning}
                />
                <span className="text-sm text-gray-700">到达时间</span>
              </label>
            </div>
          </div>

          {/* 进度条 */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>AI预测进度</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={runAIPrediction}
              disabled={isRunning || !apiStatus.connected}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  预测中...
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" />
                  开始预测
                </>
              )}
            </button>

            {result && (
              <>
                <button
                  onClick={() => {
                    if (mapManager && result) {
                      try {
                        const trainingData = prepareTrainingData();
                        // console.log(
                        //   "🎯 执行定位缩放，训练数据:",
                        //   trainingData.length,
                        //   "预测数据:",
                        //   result.predictedPoints.length
                        // );
                        mapManager.zoomToAIPredictionData(
                          trainingData,
                          result.predictedPoints
                        );
                      } catch (error) {
                        // console.error("定位缩放失败:", error);
                        alert("定位失败，请检查控制台错误信息");
                      }
                    } else {
                      // console.warn("缺少必要参数:", {
                      //   mapManager: !!mapManager,
                      //   result: !!result,
                      // });
                      alert("定位功能不可用，请确保已有预测结果");
                    }
                  }}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center"
                  title="缩放地图到预测区域"
                >
                  <Target size={16} className="mr-2" />
                  定位
                </button>
                <button
                  onClick={clearResults}
                  disabled={isRunning}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center"
                >
                  <RotateCcw size={16} className="mr-2" />
                  清除
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 预测结果展示 */}
      {result ? (
        <div className="card">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Target size={16} className="mr-2 text-green-500" />
            预测结果
          </h4>

          {/* 结果概览 */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {result.predictedPoints.length}
                </div>
                <div className="text-xs text-gray-600">预测点数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {(result.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">平均置信度</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {(result.executionTime / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-gray-600">预测用时</div>
              </div>
            </div>

            {/* 地图显示说明 */}
            <div className="mt-3 pt-3 border-t border-green-300">
              <p className="text-xs text-green-700 text-center">
                🗺️ <strong>地图显示：</strong>
                <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mx-1"></span>
                训练点 •
                <span className="inline-block w-2 h-2 bg-green-500 rounded mx-1 transform rotate-45"></span>
                高置信预测点 •
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded mx-1 transform rotate-45"></span>
                中等置信 •
                <span className="inline-block w-2 h-2 bg-red-500 rounded mx-1 transform rotate-45"></span>
                低置信 •
                <span
                  className="inline-block w-6 h-0.5 bg-green-500 mx-1"
                  style={{ borderTop: "2px dashed" }}
                ></span>
                预测轨迹
              </p>
            </div>
          </div>

          {/* 预测点详情 */}
          <div className="space-y-2 mb-4">
            <h5 className="font-medium text-gray-700">预测轨迹点</h5>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {result.predictedPoints.map((point, index) => (
                <div
                  key={index}
                  className="text-xs bg-gray-50 p-2 rounded border"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">点 {index + 1}</span>
                    <span
                      className={`px-2 py-1 rounded ${
                        point.confidence > 0.8
                          ? "bg-green-100 text-green-800"
                          : point.confidence > 0.6
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {(point.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-gray-600 mt-1">
                    坐标: {point.latitude.toFixed(6)},{" "}
                    {point.longitude.toFixed(6)}
                    {point.heading && ` • 航向: ${point.heading.toFixed(1)}°`}
                    {point.speed && ` • 速度: ${point.speed.toFixed(1)} km/h`}
                  </div>
                  {point.estimatedTime && (
                    <div className="text-gray-500">
                      预计到达: {point.estimatedTime}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI分析 */}
          <div className="space-y-3">
            <h5 className="font-medium text-gray-700">AI分析报告</h5>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-800">{result.analysis}</p>
            </div>

            <h5 className="font-medium text-gray-700">影响因素</h5>
            <div className="space-y-1">
              {result.factors.map((factor, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <CheckCircle
                    size={14}
                    className="text-green-500 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-gray-700">{factor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h4 className="font-semibold text-gray-800 mb-3">📊 预测结果</h4>
          <div className="text-center py-8 text-gray-500">
            <Brain size={48} className="mx-auto mb-2 text-gray-400" />
            <p>AI预测结果将在此显示</p>
            <p className="text-sm mt-1">包含预测航迹点、置信度评估等信息</p>
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <AlertCircle size={16} className="mr-2 text-blue-500" />
          使用说明
        </h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            • <strong>AI 驱动</strong>：使用 DeepSeek AI 进行真实的航迹预测分析
          </p>
          <p>
            • <strong>地图可视化</strong>：选取点和预测结果会实时显示在地图上
          </p>
          <p>
            • <strong>数据要求</strong>：选择连续的滑翔器观测点作为训练数据
          </p>
          <p>
            • <strong>预测原理</strong>：AI 分析历史航迹、海况、风向等多维度数据
          </p>
          <p>
            • <strong>置信度颜色</strong>
            ：绿色(&gt;80%)高置信，黄色(60-80%)中等，红色(&lt;60%)低置信
          </p>
          <p>
            • <strong>精度说明</strong>
            ：短期预测(3-5点)精度较高，长期预测仅供参考
          </p>
          <p>
            • <strong>地图标记</strong>
            ：橙色圆点=训练数据，彩色菱形=预测点，虚线=预测轨迹
          </p>
          <p>
            • <strong>应用建议</strong>：结合实际海况和专业判断使用预测结果
          </p>
          <p>
            • <strong>API 配置</strong>：需要在 .env 文件中配置有效的 DeepSeek
            API Key
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIPredictionPanel;
