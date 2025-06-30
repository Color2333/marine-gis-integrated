// src/hooks/useMapAnimation.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { TimelineService } from '../services/TimelineService';
import type { SimpleMapManager } from '../services/SimpleMapManager';

export const useMapAnimation = (mapManager: SimpleMapManager | null) => {
  const timelineService = useRef<TimelineService>(new TimelineService());
  const {
    data,
    animationState,
    setCurrentFrame,
    setAnimationPlaying,
  } = useAppStore();

  const { currentFrame, totalFrames } = animationState;

  // 当数据变化时，更新时间轴服务
  useEffect(() => {
    if (data.glider.length > 0 || data.typhoon.length > 0 || data.waveField.length > 0) {
      timelineService.current.setData(
        data.glider,
        data.typhoon,
        data.waveField
      );

      // 分析数据重叠情况
      const overlap = timelineService.current.analyzeDataOverlap();
      // console.log('数据时间重叠分析:', overlap);
    }
  }, [data.glider, data.typhoon, data.waveField]);

  // 当当前帧变化时，更新地图显示 - 优化版本，确保波场图层立即响应
  useEffect(() => {
    if (!mapManager || totalFrames === 0) return;

    const frame = timelineService.current.getFrame(currentFrame);
    if (frame) {
      try {
        // 添加调试信息
        if (currentFrame % 10 === 0) {
          // console.log(`🗺️ 地图更新到帧 ${currentFrame}:`, frame.timestamp);
        }
        
        // 立即更新所有图层，确保动画跟手
        mapManager.updateToFrameInstant(frame);
      } catch (error) {
        // console.warn('更新地图帧失败:', error);
      }
    }
  }, [mapManager, currentFrame, totalFrames]);

  // 跳转到指定时间
  const jumpToTime = useCallback((targetTime: Date) => {
    const frame = timelineService.current.findFrameByTime(targetTime);
    if (frame) {
      setCurrentFrame(frame.index);
    }
  }, [setCurrentFrame]);

  // 跳转到指定帧
  const jumpToFrame = useCallback((frameIndex: number) => {
    const totalFrames = timelineService.current.getTotalFrames();
    if (frameIndex >= 0 && frameIndex < totalFrames) {
      setCurrentFrame(frameIndex);
    }
  }, [setCurrentFrame]);

  // 获取当前帧数据
  const getCurrentFrameData = useCallback(() => {
    return timelineService.current.getFrame(currentFrame);
  }, [currentFrame]);

  // 获取时间范围
  const getTimeRange = useCallback(() => {
    return timelineService.current.getTimeRange();
  }, []);

  // 获取所有帧
  const getAllFrames = useCallback(() => {
    return timelineService.current.getAllFrames();
  }, []);

  // 播放/暂停控制
  const togglePlayback = useCallback(() => {
    setAnimationPlaying(!animationState.isPlaying);
  }, [animationState.isPlaying, setAnimationPlaying]);

  // 停止播放并回到第一帧
  const stopPlayback = useCallback(() => {
    setAnimationPlaying(false);
    setCurrentFrame(0);
  }, [setAnimationPlaying, setCurrentFrame]);

  // 下一帧
  const nextFrame = useCallback(() => {
    const totalFrames = timelineService.current.getTotalFrames();
    if (currentFrame < totalFrames - 1) {
      setCurrentFrame(currentFrame + 1);
    } else if (animationState.loop) {
      setCurrentFrame(0);
    }
  }, [currentFrame, animationState.loop, setCurrentFrame]);

  // 上一帧
  const previousFrame = useCallback(() => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    } else if (animationState.loop) {
      const totalFrames = timelineService.current.getTotalFrames();
      setCurrentFrame(totalFrames - 1);
    }
  }, [currentFrame, animationState.loop, setCurrentFrame]);

  // 获取数据统计
  const getDataStats = useCallback(() => {
    const frames = timelineService.current.getAllFrames();
    const timeRange = timelineService.current.getTimeRange();
    const frameInterval = timelineService.current.getFrameInterval();

    return {
      totalFrames: frames.length,
      timeRange,
      frameInterval,
      dataCount: {
        glider: data.glider.length,
        typhoon: data.typhoon.length,
        waveField: data.waveField.length,
      },
      overlap: timelineService.current.analyzeDataOverlap(),
    };
  }, [data]);

  return {
    // 基本控制
    jumpToTime,
    jumpToFrame,
    togglePlayback,
    stopPlayback,
    nextFrame,
    previousFrame,

    // 数据获取
    getCurrentFrameData,
    getTimeRange,
    getAllFrames,
    getDataStats,

    // 时间轴服务实例
    timelineService: timelineService.current,
  };
};
