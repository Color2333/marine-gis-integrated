// src/components/analysis/AnalysisToolsPanel.tsx
import { useState, useEffect } from "react";
import {
  BarChart3,
  MapPin,
  Clock,
  Waves,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronRight,
  X,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../../stores/appStore";
import {
  analysisEngine,
  type SpatialAnalysisParams,
  type TemporalAnalysisParams,
  type ValidationParams,
  type GliderAnalysisParams,
  type SpatialCorrelationResult,
  type TemporalComparisonResult,
  type WaveFieldValidationResult,
  type GliderTimeSeriesResult,
} from "../../services/analysisEngine";
import AnalysisResultDisplay from "./AnalysisResultDisplay";

interface AnalysisToolsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  className?: string;
  initialActiveTab?: string;
}

// 分析工具类型定义
interface AnalysisTool {
  id: string;
  title: string;
  description: string;
  icon: any; // 简化图标类型
  color: string;
  bgColor: string;
  component: React.ComponentType;
}

const AnalysisToolsPanel: React.FC<AnalysisToolsPanelProps> = ({
  isVisible,
  onClose,
  className,
  initialActiveTab = "spatial",
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, any>>({});

  // 从store获取数据
  const { data } = useAppStore();

  // 当initialActiveTab变化时更新activeTab
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  if (!isVisible) {
    return null;
  }

  // 分析工具配置
  const analysisTools: AnalysisTool[] = [
    {
      id: "spatial",
      title: "空间相关性分析",
      description: "分析台风路径与波浪场的空间分布关系",
      icon: MapPin,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      component: SpatialCorrelationAnalysis,
    },
    {
      id: "temporal",
      title: "时序对比分析",
      description: "对比台风移动轨迹与波浪场变化的时间序列",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50",
      component: TemporalComparisonAnalysis,
    },
    {
      id: "glider",
      title: "滑翔机时序分析",
      description: "分析波浪滑翔机的运行性能、航迹轨迹和环境响应",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      component: GliderTimeSeriesAnalysis,
    },
    {
      id: "validation",
      title: "波浪场验证分析",
      description: "验证SWAN波浪场模型数据的准确性和一致性",
      icon: Waves,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      component: WaveFieldValidationAnalysis,
    },
  ];

  const activeTool = analysisTools.find((tool) => tool.id === activeTab);
  const ActiveComponent = activeTool?.component;

  return (
    <div
      className={clsx(
        "fixed top-4 left-1/2 transform -translate-x-1/2 w-[800px] bg-white rounded-lg shadow-xl border border-gray-200 z-50",
        "animate-in slide-in-from-top-2 duration-300 max-h-[90vh] overflow-hidden flex flex-col",
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-800">海洋数据分析工具</h3>
            <div className="text-sm text-gray-600">
              台风路径与波浪场综合分析平台
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {/* 工具选项卡 */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {analysisTools.map((tool) => {
          const isActive = activeTab === tool.id;
          const ToolIcon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? `${tool.color} ${tool.bgColor} border-b-2 border-current`
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              )}
            >
              <ToolIcon size={16} />
              <span>{tool.title}</span>
            </button>
          );
        })}
      </div>

      {/* 工具描述 */}
      {activeTool && (
        <div
          className={clsx(
            "px-4 py-3 border-b border-gray-200",
            activeTool.bgColor
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <activeTool.icon size={16} className={activeTool.color} />
            <span className={clsx("font-medium", activeTool.color)}>
              {activeTool.title}
            </span>
          </div>
          <p className="text-sm text-gray-600">{activeTool.description}</p>
        </div>
      )}

      {/* 分析工具内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

// 空间相关性分析组件
const SpatialCorrelationAnalysis: React.FC = () => {
  const [analysisParams, setAnalysisParams] = useState<SpatialAnalysisParams>({
    bufferRadius: 50, // km
    correlationMethod: "pearson",
    includeIntensity: true,
  });

  const { data } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SpatialCorrelationResult | null>(null);

  const runAnalysis = async () => {
    if (data.typhoon.length === 0 || data.waveField.length === 0) {
      alert("请先加载台风轨迹和波浪场数据");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const analysisResult = await analysisEngine.runSpatialCorrelationAnalysis(
        data.typhoon,
        data.waveField,
        analysisParams,
        (progressValue) => setProgress(progressValue)
      );
      setResult(analysisResult);
    } catch (error) {
      // // console.error("空间相关性分析失败:", error);
      alert("分析失败，请检查数据");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">分析参数设置</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              缓冲区半径 (km)
            </label>
            <input
              type="number"
              value={analysisParams.bufferRadius}
              onChange={(e) =>
                setAnalysisParams((prev) => ({
                  ...prev,
                  bufferRadius: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="10"
              max="200"
              step="10"
              disabled={isRunning}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              相关性方法
            </label>
            <select
              value={analysisParams.correlationMethod}
              onChange={(e) =>
                setAnalysisParams((prev) => ({
                  ...prev,
                  correlationMethod: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isRunning}
            >
              <option value="pearson">皮尔逊相关</option>
              <option value="spearman">斯皮尔曼相关</option>
              <option value="kendall">肯德尔相关</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={analysisParams.includeIntensity}
              onChange={(e) =>
                setAnalysisParams((prev) => ({
                  ...prev,
                  includeIntensity: e.target.checked,
                }))
              }
              className="mr-2"
              disabled={isRunning}
            />
            <span className="text-sm text-gray-700">包含台风强度分析</span>
          </label>
        </div>

        {/* 进度条 */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>分析进度</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 分析结果展示 */}
      {result ? (
        <AnalysisResultDisplay
          type="spatial"
          result={result}
          isLoading={isRunning}
        />
      ) : (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">分析结果</h4>
          <div className="text-center py-8 text-gray-500">
            <MapPin size={48} className="mx-auto mb-2 text-gray-400" />
            <p>点击"开始分析"按钮开始空间相关性分析</p>
            <p className="text-sm mt-1">将分析台风轨迹与波浪场的空间分布关系</p>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-lg transition-colors",
            isRunning
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              分析中...
            </>
          ) : (
            <>
              <Play size={16} />
              开始分析
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// 时序对比分析组件
const TemporalComparisonAnalysis: React.FC = () => {
  const [timeParams, setTimeParams] = useState<TemporalAnalysisParams>({
    timeWindow: 6, // 小时
    smoothing: true,
    showTrends: true,
  });

  const { data } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TemporalComparisonResult | null>(null);

  const runAnalysis = async () => {
    if (data.typhoon.length === 0 || data.waveField.length === 0) {
      alert("请先加载台风轨迹和波浪场数据");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const analysisResult = await analysisEngine.runTemporalComparisonAnalysis(
        data.typhoon,
        data.waveField,
        timeParams,
        (progressValue) => setProgress(progressValue)
      );
      setResult(analysisResult);
    } catch (error) {
      // console.error("时序对比分析失败:", error);
      alert("分析失败，请检查数据");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">时间序列参数</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时间窗口 (小时)
            </label>
            <input
              type="number"
              value={timeParams.timeWindow}
              onChange={(e) =>
                setTimeParams((prev) => ({
                  ...prev,
                  timeWindow: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="24"
              step="1"
              disabled={isRunning}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={timeParams.smoothing}
                onChange={(e) =>
                  setTimeParams((prev) => ({
                    ...prev,
                    smoothing: e.target.checked,
                  }))
                }
                className="mr-2"
                disabled={isRunning}
              />
              <span className="text-sm text-gray-700">数据平滑处理</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={timeParams.showTrends}
                onChange={(e) =>
                  setTimeParams((prev) => ({
                    ...prev,
                    showTrends: e.target.checked,
                  }))
                }
                className="mr-2"
                disabled={isRunning}
              />
              <span className="text-sm text-gray-700">显示趋势线</span>
            </label>
          </div>
        </div>

        {/* 进度条 */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>分析进度</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 分析结果展示 */}
      {result ? (
        <AnalysisResultDisplay
          type="temporal"
          result={result}
          isLoading={isRunning}
        />
      ) : (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">时序对比结果</h4>
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-2 text-gray-400" />
            <p>点击"开始分析"按钮开始时序对比分析</p>
            <p className="text-sm mt-1">
              将对比台风移动轨迹与波浪场变化的时间序列
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-lg transition-colors",
            isRunning
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          )}
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              分析中...
            </>
          ) : (
            <>
              <TrendingUp size={16} />
              开始分析
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// 波浪场验证分析组件
const WaveFieldValidationAnalysis: React.FC = () => {
  const [validationParams, setValidationParams] = useState<ValidationParams>({
    validationType: "consistency",
    gridResolution: "high",
    includeStatistics: true,
  });

  const { data } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WaveFieldValidationResult | null>(null);

  const runAnalysis = async () => {
    if (data.waveField.length === 0) {
      alert("请先加载波浪场数据");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const analysisResult = await analysisEngine.runWaveFieldValidation(
        data.waveField,
        validationParams,
        (progressValue) => setProgress(progressValue)
      );
      setResult(analysisResult);
    } catch (error) {
      // console.error("波浪场验证分析失败:", error);
      alert("分析失败，请检查数据");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-cyan-50 rounded-lg p-4">
        <h4 className="font-medium text-cyan-800 mb-2">验证参数设置</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              验证类型
            </label>
            <select
              value={validationParams.validationType}
              onChange={(e) =>
                setValidationParams((prev) => ({
                  ...prev,
                  validationType: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isRunning}
            >
              <option value="consistency">数据一致性检验</option>
              <option value="continuity">空间连续性检验</option>
              <option value="temporal">时间稳定性检验</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              网格分辨率
            </label>
            <select
              value={validationParams.gridResolution}
              onChange={(e) =>
                setValidationParams((prev) => ({
                  ...prev,
                  gridResolution: e.target.value as any,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isRunning}
            >
              <option value="high">高分辨率</option>
              <option value="medium">中等分辨率</option>
              <option value="low">低分辨率</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={validationParams.includeStatistics}
              onChange={(e) =>
                setValidationParams((prev) => ({
                  ...prev,
                  includeStatistics: e.target.checked,
                }))
              }
              className="mr-2"
              disabled={isRunning}
            />
            <span className="text-sm text-gray-700">包含统计指标</span>
          </label>
        </div>

        {/* 进度条 */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>验证进度</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 验证结果展示 */}
      {result ? (
        <AnalysisResultDisplay
          type="validation"
          result={result}
          isLoading={isRunning}
        />
      ) : (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3">验证结果</h4>
          <div className="text-center py-8 text-gray-500">
            <Waves size={48} className="mx-auto mb-2 text-gray-400" />
            <p>点击"开始验证"按钮开始波浪场验证分析</p>
            <p className="text-sm mt-1">
              将验证SWAN波浪场模型数据的准确性和一致性
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-lg transition-colors",
            isRunning
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-cyan-600 text-white hover:bg-cyan-700"
          )}
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              验证中...
            </>
          ) : (
            <>
              <Activity size={16} />
              开始验证
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// 滑翔机时序分析组件
const GliderTimeSeriesAnalysis: React.FC = () => {
  const [gliderParams, setGliderParams] = useState<GliderAnalysisParams>({
    timeWindow: 24, // 小时
    smoothing: true,
    includeAnomalies: true,
    correlationAnalysis: true,
    performanceMetrics: true,
  });

  const { data } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GliderTimeSeriesResult | null>(null);

  const runAnalysis = async () => {
    if (data.glider.length === 0) {
      alert("请先加载滑翔机观测数据");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const analysisResult = await analysisEngine.runGliderTimeSeriesAnalysis(
        data.glider,
        gliderParams,
        (progressValue) => setProgress(progressValue)
      );
      setResult(analysisResult);
    } catch (error) {
      // console.error("滑翔机时序分析失败:", error);
      alert("分析失败，请检查数据");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 rounded-lg p-4">
        <h4 className="font-medium text-purple-800 mb-2">滑翔机分析参数</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分析时间窗口 (小时)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={gliderParams.timeWindow || 24}
              onChange={(e) =>
                setGliderParams({
                  ...gliderParams,
                  timeWindow: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gliderParams.smoothing}
                onChange={(e) =>
                  setGliderParams({
                    ...gliderParams,
                    smoothing: e.target.checked,
                  })
                }
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">数据平滑处理</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gliderParams.includeAnomalies}
                onChange={(e) =>
                  setGliderParams({
                    ...gliderParams,
                    includeAnomalies: e.target.checked,
                  })
                }
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">异常检测</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gliderParams.correlationAnalysis}
                onChange={(e) =>
                  setGliderParams({
                    ...gliderParams,
                    correlationAnalysis: e.target.checked,
                  })
                }
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">相关性分析</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gliderParams.performanceMetrics}
                onChange={(e) =>
                  setGliderParams({
                    ...gliderParams,
                    performanceMetrics: e.target.checked,
                  })
                }
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">性能指标计算</span>
            </label>
          </div>
        </div>
      </div>

      {/* 进度显示 */}
      {isRunning && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">分析进度</span>
            <span className="text-sm text-gray-500">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {result && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">滑翔机时序分析结果</h4>

          {/* 基本统计 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h5 className="font-medium text-gray-700 mb-3">基本统计信息</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">数据点数</div>
                <div className="font-medium text-purple-600">
                  {result.summary.dataPoints}
                </div>
              </div>
              <div>
                <div className="text-gray-500">总航行距离</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.trajectory.totalDistance.toFixed(2)} km
                </div>
              </div>
              <div>
                <div className="text-gray-500">平均速度</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.trajectory.averageSpeed.toFixed(2)} m/s
                </div>
              </div>
              <div>
                <div className="text-gray-500">任务有效性</div>
                <div className="font-medium text-purple-600">
                  {result.summary.missionEffectiveness}%
                </div>
              </div>
            </div>
          </div>

          {/* 航向分析 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h5 className="font-medium text-gray-700 mb-3">航向控制分析</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">平均航向误差</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.heading.averageError.toFixed(1)}°
                </div>
              </div>
              <div>
                <div className="text-gray-500">最大航向误差</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.heading.maxError.toFixed(1)}°
                </div>
              </div>
              <div>
                <div className="text-gray-500">RMS误差</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.heading.rmsError.toFixed(1)}°
                </div>
              </div>
            </div>
          </div>

          {/* 性能指标 */}
          {gliderParams.performanceMetrics && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h5 className="font-medium text-gray-700 mb-3">性能指标</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">平均速度效率</div>
                  <div className="font-medium text-purple-600">
                    {(
                      result.statistics.performance.avgSpeedEfficiency * 100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">稳定性评分</div>
                  <div className="font-medium text-purple-600">
                    {result.statistics.performance.stabilityScore.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">电池消耗率</div>
                  <div className="font-medium text-purple-600">
                    {result.statistics.performance.batteryConsumption.drainRate.toFixed(
                      3
                    )}{" "}
                    V/h
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 环境数据 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h5 className="font-medium text-gray-700 mb-3">环境条件分析</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">平均风速</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.environment.windStats.avgWindSpeed.toFixed(
                    1
                  )}{" "}
                  m/s
                </div>
              </div>
              <div>
                <div className="text-gray-500">平均温差 (气-水)</div>
                <div className="font-medium text-purple-600">
                  {result.statistics.environment.tempStats.avgTempDiff.toFixed(
                    1
                  )}
                  °C
                </div>
              </div>
            </div>
          </div>

          {/* 异常检测结果 */}
          {gliderParams.includeAnomalies && result.anomalies.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h5 className="font-medium text-gray-700 mb-3">
                异常事件检测 ({result.anomalies.length} 个)
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {result.anomalies.slice(0, 5).map((anomaly, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div>
                      <span
                        className={clsx(
                          "inline-block w-2 h-2 rounded-full mr-2",
                          anomaly.severity === "high"
                            ? "bg-red-500"
                            : anomaly.severity === "medium"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                        )}
                      ></span>
                      {anomaly.description}
                    </div>
                    <div className="text-gray-500">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {result.anomalies.length > 5 && (
                  <div className="text-sm text-gray-500 text-center">
                    还有 {result.anomalies.length - 5} 个异常事件...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 关键洞察 */}
          {result.summary.keyInsights.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h5 className="font-medium text-purple-800 mb-3">关键洞察</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                {result.summary.keyInsights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 分析图表组件 */}
          <AnalysisResultDisplay
            result={result}
            analysisType="glider-timeseries"
          />
        </div>
      )}

      {/* 运行分析按钮 */}
      <div className="flex justify-center">
        <button
          onClick={runAnalysis}
          disabled={isRunning || data.glider.length === 0}
          className={clsx(
            "px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors",
            isRunning || data.glider.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          )}
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              分析中...
            </>
          ) : (
            <>
              <Activity size={16} />
              开始滑翔机分析
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisToolsPanel;
