// src/components/layout/MainLayout.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Waves,
  Navigation,
  BarChart3,
  Settings,
  Menu,
  X,
  Activity,
  Wind,
  Thermometer,
  Play,
  Pause,
  RotateCcw,
  Download,
  Camera,
  Maximize,
  HelpCircle,
  Home,
  SkipForward,
  SkipBack,
  Square,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { MapContainer } from "../map/MapContainer";
import { AnimationControls } from "../controls/AnimationControls";
import { TimeInfoPanel } from "../common/TimeInfoPanel";
import LayerManager from "../common/LayerManager";
import DataStatsPanel from "../common/DataStatsPanel";
import DataChart from "../common/DataChart";
import FloatingInfoPanel from "../common/FloatingInfoPanel";
import AnalysisToolsPanel from "../analysis/AnalysisToolsPanel";
import SystemSettings from "../settings/SystemSettings";
import AIPredictionPanel from "../ai/AIPredictionPanel";
import { useGliderAnimation } from "../../hooks/useGliderAnimation";
import { useMapManagerStore } from "../../hooks/useMapManager";
import clsx from "clsx";

// 模块配置
const modules = [
  {
    id: "dashboard",
    name: "系统概览",
    icon: BarChart3,
    description: "系统整体状态和数据概览",
  },
  {
    id: "wave-glider",
    name: "波浪滑翔器",
    icon: Navigation,
    description: "台风白鹿观测数据分析",
  },
  {
    id: "wave-field",
    name: "SWAN波浪场",
    icon: Waves,
    description: "台风梅花波浪场动画",
  },
  {
    id: "ai-prediction",
    name: "AI航迹预测",
    icon: Activity,
    description: "基于滑翔器数据的AI航迹预测",
  },
  {
    id: "integrated-analysis",
    name: "综合分析",
    icon: Activity,
    description: "多源数据融合分析",
  },
  {
    id: "settings",
    name: "系统设置",
    icon: Settings,
    description: "系统配置和参数设置",
  },
];

const MainLayout: React.FC = () => {
  // 状态管理
  const {
    activeModule,
    sidebarOpen,
    animationState,
    data,
    systemStatus,
    setActiveModule,
    setSidebarOpen,
    setAnimationPlaying,
    setCurrentFrame,
    initializeSystem,
  } = useAppStore();

  // 分析工具面板状态
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [analysisActiveTab, setAnalysisActiveTab] = useState<string>("spatial");

  // 系统设置状态
  const [systemSettings, setSystemSettings] = useState<any>(null);

  // 地图管理器状态
  const { mapManager } = useMapManagerStore();

  // 滑翔器点变化回调 - 使用useCallback稳定引用
  const handleGliderPointChange = useCallback(
    (point: any, index: number) => {
      // 更新地图上的滑翔器位置
      if (mapManager) {
        mapManager.updateCurrentPosition(point, "glider");
        // // console.log(`🗺️ 滑翔器移动到点 ${index + 1}/${data.glider.length}:`, {
        //   lat: point.latitude,
        //   lon: point.longitude,
        //   time: point.date + " " + point.time,
        // });
      } else {
        // // console.warn("地图管理器未初始化，无法更新滑翔器位置");
      }
    },
    [mapManager, data.glider.length]
  );

  // 滑翔器动画控制
  const gliderAnimation = useGliderAnimation({
    data: data.glider,
    onPointChange: handleGliderPointChange,
    onAnimationEnd: () => {
      // // console.log("✅ 滑翔器动画播放完成");
    },
  });

  // 初始化系统
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  // 设置全局跳转函数，供ArcGIS popup使用
  useEffect(() => {
    (window as any).jumpToGliderPoint = (index: number) => {
      // // console.log(`🎯 从地图popup跳转到滑翔器观测点 ${index + 1}`);
      if (activeModule === "wave-glider") {
        gliderAnimation.goToPoint(index);
        // 关闭popup
        if (mapManager) {
          mapManager.closePopup();
        }
      } else {
        // 如果不在滑翔器模块，先切换到滑翔器模块
        setActiveModule("wave-glider");
        // 延迟执行跳转，确保模块切换完成
        setTimeout(() => {
          gliderAnimation.goToPoint(index);
          if (mapManager) {
            mapManager.closePopup();
          }
        }, 100);
      }
    };

    // 清理函数
    return () => {
      delete (window as any).jumpToGliderPoint;
    };
  }, [activeModule, gliderAnimation, mapManager, setActiveModule]);

  // 处理模块切换时的动画控制
  useEffect(() => {
    // 当切换到滑翔器模块时，停止波浪场动画
    if (activeModule === "wave-glider") {
      setAnimationPlaying(false);
      // console.log("🔄 切换到滑翔器模块，停止波浪场动画");
    }
    // 当切换到波浪场模块时，停止滑翔器动画并确保台风影响区域可见
    else if (activeModule === "wave-field") {
      gliderAnimation.stop();
      // console.log("🔄 切换到波浪场模块，停止滑翔器动画");

      // 确保台风影响区域图层可见
      if (mapManager && data.typhoon.length > 0) {
        setTimeout(() => {
          try {
            mapManager.setLayerVisible("typhoonInfluenceArea", true);
            mapManager.setLayerVisible("typhoonCenter", true);
            // 显示第一个台风点和影响区域作为预览
            mapManager.updateCurrentPosition(data.typhoon[0], "typhoon");
            // console.log("🌀 已显示台风影响区域预览");
          } catch (error) {
            // console.warn("显示台风影响区域失败:", error);
          }
        }, 500);
      }
    }
    // 其他模块时停止所有动画
    else {
      setAnimationPlaying(false);
      gliderAnimation.stop();
      // console.log("🔄 切换到其他模块，停止所有动画");
    }
  }, [activeModule, setAnimationPlaying, mapManager, data.typhoon]); // 添加必要的依赖

  // 动画控制
  const handlePlayPause = () => {
    setAnimationPlaying(!animationState.isPlaying);
  };

  const handleStop = () => {
    setAnimationPlaying(false);
    setCurrentFrame(0);
  };

  // 简化的动画控制函数
  const startAnimation = (dataType?: string) => {
    setAnimationPlaying(true);
  };

  const pauseAnimation = () => {
    setAnimationPlaying(false);
  };

  // 截图功能
  const handleScreenshot = async () => {
    try {
      if (mapManager) {
        // 调用地图管理器的截图方法
        const screenshotUrl = await mapManager.takeScreenshot();

        // 创建下载链接
        const link = document.createElement("a");
        link.href = screenshotUrl;
        link.download = `marine-gis-screenshot-${
          new Date().toISOString().split("T")[0]
        }.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // console.log("✅ 截图成功并已下载");

        // 显示成功提示
        alert("截图已保存到下载文件夹！");
      } else {
        // 如果没有地图管理器，使用浏览器原生截图API
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
          const video = document.createElement("video");
          video.srcObject = stream;
          video.play();

          video.onloadedmetadata = () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `marine-gis-screenshot-${
                  new Date().toISOString().split("T")[0]
                }.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert("截图已保存到下载文件夹！");
              }
            });

            stream.getTracks().forEach((track) => track.stop());
          };
        } else {
          // console.log("浏览器不支持屏幕捕获API");
          alert(
            "您的浏览器不支持截图功能，请手动截图保存（Ctrl+Shift+S 或 Cmd+Shift+4）"
          );
        }
      }
    } catch (error) {
      // console.error("截图失败:", error);
      alert("截图失败，请手动截图保存（Ctrl+Shift+S 或 Cmd+Shift+4）");
    }
  };

  // 重置视图功能
  const fitToData = () => {
    if (mapManager) {
      try {
        // 优先使用系统设置中的默认视图
        if (
          systemSettings?.map?.defaultCenter &&
          systemSettings?.map?.defaultZoom
        ) {
          const { defaultZoom, defaultCenter } = systemSettings.map;
          mapManager.setView({
            center: defaultCenter,
            zoom: defaultZoom,
          });
          // console.log(
          //   `🎯 重置视图到默认位置: [${defaultCenter.join(
          //     ", "
          //   )}], 缩放: ${defaultZoom}`
          // );
        } else {
          // 使用优化后的默认视图区域
          const defaultView = {
            center: [126.32, 28.24] as [number, number],
            zoom: 7,
          };
          mapManager.setView(defaultView);
          // console.log(
          //   `🎯 重置视图到优化默认区域: [${defaultView.center.join(
          //     ", "
          //   )}], 缩放: ${defaultView.zoom}`
          // );
        }

        // 如果有数据，可以进一步优化视图范围
        if (data.glider.length > 0 || data.typhoon.length > 0) {
          // 计算数据范围
          let minLon = Infinity,
            maxLon = -Infinity;
          let minLat = Infinity,
            maxLat = -Infinity;

          // 计算滑翔器数据范围
          data.glider.forEach((point) => {
            if (point.longitude !== undefined && point.latitude !== undefined) {
              minLon = Math.min(minLon, point.longitude);
              maxLon = Math.max(maxLon, point.longitude);
              minLat = Math.min(minLat, point.latitude);
              maxLat = Math.max(maxLat, point.latitude);
            }
          });

          // 计算台风数据范围
          data.typhoon.forEach((point) => {
            if (point.longitude !== undefined && point.latitude !== undefined) {
              minLon = Math.min(minLon, point.longitude);
              maxLon = Math.max(maxLon, point.longitude);
              minLat = Math.min(minLat, point.latitude);
              maxLat = Math.max(maxLat, point.latitude);
            }
          });

          // 如果有有效的数据范围，调整视图
          if (
            isFinite(minLon) &&
            isFinite(maxLon) &&
            isFinite(minLat) &&
            isFinite(maxLat)
          ) {
            const centerLon = (minLon + maxLon) / 2;
            const centerLat = (minLat + maxLat) / 2;
            const extent = Math.max(maxLon - minLon, maxLat - minLat);

            // 根据数据范围计算合适的缩放级别
            let zoom = 8;
            if (extent < 0.5) zoom = 11;
            else if (extent < 1) zoom = 10;
            else if (extent < 2) zoom = 9;
            else if (extent < 5) zoom = 8;
            else zoom = 7;

            mapManager.setView({
              center: [centerLon, centerLat],
              zoom: zoom,
            });
            // console.log(
            //   `🎯 根据数据范围优化视图: [${centerLon.toFixed(
            //     2
            //   )}, ${centerLat.toFixed(2)}], 缩放: ${zoom}`
            // );
          }
        }
      } catch (error) {
        // console.error("重置视图失败:", error);
        alert("重置视图失败，请检查地图状态");
      }
    } else {
      // console.log("地图管理器未初始化，无法重置视图");
      alert("地图未初始化，请稍后再试");
    }
  };

  // 打开分析面板并设置活动标签页
  const openAnalysisPanel = (tabId: string) => {
    setAnalysisActiveTab(tabId);
    setShowAnalysisPanel(true);
  };

  // 处理系统设置变化
  const handleSettingsChange = useCallback(
    (settings: any) => {
      setSystemSettings(settings);
      // console.log("系统设置已更新:", settings);

      // 应用设置到地图管理器
      if (mapManager && settings) {
        try {
          // 应用底图设置
          if (settings.map?.basemap) {
            // console.log("切换底图到:", settings.map.basemap);
            mapManager.changeBasemap(settings.map.basemap);
          }

          // 应用图层可见性设置
          if (settings.layers) {
            // console.log("应用图层设置:", settings.layers);

            // 滑翔器图层
            mapManager.setLayerVisible("glider", settings.layers.gliderVisible);
            mapManager.setLayerOpacity("glider", settings.layers.gliderOpacity);

            // 台风图层
            mapManager.setLayerVisible(
              "typhoon",
              settings.layers.typhoonVisible
            );
            mapManager.setLayerOpacity(
              "typhoon",
              settings.layers.typhoonOpacity
            );

            // 波浪场图层
            mapManager.setLayerVisible(
              "waveField",
              settings.layers.waveFieldVisible
            );
            mapManager.setLayerOpacity(
              "waveField",
              settings.layers.waveFieldOpacity
            );
          }

          // 应用地图视图设置
          if (settings.map?.defaultZoom && settings.map?.defaultCenter) {
            // 不自动改变视图，只在用户点击重置视图时使用
            // console.log("地图默认设置已保存");
          }
        } catch (error) {
          // console.error("应用系统设置失败:", error);
        }
      } else {
        // console.warn("地图管理器未初始化，无法应用设置");
      }
    },
    [mapManager]
  );

  // 渲染侧边栏
  const renderSidebar = () => (
    <div
      className={clsx(
        "transition-all duration-300 flex flex-col panel-primary border-r",
        sidebarOpen ? "w-80" : "w-16"
      )}
      style={{
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* 头部 */}
      <div
        className="p-4 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between">
          {sidebarOpen && (
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              🌊 海洋GIS集成系统
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;

          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={clsx(
                "nav-button",
                isActive ? "nav-button-active" : "nav-button-inactive"
              )}
              title={!sidebarOpen ? module.name : ""}
            >
              <Icon
                size={20}
                className={isActive ? "text-ocean-600" : "text-gray-500"}
              />
              {sidebarOpen && (
                <div className="flex-1 text-left">
                  <div className="font-medium">{module.name}</div>
                  <div className="text-xs text-gray-500">
                    {module.description}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部状态 */}
      {sidebarOpen && (
        <div
          className="px-4 py-3 border-t"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div
            className="text-xs space-y-1"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  "w-2 h-2 rounded-full",
                  systemStatus === "地图初始化完成"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                )}
              ></div>
              <span>状态: {systemStatus}</span>
            </div>
            <div>地图引擎: ArcGIS API 4.28</div>
            <div>数据点: {data.glider.length + data.typhoon.length}</div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染顶部工具栏
  const renderTopBar = () => (
    <div
      className="px-6 py-4 border-b"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {modules.find((m) => m.id === activeModule)?.name}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {modules.find((m) => m.id === activeModule)?.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleScreenshot} className="btn-ocean">
            <Camera size={16} className="mr-2" />
            截图
          </button>
          <button onClick={() => fitToData()} className="btn-marine">
            <Home size={16} className="mr-2" />
            重置视图
          </button>
          <button onClick={handleHelp} className="btn-ocean">
            <HelpCircle size={16} className="mr-2" />
            帮助
          </button>
        </div>
      </div>
    </div>
  );

  // 渲染控制面板
  const renderControlPanel = () => (
    <div
      className="w-96 border-r p-4 overflow-y-auto panel-secondary"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      {activeModule === "dashboard" && renderDashboard()}
      {activeModule === "wave-glider" && renderWaveGliderControls()}
      {activeModule === "wave-field" && renderWaveFieldControls()}
      {activeModule === "ai-prediction" && renderAIPredictionControls()}
      {activeModule === "integrated-analysis" && renderIntegratedAnalysis()}
      {activeModule === "settings" && (
        <SystemSettings onSettingsChange={handleSettingsChange} />
      )}
    </div>
  );

  // 仪表板 - 简化版本，只显示基本信息和快速导航
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* 系统状态 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🚀 系统状态</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <div className="flex justify-between">
            <span>系统状态：</span>
            <span className="font-medium text-green-600">{systemStatus}</span>
          </div>
          <div className="flex justify-between">
            <span>滑翔机数据点：</span>
            <span className="font-medium text-blue-600">
              {data.glider.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>台风轨迹点：</span>
            <span className="font-medium text-red-600">
              {data.typhoon.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>波浪场帧数：</span>
            <span className="font-medium text-cyan-600">
              {data.waveField.length}
            </span>
          </div>
        </div>
      </div>

      {/* 数据概览 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">📊 数据说明</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            • <strong>波浪滑翔器</strong>：台风白鹿期间的海洋观测数据
          </p>
          <p>
            • <strong>SWAN波浪场</strong>：台风梅花的波浪场模拟数据
          </p>
          <p>
            • <strong>台风轨迹</strong>：与波浪场数据时间同步
          </p>
        </div>
      </div>

      {/* 快速导航 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🎯 快速导航</h4>
        <div className="space-y-2">
          <button
            onClick={() => setActiveModule("wave-glider")}
            className="btn-ocean w-full flex items-center justify-center"
          >
            <Navigation size={16} className="mr-2" />
            滑翔器观测分析
          </button>
          <button
            onClick={() => setActiveModule("wave-field")}
            className="btn-marine w-full flex items-center justify-center"
          >
            <Waves size={16} className="mr-2" />
            波浪场动画播放
          </button>
          <button
            onClick={() => setActiveModule("ai-prediction")}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 w-full flex items-center justify-center"
          >
            <Activity size={16} className="mr-2" />
            AI航迹预测
          </button>
          <button
            onClick={() => setActiveModule("integrated-analysis")}
            className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 w-full flex items-center justify-center"
          >
            <Activity size={16} className="mr-2" />
            数据融合分析
          </button>
        </div>
      </div>

      {/* 技术信息 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">⚙️ 技术信息</h4>
        <div className="text-xs text-gray-500 space-y-1">
          <div>地图引擎: ArcGIS API 4.28</div>
          <div>前端框架: React + TypeScript</div>
          <div>动画引擎: 自定义 RequestAnimationFrame</div>
          <div>状态管理: Zustand</div>
          <div>AI接入：Deepseek API接入</div>
          <div>同济大学海洋与地球科学学院</div>
        </div>
      </div>
    </div>
  );

  // 波浪滑翔器控制 - 独立动画控制
  const renderWaveGliderControls = () => (
    <div className="space-y-4">
      {/* 滑翔器动画控制 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🎮 滑翔器动画控制</h4>
        <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
          <p className="text-blue-800 text-sm">
            <strong>独立播放模式</strong>
            <br />
            遍历滑翔器观测数据，右上角显示当前点详细信息
          </p>
        </div>

        {/* 滑翔器动画控制按钮 */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <button
              onClick={gliderAnimation.play}
              disabled={gliderAnimation.isPlaying || data.glider.length === 0}
              className="btn-ocean flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} className="mr-2" />
              播放
            </button>
            <button
              onClick={gliderAnimation.pause}
              disabled={!gliderAnimation.isPlaying}
              className="btn-marine flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause size={16} className="mr-2" />
              暂停
            </button>
            <button
              onClick={gliderAnimation.stop}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex-1"
            >
              <Square size={16} className="mr-2" />
              停止
            </button>
          </div>

          {/* 单步控制 */}
          <div className="flex space-x-2">
            <button
              onClick={gliderAnimation.previousPoint}
              disabled={gliderAnimation.currentIndex === 0}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipBack size={16} className="mr-2" />
              上一点
            </button>
            <button
              onClick={gliderAnimation.nextPoint}
              disabled={gliderAnimation.currentIndex >= data.glider.length - 1}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward size={16} className="mr-2" />
              下一点
            </button>
          </div>

          {/* 速度控制 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              播放速度: {gliderAnimation.speed.toFixed(1)} 秒/点
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={gliderAnimation.speed}
              onChange={(e) =>
                gliderAnimation.setSpeed(parseFloat(e.target.value))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>快速 (0.1s)</span>
              <span>慢速 (5.0s)</span>
            </div>
          </div>

          {/* 进度信息 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                当前点: {gliderAnimation.currentIndex + 1} /{" "}
                {gliderAnimation.totalPoints}
              </span>
              <span>进度: {gliderAnimation.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-ocean-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${gliderAnimation.progress}%` }}
              />
            </div>
          </div>

          {/* 循环和信息面板控制 */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={gliderAnimation.loop}
                onChange={(e) => gliderAnimation.setLoop(e.target.checked)}
                className="rounded"
              />
              循环播放
            </label>
            <button
              onClick={gliderAnimation.toggleInfoPanel}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-ocean-600 transition-colors"
            >
              {gliderAnimation.showInfoPanel ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
              {gliderAnimation.showInfoPanel ? "隐藏" : "显示"}信息面板
            </button>
          </div>
        </div>
      </div>

      {/* 数据概览 */}
      <DataStatsPanel dataType="glider" />

      {/* 图层控制 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🗂️ 滑翔器图层</h4>
        <LayerManager compact />
      </div>

      {/* 数据分析图表 */}
      {data.glider.length > 0 && (
        <>
          <div className="card">
            <h4 className="font-semibold text-gray-800 mb-3">🌡️ 水温变化</h4>
            <DataChart
              data={data.glider}
              type="temperature"
              width={320}
              height={160}
            />
          </div>
          <div className="card">
            <h4 className="font-semibold text-gray-800 mb-3">💨 风速变化</h4>
            <DataChart
              data={data.glider}
              type="windSpeed"
              width={320}
              height={160}
            />
          </div>
        </>
      )}

      {/* 白鹿台风信息 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🌪️ 台风白鹿信息</h4>
        <div className="bg-orange-50 p-3 rounded border border-orange-200 text-sm">
          <p className="text-orange-800">
            <strong>台风白鹿 (2019年第11号台风)</strong>
            <br />
            观测时间: 2019年8月22-25日
            <br />
            观测点数: {data.glider.length}
            <br />
            数据类型: 海洋环境参数
          </p>
        </div>
      </div>
    </div>
  );

  // SWAN波浪场控制 - 包含动画控制
  const renderWaveFieldControls = () => (
    <div className="space-y-4">
      {/* 动画控制面板 */}
      <AnimationControls />

      {/* 时间信息 */}
      <TimeInfoPanel />

      {/* 台风信息 */}
      <div className="card">
        <h4 className="font-semibold text-gray-800 mb-3">🌀 台风梅花信息</h4>
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm">
          <p className="text-yellow-800">
            <strong>台风梅花 (2011年第9号台风)</strong>
            <br />
            轨迹点数: {data.typhoon.length}
            <br />
            时间跨度: 2011年8月5日-8日
            <br />
            最大强度: 台风级
            <br />
            <br />
            <strong>🎯 影响区域显示:</strong>
            <br />
            • 橙红色圆圈 = 台风影响范围
            <br />
            • 半径范围: 50-180公里
            <br />• 随动画实时更新
          </p>
        </div>
      </div>
    </div>
  );

  // 综合分析
  const renderIntegratedAnalysis = () => (
    <div className="space-y-4">
      <LayerManager />

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📊 数据融合分析
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">数据源状态</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm text-green-800">波浪滑翔器数据</span>
                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">
                  {data.glider.length} 点
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <span className="text-sm text-red-800">台风轨迹数据</span>
                <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">
                  {data.typhoon.length} 点
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <span className="text-sm text-blue-800">波浪场数据</span>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                  {data.waveField.length} 帧
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">分析工具</h4>
            <div className="space-y-2">
              <button
                onClick={() => openAnalysisPanel("spatial")}
                className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                📍 空间相关性分析
              </button>
              <button
                onClick={() => openAnalysisPanel("temporal")}
                className="w-full text-left px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
              >
                ⏰ 时序对比分析
              </button>
              <button
                onClick={() => openAnalysisPanel("glider")}
                className="w-full text-left px-3 py-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
              >
                🛸 滑翔机时序分析
              </button>
              <button
                onClick={() => openAnalysisPanel("validation")}
                className="w-full text-left px-3 py-2 bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 transition-colors"
              >
                🌊 波浪场验证分析
              </button>
            </div>
          </div>
        </div>
      </div>

      <DataStatsPanel dataType="all" />
    </div>
  );

  // AI航迹预测控制
  const renderAIPredictionControls = () => <AIPredictionPanel />;

  // 移除重复的设置面板，避免与AnimationControls冲突
  // 所有动画控制统一在AnimationControls组件中处理

  // 帮助功能
  const handleHelp = () => {
    const helpContent = `
🌊 海洋GIS集成系统 - 使用帮助

📋 主要功能：
• 系统概览：查看整体状态和数据概览
• 波浪滑翔器：台风白鹿观测数据分析和动画播放
• SWAN波浪场：台风梅花波浪场数据可视化
• 综合分析：多源数据融合分析工具
• 系统设置：个性化配置和主题切换

🎮 操作指南：
• 左侧边栏：选择不同的功能模块
• 右侧面板：各模块的具体控制选项
• 截图按钮：保存当前地图视图
• 重置视图：回到默认地图范围
• 帮助按钮：显示此帮助信息

⚡ 动画控制：
• 播放/暂停：控制数据动画播放
• 停止：停止动画并回到起始位置
• 速度调节：调整动画播放速度
• 进度条：显示和控制动画进度

🎨 主题设置：
• 浅色主题：适合白天使用
• 深色主题：适合夜间使用
• 海洋主题：专业海洋数据展示

🌐 支持的浏览器：
• Chrome 90+ (推荐)
• Firefox 88+
• Safari 14+
• Edge 90+

📞 技术支持：
如有问题，请联系2252137@tongji.edu.cn
    `;

    // 创建帮助模态框
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const content = document.createElement("div");
    content.style.cssText = `
      background: var(--bg-primary, #ffffff);
      color: var(--text-primary, #1f2937);
      padding: 2rem;
      border-radius: 0.5rem;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--border-color, #e5e7eb);
    `;

    const title = document.createElement("h2");
    title.textContent = "🌊 海洋GIS集成系统 - 使用帮助";
    title.style.cssText = `
      margin: 0 0 1rem 0;
      color: var(--accent-color, #3b82f6);
      font-size: 1.25rem;
      font-weight: 600;
    `;

    const text = document.createElement("pre");
    text.textContent = helpContent;
    text.style.cssText = `
      white-space: pre-wrap;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
      color: var(--text-secondary, #6b7280);
    `;

    const closeButton = document.createElement("button");
    closeButton.textContent = "关闭";
    closeButton.style.cssText = `
      background: var(--accent-color, #3b82f6);
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.2s ease;
    `;

    closeButton.onmouseover = () => {
      closeButton.style.background = "var(--accent-hover, #2563eb)";
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = "var(--accent-color, #3b82f6)";
    };

    closeButton.onclick = () => {
      document.body.removeChild(modal);
    };

    // 点击背景关闭
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };

    // ESC键关闭
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.body.removeChild(modal);
        document.removeEventListener("keydown", handleKeydown);
      }
    };
    document.addEventListener("keydown", handleKeydown);

    content.appendChild(title);
    content.appendChild(text);
    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // console.log("📖 显示帮助信息");
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* 侧边栏 */}
      {renderSidebar()}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        {renderTopBar()}

        {/* 内容区域 */}
        <div className="flex-1 flex min-h-0">
          {/* 控制面板 */}
          {renderControlPanel()}

          {/* 地图容器 */}
          <div className="flex-1 relative overflow-hidden">
            <MapContainer className="w-full h-full" />

            {/* 图层控制 */}
            <LayerManager
              className="absolute top-4 right-4 max-w-xs"
              compact={true}
            />

            {/* 滑翔器信息浮窗 */}
            {activeModule === "wave-glider" && (
              <FloatingInfoPanel
                isVisible={gliderAnimation.showInfoPanel}
                currentPoint={gliderAnimation.currentPoint}
                currentIndex={gliderAnimation.currentIndex}
                totalPoints={gliderAnimation.totalPoints}
                onClose={() => gliderAnimation.setShowInfoPanel(false)}
                className="z-50"
              />
            )}
          </div>
        </div>
      </div>

      {/* 分析工具面板 */}
      <AnalysisToolsPanel
        isVisible={showAnalysisPanel}
        onClose={() => setShowAnalysisPanel(false)}
        initialActiveTab={analysisActiveTab}
      />
    </div>
  );
};

export default MainLayout;
