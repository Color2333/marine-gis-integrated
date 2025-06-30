// src/hooks/useAnimationController.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/appStore';

interface AnimationMetrics {
  targetFps: number;
  actualFps: number;
  frameAccuracy: number;
  isStable: boolean;
}

export class AnimationController {
  private animationId: number | null = null;
  private nextFrameTime: number = 0;
  private targetInterval: number = 500; // ms
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private fpsCalculationStartTime: number = 0;
  private onFrameUpdate: (() => void) | null = null;
  private onMetricsUpdate: ((metrics: AnimationMetrics) => void) | null = null;
  
  // 添加播放计时变量
  private playStartTime: number = 0;
  private totalFrames: number = 0;

  start(intervalMs: number, onFrame: () => void, onMetrics?: (metrics: AnimationMetrics) => void, totalFrames: number = 0) {
    this.stop(); // 确保清理之前的动画
    
    this.targetInterval = intervalMs;
    this.onFrameUpdate = onFrame;
    this.onMetricsUpdate = onMetrics || null;
    this.totalFrames = totalFrames;
    this.isRunning = true;
    
    const now = performance.now();
    this.nextFrameTime = now + this.targetInterval; // 设置下一帧的时间
    this.frameCount = 0;
    this.fpsCalculationStartTime = now;
    this.playStartTime = now; // 记录播放开始时间

    const expectedDuration = totalFrames * intervalMs / 1000; // 预期总时长（秒）
    // console.log(`🎬 AnimationController 启动 - 目标间隔: ${intervalMs}ms (${(1000/intervalMs).toFixed(1)}fps), 总帧数: ${totalFrames}, 预期时长: ${expectedDuration.toFixed(1)}秒`);
    
    this.tick();
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isRunning = false;
    
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate({
        targetFps: 0,
        actualFps: 0,
        frameAccuracy: 0,
        isStable: false
      });
    }
    
    // console.log(`🛑 AnimationController 停止`);
  }

  updateSpeed(intervalMs: number) {
    if (this.isRunning) {
      this.targetInterval = intervalMs;
      // console.log(`⚡ 实时更新速度: ${intervalMs}ms (${(1000/intervalMs).toFixed(1)}fps)`);
    }
  }

  private tick = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();

    // 只有达到预定时间时才触发帧更新
    if (currentTime >= this.nextFrameTime) {
      if (this.onFrameUpdate) {
        this.onFrameUpdate();
      }
      
      this.frameCount++;
      
      // 记录实际间隔用于调试
      const actualInterval = currentTime - (this.nextFrameTime - this.targetInterval);
      // console.log(`⏱️ 帧更新 - 实际间隔: ${actualInterval.toFixed(1)}ms, 目标间隔: ${this.targetInterval}ms`);
      
      // 设置下一帧的精确时间
      this.nextFrameTime = currentTime + this.targetInterval;

      // 每30帧计算一次性能指标
      if (this.frameCount % 30 === 0) {
        this.calculateMetrics(currentTime);
      }
    }

    this.animationId = requestAnimationFrame(this.tick);
  };

  private calculateMetrics(currentTime: number) {
    const elapsed = currentTime - this.fpsCalculationStartTime;
    if (elapsed === 0) return;

    const actualFps = (this.frameCount * 1000) / elapsed;
    const targetFps = 1000 / this.targetInterval;
    const frameAccuracy = Math.max(0, 100 - Math.abs(actualFps - targetFps) / targetFps * 100);
    const isStable = frameAccuracy >= 90;

    if (this.onMetricsUpdate) {
      this.onMetricsUpdate({
        targetFps,
        actualFps,
        frameAccuracy,
        isStable
      });
    }

    // 重置计数器
    this.frameCount = 0;
    this.fpsCalculationStartTime = currentTime;

    // console.log(`📊 动画性能: 目标${targetFps.toFixed(1)}fps, 实际${actualFps.toFixed(1)}fps, 精度${frameAccuracy.toFixed(0)}%`);
  }

  isActive(): boolean {
    return this.isRunning;
  }

  // 添加播放完成时的计时方法
  logPlaybackComplete(currentFrame: number) {
    if (this.playStartTime > 0) {
      const actualDuration = (performance.now() - this.playStartTime) / 1000; // 实际播放时长（秒）
      const expectedDuration = this.totalFrames * this.targetInterval / 1000; // 预期播放时长（秒）
      const timingAccuracy = expectedDuration > 0 ? (Math.abs(actualDuration - expectedDuration) / expectedDuration * 100) : 0;
      
      // console.log(`🏁 动画播放完成统计:`);
      // console.log(`   总帧数: ${this.totalFrames}`);
      // console.log(`   实际播放帧数: ${currentFrame + 1}`);
      // console.log(`   目标间隔: ${this.targetInterval}ms`);
      // console.log(`   预期时长: ${expectedDuration.toFixed(2)}秒`);
      // console.log(`   实际时长: ${actualDuration.toFixed(2)}秒`);
      // console.log(`   时长误差: ${timingAccuracy.toFixed(1)}%`);
      // console.log(`   平均实际帧率: ${((currentFrame + 1) / actualDuration).toFixed(1)}fps`);
      // console.log(`-----------------------------------`);
    }
  }

  // 重新开始计时（用于循环播放）
  resetPlayTimer() {
    this.playStartTime = performance.now();
    // console.log(`⏰ 重新开始计时`);
  }
}

export const useAnimationController = () => {
  const {
    animationState,
    data,
    setAnimationPlaying,
    setCurrentFrame,
    setAnimationSpeed
  } = useAppStore();

  const { isPlaying, currentFrame, totalFrames, speed, loop } = animationState;
  
  const controllerRef = useRef<AnimationController>(new AnimationController());
  const [metrics, setMetrics] = useState<AnimationMetrics>({
    targetFps: 0,
    actualFps: 0,
    frameAccuracy: 0,
    isStable: false
  });

  // 帧更新回调
  const handleFrameUpdate = useCallback(() => {
    setCurrentFrame((prevFrame: number) => {
      // 如果是循环播放且到达最后一帧，记录一轮播放完成
      if (loop && prevFrame >= totalFrames - 1) {
        controllerRef.current.logPlaybackComplete(prevFrame);
        // console.log("🔄 一轮循环播放完成，开始下一轮");
        // 重新开始计时
        controllerRef.current.resetPlayTimer();
        return 0;
      }
      
      const nextFrame = prevFrame >= totalFrames - 1 ? (loop ? 0 : prevFrame) : prevFrame + 1;

      // 如果不循环播放且到达最后一帧，停止播放
      if (!loop && prevFrame >= totalFrames - 1) {
        // 记录播放完成的计时信息
        controllerRef.current.logPlaybackComplete(prevFrame);
        // console.log("🏁 动画播放完成，自动停止");
        setAnimationPlaying(false);
        return prevFrame;
      }

      return nextFrame;
    });
  }, [totalFrames, loop, setCurrentFrame, setAnimationPlaying]);

  // 性能指标回调
  const handleMetricsUpdate = useCallback((newMetrics: AnimationMetrics) => {
    setMetrics(newMetrics);
  }, []);

  // 播放状态控制
  useEffect(() => {
    const controller = controllerRef.current;

    if (!isPlaying || totalFrames === 0) {
      controller.stop();
      return;
    }

    controller.start(speed, handleFrameUpdate, handleMetricsUpdate, totalFrames);

    return () => {
      controller.stop();
    };
  }, [isPlaying, totalFrames, speed, handleFrameUpdate, handleMetricsUpdate]);

  // 速度实时更新
  const updateSpeed = useCallback((newSpeed: number) => {
    setAnimationSpeed(newSpeed);
    controllerRef.current.updateSpeed(newSpeed);
  }, [setAnimationSpeed]);

  // 播放控制函数
  const play = useCallback(() => {
    // console.log("▶️ 开始播放");
    setAnimationPlaying(true);
  }, [setAnimationPlaying]);

  const pause = useCallback(() => {
    // 记录暂停时的播放时间
    controllerRef.current.logPlaybackComplete(currentFrame);
    // console.log("⏸️ 暂停播放");
    setAnimationPlaying(false);
  }, [setAnimationPlaying, currentFrame]);

  const stop = useCallback(() => {
    // 记录停止时的播放时间
    controllerRef.current.logPlaybackComplete(currentFrame);
    // console.log("⏹️ 停止播放并重置");
    setAnimationPlaying(false);
    setCurrentFrame(0);
  }, [setAnimationPlaying, setCurrentFrame, currentFrame]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // 帧控制函数
  const goToFrame = useCallback((frame: number) => {
    if (frame >= 0 && frame < totalFrames) {
      setCurrentFrame(frame);
    }
  }, [totalFrames, setCurrentFrame]);

  const nextFrame = useCallback(() => {
    if (currentFrame < totalFrames - 1) {
      setCurrentFrame(currentFrame + 1);
    } else if (loop) {
      setCurrentFrame(0);
    }
  }, [currentFrame, totalFrames, loop, setCurrentFrame]);

  const prevFrame = useCallback(() => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    } else if (loop) {
      setCurrentFrame(totalFrames - 1);
    }
  }, [currentFrame, totalFrames, loop, setCurrentFrame]);

  // 组件卸载时清理
  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.stop();
      // console.log("🧹 useAnimationController 清理完成");
    };
  }, []);

  return {
    // 状态
    isPlaying,
    currentFrame,
    totalFrames,
    speed,
    loop,
    metrics,
    
    // 控制函数
    play,
    pause,
    stop,
    togglePlayPause,
    updateSpeed,
    goToFrame,
    nextFrame,
    prevFrame,
    
    // 工具函数
    getProgress: () => totalFrames > 0 ? (currentFrame / (totalFrames - 1)) * 100 : 0,
    getCurrentFrameInfo: () => {
      if (data.waveField.length === 0 || currentFrame >= data.waveField.length) {
        return null;
      }
      return data.waveField[currentFrame];
    }
  };
};
