// src/components/map/MapContainer.tsx
import { useEffect, useRef, useState } from "react";
import { SimpleMapManager } from "../../services/SimpleMapManager";
import { useAppStore } from "../../stores/appStore";
import { useMapAnimation } from "../../hooks/useMapAnimation";
import { useMapManagerStore } from "../../hooks/useMapManager";

interface MapContainerProps {
  className?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapManagerRef = useRef<SimpleMapManager | null>(null);
  const initializingRef = useRef<boolean>(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [coordinates, setCoordinates] = useState("");

  const {
    setMapReady,
    setSystemStatus,
    data,
    mapState,
    layers,
    animationState,
    setCurrentFrame,
    setAnimationPlaying,
  } = useAppStore();

  // 地图管理器全局状态
  const { setMapManager } = useMapManagerStore();

  // 使用地图动画钩子
  const mapAnimation = useMapAnimation(mapManagerRef.current);

  // 初始化地图
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (
        !mapContainerRef.current ||
        mapManagerRef.current ||
        initializingRef.current
      ) {
        return;
      }

      initializingRef.current = true;

      try {
        setSystemStatus("正在初始化地图...");

        // 确保ArcGIS API已加载
        if (!window.require) {
          throw new Error("ArcGIS API未加载");
        }

        const mapManager = new SimpleMapManager();
        await mapManager.initialize(mapContainerRef.current);

        if (!isMounted) {
          // 如果组件已卸载，立即清理
          mapManager.destroy();
          return;
        }

        mapManagerRef.current = mapManager;
        setMapManager(mapManager); // 设置到全局状态
        setIsMapReady(true);
        setMapReady(true);
        setSystemStatus("地图初始化完成");

        // 设置事件监听器
        setupEventListeners();
      } catch (error) {
        if (isMounted) {
          // console.error("地图初始化失败:", error);
          setSystemStatus("地图初始化失败: " + (error as Error).message);
        }
      } finally {
        initializingRef.current = false;
      }
    };

    // 延迟初始化，确保DOM已挂载
    const timer = setTimeout(initializeMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);

      // 重置初始化标记
      initializingRef.current = false;

      // 安全地清理地图资源
      if (mapManagerRef.current) {
        try {
          // 先设置状态，避免其他效应继续执行
          setIsMapReady(false);
          setMapReady(false);
          setMapManager(null); // 清除全局状态

          // 延迟销毁，确保React完成所有DOM操作
          setTimeout(() => {
            if (mapManagerRef.current) {
              try {
                mapManagerRef.current.destroy();
              } catch (error) {
                // console.warn("地图销毁时出现警告:", error);
              }
              mapManagerRef.current = null;
            }
          }, 0);
        } catch (error) {
          // console.warn("清理地图时出错:", error);
          mapManagerRef.current = null;
        }
      }
    };
  }, [setMapReady, setSystemStatus]);

  // 设置地图事件监听器
  const setupEventListeners = () => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;

    const handlePointerMove = (event: any) => {
      const detail = event.detail;
      if (detail?.mapPoint) {
        setCoordinates(
          `${detail.mapPoint.longitude.toFixed(
            4
          )}°E, ${detail.mapPoint.latitude.toFixed(4)}°N`
        );
      }
    };

    const handleMapClick = (event: any) => {
      const detail = event.detail;
      // console.log("地图点击:", detail);
    };

    container.addEventListener("mapPointerMove", handlePointerMove);
    container.addEventListener("mapClick", handleMapClick);

    return () => {
      container.removeEventListener("mapPointerMove", handlePointerMove);
      container.removeEventListener("mapClick", handleMapClick);
    };
  };

  // 加载滑翔器数据
  useEffect(() => {
    if (isMapReady && mapManagerRef.current && data.glider.length > 0) {
      try {
        mapManagerRef.current.addGliderData(data.glider);
      } catch (error) {
        // console.warn("加载滑翔器数据时出错:", error);
      }
    }
  }, [isMapReady, data.glider]);

  // 加载台风数据
  useEffect(() => {
    if (isMapReady && mapManagerRef.current && data.typhoon.length > 0) {
      try {
        mapManagerRef.current.addTyphoonData(data.typhoon);
      } catch (error) {
        // console.warn("加载台风数据时出错:", error);
      }
    }
  }, [isMapReady, data.typhoon]);

  // 处理图层可见性变化
  useEffect(() => {
    if (!isMapReady || !mapManagerRef.current) return;

    Object.entries(layers).forEach(([layerId, layerConfig]) => {
      try {
        mapManagerRef.current!.setLayerVisible(layerId, layerConfig.visible);
        mapManagerRef.current!.setLayerOpacity(layerId, layerConfig.opacity);
      } catch (error) {
        // console.warn(`设置图层 ${layerId} 属性时出错:`, error);
      }
    });
  }, [isMapReady, layers]);

  // 处理底图变化
  useEffect(() => {
    if (isMapReady && mapManagerRef.current) {
      try {
        mapManagerRef.current.changeBasemap(mapState.basemap);
      } catch (error) {
        // console.warn("切换底图时出错:", error);
      }
    }
  }, [isMapReady, mapState.basemap]);

  // 动画播放控制 - 已禁用，使用新的 AnimationController 系统
  useEffect(() => {
    // 注释掉旧的动画系统，避免与新的 AnimationController 冲突
    // console.log(
    //   "🚫 MapContainer 中的旧动画系统已禁用，使用新的 AnimationController"
    // );

    /*
    if (animationState.isPlaying) {
      // 开始播放动画
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }

      const totalFrames = mapAnimation.timelineService.getTotalFrames();
      if (totalFrames === 0) return;

      animationTimerRef.current = setInterval(() => {
        const currentFrame = animationState.currentFrame;
        const nextFrame =
          currentFrame >= totalFrames - 1
            ? animationState.loop
              ? 0
              : totalFrames - 1
            : currentFrame + 1;

        setCurrentFrame(nextFrame);

        // 如果到达终点且不循环，停止动画
        if (nextFrame === totalFrames - 1 && !animationState.loop) {
          setAnimationPlaying(false);
        }
      }, 1000 / animationState.speed); // 根据速度设置间隔
    } else {
      // 停止播放动画
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    }
    */

    // 清理函数
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [
    animationState.isPlaying,
    animationState.speed,
    animationState.loop,
    animationState.currentFrame,
    setCurrentFrame,
    setAnimationPlaying,
    mapAnimation.timelineService,
  ]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ minHeight: "400px" }}
      />

      {/* 坐标显示 */}
      {coordinates && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          {coordinates}
        </div>
      )}

      {/* 加载指示器 */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">正在加载地图...</p>
          </div>
        </div>
      )}
    </div>
  );
};
