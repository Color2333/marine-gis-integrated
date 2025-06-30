// src/components/common/LayerManager.tsx
import React from "react";
import {
  Eye,
  EyeOff,
  Layers,
  Navigation,
  Waves,
  Wind,
  MapPin,
  Activity,
  Settings,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import clsx from "clsx";

interface LayerManagerProps {
  className?: string;
  compact?: boolean;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  className = "",
  compact = false,
}) => {
  const { layers, setLayerVisible, setLayerOpacity } = useAppStore();
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 图层配置
  const layerConfigs = [
    {
      id: "gliderTrack",
      name: "滑翔器轨迹",
      icon: Navigation,
      color: "text-blue-500",
      description: "波浪滑翔器移动轨迹线",
    },
    {
      id: "gliderPoints",
      name: "观测点",
      icon: MapPin,
      color: "text-blue-600",
      description: "滑翔器观测数据点",
    },
    {
      id: "typhoonTrack",
      name: "台风轨迹",
      icon: Wind,
      color: "text-red-500",
      description: "台风移动路径",
    },
    {
      id: "typhoonCenter",
      name: "台风中心",
      icon: Activity,
      color: "text-red-600",
      description: "台风中心位置和风圈",
    },
    {
      id: "typhoonInfluenceArea",
      name: "台风影响区域",
      icon: Wind,
      color: "text-orange-500",
      description: "台风影响半径范围",
    },
    {
      id: "waveField",
      name: "波浪场",
      icon: Waves,
      color: "text-cyan-500",
      description: "SWAN波浪场数据",
    },
  ];

  const handleVisibilityToggle = (layerId: string) => {
    const layer = layers[layerId];
    if (layer) {
      setLayerVisible(layerId, !layer.visible);
      // // console.log(`🔄 切换图层 ${layerId} 可见性: ${!layer.visible}`);
    } else {
      // // console.warn(`❌ 图层 ${layerId} 不存在于状态中`);
    }
  };

  const handleOpacityChange = (layerId: string, opacity: number) => {
    setLayerOpacity(layerId, opacity);
    // console.log(`🔄 设置图层 ${layerId} 透明度: ${opacity}`);
  };

  // 添加调试日志和刷新监听
  React.useEffect(() => {
    // // console.log("🎛️ LayerManager 渲染, 当前图层状态:", layers);
    // // console.log(
    //   "📋 layerConfigs:",
    //   layerConfigs.map((c) => c.id)
    // );

    const missingLayers = layerConfigs.filter((config) => !layers[config.id]);
    if (missingLayers.length > 0) {
      // // console.warn(
      //   "❌ LayerManager 缺失图层:",
      //   missingLayers.map((l) => l.name)
      // );
    }

    // 监听强制刷新事件
    const handleRefresh = () => {
      // // console.log("🔄 LayerManager 收到强制刷新事件");
      setRefreshKey((prev) => prev + 1); // 触发重新渲染
    };

    window.addEventListener("layerManagerRefresh", handleRefresh);

    return () => {
      window.removeEventListener("layerManagerRefresh", handleRefresh);
    };
  }, [layers, refreshKey]); // 添加 refreshKey 依赖

  if (compact) {
    return (
      <div className={clsx("glass-effect rounded-lg p-3 shadow-lg", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">图层</span>
        </div>
        <div className="space-y-1">
          {layerConfigs.map((config) => {
            const layer = layers[config.id];

            // 调试日志
            if (!layer) {
              // // console.warn(
              //   `❌ 紧凑模式: 图层 ${config.id} (${config.name}) 在状态中不存在`
              // );
              return (
                <div
                  key={config.id}
                  className="text-xs text-red-500 p-1 bg-red-50 rounded"
                >
                  ❌ {config.name} (缺失配置)
                </div>
              );
            }

            const Icon = config.icon;
            return (
              <label
                key={config.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => handleVisibilityToggle(config.id)}
                  className="rounded text-ocean-600 focus:ring-ocean-500"
                />
                <Icon className={clsx("h-3 w-3", config.color)} />
                <span className="text-xs text-gray-700">{config.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-4",
        className
      )}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-ocean-600" />
        <h3 className="font-semibold text-gray-800">图层管理</h3>
        <button className="ml-auto p-1 rounded hover:bg-gray-100 transition-colors">
          <Settings size={16} className="text-gray-500" />
        </button>
      </div>

      {/* 图层列表 */}
      <div className="space-y-4">
        {layerConfigs.map((config) => {
          const layer = layers[config.id];

          // 调试日志
          if (!layer) {
            // // console.warn(
            //   `❌ 完整模式: 图层 ${config.id} (${config.name}) 在状态中不存在`
            // );
            return (
              <div
                key={config.id}
                className="border border-red-200 bg-red-50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-red-400 rounded"></div>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      {config.name}
                    </h4>
                    <p className="text-xs text-red-600">
                      配置缺失 - 图层ID: {config.id}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          const Icon = config.icon;

          return (
            <div
              key={config.id}
              className="border border-gray-200 rounded-lg p-3"
            >
              {/* 图层标题和可见性控制 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Icon className={clsx("h-4 w-4", config.color)} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-800">
                      {config.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {config.description}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleVisibilityToggle(config.id)}
                  className={clsx(
                    "p-2 rounded transition-colors",
                    layer.visible
                      ? "bg-ocean-100 text-ocean-600 hover:bg-ocean-200"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                  title={layer.visible ? "隐藏图层" : "显示图层"}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {/* 透明度控制 */}
              {layer.visible && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>透明度</span>
                    <span>{Math.round(layer.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={layer.opacity}
                    onChange={(e) =>
                      handleOpacityChange(config.id, parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              )}

              {/* 图层状态指示器 */}
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      layer.visible ? "bg-green-500" : "bg-gray-300"
                    )}
                  ></div>
                  <span className="text-gray-500">
                    {layer.visible ? "已显示" : "已隐藏"}
                  </span>
                </div>

                {layer.visible && (
                  <span className="text-gray-500">
                    不透明度: {Math.round(layer.opacity * 100)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 全局控制 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => {
              Object.keys(layers).forEach((layerId) => {
                setLayerVisible(layerId, true);
              });
            }}
            className="flex-1 py-2 px-3 bg-green-50 text-green-700 rounded text-sm font-medium hover:bg-green-100 transition-colors"
          >
            显示全部
          </button>
          <button
            onClick={() => {
              Object.keys(layers).forEach((layerId) => {
                setLayerVisible(layerId, false);
              });
            }}
            className="flex-1 py-2 px-3 bg-gray-50 text-gray-700 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            隐藏全部
          </button>
        </div>
      </div>

      {/* 图层统计 */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        {Object.values(layers).filter((layer) => layer.visible).length} /{" "}
        {Object.keys(layers).length} 图层可见
      </div>
    </div>
  );
};

export default LayerManager;
