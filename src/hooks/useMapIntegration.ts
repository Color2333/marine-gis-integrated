// src/hooks/useMapIntegration.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { SimpleMapManager } from '../services/SimpleMapManager';
import { useAppStore } from '../stores/appStore';
import type { GliderData, TyphoonData } from '../types';

export const useMapIntegration = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapManagerRef = useRef<SimpleMapManager | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isMapReady, setIsMapReady] = useState(false);
  const [coordinates, setCoordinates] = useState('');

  // 状态管理
  const {
    mapState,
    animationState,
    layers,
    data,
    setMapReady,
    setSystemStatus,
    setCurrentFrame,
    setAnimationPlaying,
  } = useAppStore();

  // 初始化地图
  useEffect(() => {
    let isMounted = true;
    
    const initializeMap = async () => {
      if (!mapContainerRef.current || mapManagerRef.current) return;

      try {
        if (!isMounted) return;
        setSystemStatus('正在初始化地图...');
        
        // 动态加载ArcGIS CSS
        if (!document.querySelector('link[href*="arcgis"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://js.arcgis.com/4.24/esri/themes/light/main.css';
          document.head.appendChild(link);
        }

        // 动态加载ArcGIS JS API
        if (!window.require) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.arcgis.com/4.24/';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('ArcGIS API加载失败'));
            document.head.appendChild(script);
          });

          // 等待API就绪
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (!isMounted) return;

        const mapManager = new SimpleMapManager();
        await mapManager.initialize(mapContainerRef.current);
        
        if (!isMounted) return;
        
        mapManagerRef.current = mapManager;
        setIsMapReady(true);
        setMapReady(true);
        setSystemStatus('地图初始化完成');

        // 设置事件监听
        setupMapEventListeners();

      } catch (error) {
        if (isMounted) {
          // console.error('地图初始化失败:', error);
          setSystemStatus('地图初始化失败: ' + (error as Error).message);
        }
      }
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (mapManagerRef.current) {
        try {
          mapManagerRef.current.destroy();
        } catch (error) {
          // console.warn('地图销毁时出现警告:', error);
        }
        mapManagerRef.current = null;
      }
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [setMapReady, setSystemStatus]);

  // 设置地图事件监听器
  const setupMapEventListeners = useCallback(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current;

    // 鼠标移动显示坐标
    const handlePointerMove = (event: any) => {
      const detail = event.detail;
      if (detail?.mapPoint) {
        setCoordinates(
          `${detail.mapPoint.longitude.toFixed(4)}°E, ${detail.mapPoint.latitude.toFixed(4)}°N`
        );
      }
    };

    // 地图点击事件
    const handleMapClick = (event: any) => {
      const detail = event.detail;
      // console.log('地图点击:', detail);
      // 可以在这里处理查询、测量等功能
    };

    container.addEventListener('mapPointerMove', handlePointerMove);
    container.addEventListener('mapClick', handleMapClick);

    return () => {
      container.removeEventListener('mapPointerMove', handlePointerMove);
      container.removeEventListener('mapClick', handleMapClick);
    };
  }, []);

  // 加载滑翔器数据
  useEffect(() => {
    if (isMapReady && mapManagerRef.current && data.glider.length > 0) {
      try {
        mapManagerRef.current.addGliderData(data.glider);
      } catch (error) {
        // console.warn('加载滑翔器数据时出错:', error);
      }
    }
  }, [isMapReady, data.glider]);

  // 加载台风数据
  useEffect(() => {
    if (isMapReady && mapManagerRef.current && data.typhoon.length > 0) {
      try {
        mapManagerRef.current.addTyphoonData(data.typhoon);
      } catch (error) {
        // console.warn('加载台风数据时出错:', error);
      }
    }
  }, [isMapReady, data.typhoon]);

  // 处理图层可见性变化
  useEffect(() => {
    if (!isMapReady || !mapManagerRef.current) return;

    Object.entries(layers).forEach(([layerId, layerConfig]) => {
      mapManagerRef.current!.setLayerVisible(layerId, layerConfig.visible);
      mapManagerRef.current!.setLayerOpacity(layerId, layerConfig.opacity);
    });
  }, [isMapReady, layers]);

  // 处理底图变化
  useEffect(() => {
    if (isMapReady && mapManagerRef.current) {
      try {
        mapManagerRef.current.changeBasemap(mapState.basemap);
      } catch (error) {
        // console.warn('切换底图时出错:', error);
        // 如果切换失败，尝试使用默认底图
        if (mapState.basemap !== 'gray-vector') {
          try {
            mapManagerRef.current.changeBasemap('gray-vector');
          } catch (fallbackError) {
            // console.warn('使用备用底图也失败:', fallbackError);
          }
        }
      }
    }
  }, [isMapReady, mapState.basemap]);

  // 动画控制
  const startAnimation = useCallback((type: 'glider' | 'typhoon' = 'glider') => {
    if (!isMapReady || !mapManagerRef.current || animationState.isPlaying) return;

    const targetData = type === 'glider' ? data.glider : data.typhoon;
    if (targetData.length === 0) return;

    setAnimationPlaying(true);

    animationTimerRef.current = setInterval(() => {
      const currentFrame = animationState.currentFrame;
      const nextFrame = currentFrame >= targetData.length - 1 ? 
        (animationState.loop ? 0 : targetData.length - 1) : 
        currentFrame + 1;

      setCurrentFrame(nextFrame);

      // 更新地图上的当前位置
      if (mapManagerRef.current && targetData[nextFrame]) {
        mapManagerRef.current.updateCurrentPosition(targetData[nextFrame], type);
      }

      // 如果到达终点且不循环，停止动画
      if (nextFrame === targetData.length - 1 && !animationState.loop) {
        // 停止动画
        if (animationTimerRef.current) {
          clearInterval(animationTimerRef.current);
          animationTimerRef.current = null;
        }
        setAnimationPlaying(false);
      }
    }, animationState.speed);
  }, [
    isMapReady, 
    animationState.isPlaying, 
    animationState.speed, 
    animationState.loop,
    animationState.currentFrame,
    data.glider, 
    data.typhoon,
    setAnimationPlaying,
    setCurrentFrame
  ]);

  const stopAnimation = useCallback(() => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setAnimationPlaying(false);
  }, [setAnimationPlaying]);

  const pauseAnimation = useCallback(() => {
    stopAnimation();
  }, [stopAnimation]);

  const resumeAnimation = useCallback(() => {
    if (!animationState.isPlaying) {
      startAnimation();
    }
  }, [animationState.isPlaying, startAnimation]);

  // 跳转到特定帧
  const goToFrame = useCallback((frameIndex: number, type: 'glider' | 'typhoon' = 'glider') => {
    const targetData = type === 'glider' ? data.glider : data.typhoon;
    
    if (frameIndex >= 0 && frameIndex < targetData.length && mapManagerRef.current) {
      setCurrentFrame(frameIndex);
      mapManagerRef.current.updateCurrentPosition(targetData[frameIndex], type);
    }
  }, [data.glider, data.typhoon, setCurrentFrame]);

  // 截图功能
  const takeScreenshot = useCallback(async (): Promise<string | null> => {
    if (!mapManagerRef.current) return null;

    try {
      return await mapManagerRef.current.takeScreenshot();
    } catch (error) {
      // console.error('截图失败:', error);
      return null;
    }
  }, []);

  // 缩放到数据范围
  const fitToData = useCallback((type: 'glider' | 'typhoon' | 'all' = 'all') => {
    if (!mapManagerRef.current) return;

    let targetData: Array<{ longitude: number; latitude: number }> = [];
    
    switch (type) {
      case 'glider':
        targetData = data.glider;
        break;
      case 'typhoon':
        targetData = data.typhoon;
        break;
      case 'all':
        targetData = [...data.glider, ...data.typhoon];
        break;
    }

    if (targetData.length > 0 && mapManagerRef.current.mapView) {
      const longitudes = targetData.map(d => d.longitude);
      const latitudes = targetData.map(d => d.latitude);

      const extent = {
        xmin: Math.min(...longitudes) - 0.1,
        ymin: Math.min(...latitudes) - 0.1,
        xmax: Math.max(...longitudes) + 0.1,
        ymax: Math.max(...latitudes) + 0.1,
        spatialReference: { wkid: 4326 }
      };

      mapManagerRef.current.mapView.goTo(extent, { duration: 2000 });
    }
  }, [data.glider, data.typhoon]);

  // 获取当前视图信息
  const getCurrentView = useCallback(() => {
    if (!mapManagerRef.current?.mapView) return null;

    const view = mapManagerRef.current.mapView;
    return {
      center: [view.center.longitude, view.center.latitude] as [number, number],
      zoom: view.zoom,
      extent: view.extent
    };
  }, []);

  return {
    // Refs
    mapContainerRef,
    
    // State
    isMapReady,
    coordinates,
    
    // Map actions
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    goToFrame,
    takeScreenshot,
    fitToData,
    getCurrentView,
    
    // Map instance (for advanced usage)
    mapManager: mapManagerRef.current,
  };
};