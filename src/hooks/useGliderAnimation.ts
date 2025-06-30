// src/hooks/useGliderAnimation.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { GliderData } from "../types";

interface UseGliderAnimationProps {
  data: GliderData[];
  onPointChange?: (point: GliderData, index: number) => void;
  onAnimationEnd?: () => void;
}

interface GliderAnimationState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number; // 秒/点
  loop: boolean;
  showInfoPanel: boolean;
}

export const useGliderAnimation = ({
  data,
  onPointChange,
  onAnimationEnd,
}: UseGliderAnimationProps) => {
  // 状态
  const [animationState, setAnimationState] = useState<GliderAnimationState>({
    isPlaying: false,
    currentIndex: 0,
    speed: 1.0, // 默认1秒/点
    loop: false,
    showInfoPanel: true,
  });

  // 引用
  const animationRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const stateRef = useRef(animationState); // 添加状态引用

  // 更新状态引用
  useEffect(() => {
    stateRef.current = animationState;
  }, [animationState]);

  // 当前数据点
  const currentPoint = data[animationState.currentIndex] || null;

  // 清理动画
  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 动画循环 - 使用ref访问最新状态避免依赖循环
  const animate = useCallback(() => {
    const currentState = stateRef.current;
    if (!currentState.isPlaying) return;

    const now = performance.now();
    
    // 第一次运行时初始化时间
    if (startTimeRef.current === 0) {
      startTimeRef.current = now;
      lastUpdateTimeRef.current = now;
    }

    // 检查是否需要更新到下一帧
    const elapsed = now - lastUpdateTimeRef.current;
    const frameInterval = currentState.speed * 1000; // 转换为毫秒

    if (elapsed >= frameInterval) {
      setAnimationState(prev => {
        const nextIndex = prev.currentIndex + 1;
        
        // 检查是否到达末尾
        if (nextIndex >= data.length) {
          if (prev.loop) {
            // 循环播放
            // console.log(`🔄 滑翔器循环播放，重新开始`);
            return { ...prev, currentIndex: 0 };
          } else {
            // 停止播放
            // console.log(`🏁 滑翔器动画播放完成`);
            onAnimationEnd?.();
            return { ...prev, isPlaying: false, currentIndex: data.length - 1 };
          }
        }

        // console.log(`📍 滑翔器移动到点 ${nextIndex + 1}/${data.length}`);
        return { ...prev, currentIndex: nextIndex };
      });

      lastUpdateTimeRef.current = now;
    }

    // 继续动画
    animationRef.current = requestAnimationFrame(animate);
  }, [data.length, onAnimationEnd]); // 稳定的依赖项

  // 播放控制
  const play = useCallback(() => {
    if (data.length === 0) return;
    
    // console.log(`🎬 开始滑翔器动画播放，总点数: ${data.length}`);
    setAnimationState(prev => ({ ...prev, isPlaying: true }));
    
    // 重置时间参考
    startTimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    
    // 立即开始动画
    animationRef.current = requestAnimationFrame(animate);
  }, [data.length, animate]);

  const pause = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isPlaying: false }));
    clearAnimation();
  }, [clearAnimation]);

  const stop = useCallback(() => {
    setAnimationState(prev => ({ 
      ...prev, 
      isPlaying: false, 
      currentIndex: 0 
    }));
    clearAnimation();
    startTimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
  }, [clearAnimation]);

  const setSpeed = useCallback((speed: number) => {
    setAnimationState(prev => ({ ...prev, speed: Math.max(0.1, Math.min(10, speed)) }));
  }, []);

  const setLoop = useCallback((loop: boolean) => {
    setAnimationState(prev => ({ ...prev, loop }));
  }, []);

  const goToPoint = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    setAnimationState(prev => ({ ...prev, currentIndex: clampedIndex }));
  }, [data.length]);

  const nextPoint = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, data.length - 1)
    }));
  }, [data.length]);

  const previousPoint = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0)
    }));
  }, []);

  const toggleInfoPanel = useCallback(() => {
    setAnimationState(prev => ({ ...prev, showInfoPanel: !prev.showInfoPanel }));
  }, []);

  const setShowInfoPanel = useCallback((show: boolean) => {
    setAnimationState(prev => ({ ...prev, showInfoPanel: show }));
  }, []);

  // 监听当前点变化，触发回调 - 使用useCallback稳定onPointChange
  useEffect(() => {
    if (currentPoint && onPointChange) {
      onPointChange(currentPoint, animationState.currentIndex);
    }
  }, [currentPoint, animationState.currentIndex]); // 移除onPointChange依赖，避免循环

  // 监听播放状态变化，控制动画
  useEffect(() => {
    if (animationState.isPlaying && data.length > 0) {
      // console.log(`🎬 滑翔器动画启动，当前在点 ${animationState.currentIndex + 1}/${data.length}`);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animationState.isPlaying, data.length]); // 移除animate和clearAnimation依赖

  // 清理
  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, [clearAnimation]);

  // 获取动画统计信息
  const getStats = useCallback(() => {
    const totalDuration = data.length * animationState.speed;
    const currentTime = animationState.currentIndex * animationState.speed;
    const progress = data.length > 0 ? (animationState.currentIndex / (data.length - 1)) * 100 : 0;

    return {
      totalPoints: data.length,
      currentIndex: animationState.currentIndex,
      currentTime: currentTime.toFixed(1),
      totalDuration: totalDuration.toFixed(1),
      progress: progress.toFixed(1),
      fps: animationState.speed > 0 ? (1 / animationState.speed).toFixed(1) : '0',
    };
  }, [data.length, animationState.currentIndex, animationState.speed]);

  return {
    // 状态
    animationState,
    currentPoint,
    
    // 控制方法
    play,
    pause,
    stop,
    setSpeed,
    setLoop,
    goToPoint,
    nextPoint,
    previousPoint,
    toggleInfoPanel,
    setShowInfoPanel,
    
    // 统计信息
    getStats,
    
    // 便捷属性
    isPlaying: animationState.isPlaying,
    currentIndex: animationState.currentIndex,
    speed: animationState.speed,
    loop: animationState.loop,
    showInfoPanel: animationState.showInfoPanel,
    totalPoints: data.length,
    progress: data.length > 0 ? (animationState.currentIndex / (data.length - 1)) * 100 : 0,
  };
};
