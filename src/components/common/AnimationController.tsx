// src/components/common/AnimationController.tsx
import React from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  Settings,
  Activity,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import clsx from "clsx";

interface AnimationControllerProps {
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onStepBackward?: () => void;
  onStepForward?: () => void;
  onReset?: () => void;
}

const AnimationController: React.FC<AnimationControllerProps> = ({
  className = "",
  onPlay,
  onPause,
  onStop,
  onStepBackward,
  onStepForward,
  onReset,
}) => {
  const {
    animationState,
    data,
    setCurrentFrame,
    setAnimationSpeed,
    setAnimationLoop,
    setAnimationPlaying,
  } = useAppStore();

  const totalFrames = Math.max(data.glider.length, data.waveField.length);
  const progress =
    totalFrames > 0 ? (animationState.currentFrame / totalFrames) * 100 : 0;

  const handlePlayPause = () => {
    if (animationState.isPlaying) {
      setAnimationPlaying(false);
      onPause?.();
    } else {
      setAnimationPlaying(true);
      onPlay?.();
    }
  };

  const handleStop = () => {
    setAnimationPlaying(false);
    setCurrentFrame(0);
    onStop?.();
  };

  const handleStepBackward = () => {
    if (animationState.currentFrame > 0) {
      setCurrentFrame(animationState.currentFrame - 1);
      onStepBackward?.();
    }
  };

  const handleStepForward = () => {
    if (animationState.currentFrame < totalFrames - 1) {
      setCurrentFrame(animationState.currentFrame + 1);
      onStepForward?.();
    }
  };

  const handleReset = () => {
    setAnimationPlaying(false);
    setCurrentFrame(0);
    onReset?.();
  };

  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(event.target.value);
    setCurrentFrame(frame);
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseInt(event.target.value);
    setAnimationSpeed(speed);
  };

  const formatTime = (frame: number): string => {
    // 简单的时间格式化，假设每帧代表1小时
    const hours = Math.floor(frame / 1);
    const minutes = (frame % 1) * 60;
    return `${hours.toString().padStart(2, "0")}:${Math.floor(minutes)
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      className={clsx(
        "bg-white rounded-lg shadow-sm border border-gray-200 p-4",
        className
      )}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-ocean-600" />
        <h3 className="font-semibold text-gray-800">动画控制</h3>
        <div
          className={clsx(
            "px-2 py-1 rounded-full text-xs font-medium",
            animationState.isPlaying
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {animationState.isPlaying ? "播放中" : "已暂停"}
        </div>
      </div>

      {/* 主控制按钮 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={handleStepBackward}
          disabled={animationState.currentFrame === 0}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="上一帧"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={handlePlayPause}
          disabled={totalFrames === 0}
          className={clsx(
            "p-3 rounded-lg font-medium transition-colors flex items-center gap-2",
            animationState.isPlaying
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {animationState.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          {animationState.isPlaying ? "暂停" : "播放"}
        </button>

        <button
          onClick={handleStop}
          className="p-2 rounded bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
          title="停止"
        >
          <Square size={16} />
        </button>

        <button
          onClick={handleStepForward}
          disabled={animationState.currentFrame >= totalFrames - 1}
          className="p-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="下一帧"
        >
          <SkipForward size={16} />
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded bg-ocean-100 hover:bg-ocean-200 text-ocean-600 transition-colors"
          title="重置"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>
            帧位置: {animationState.currentFrame + 1} / {totalFrames}
          </span>
          <span>进度: {progress.toFixed(1)}%</span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalFrames - 1)}
            value={animationState.currentFrame}
            onChange={handleFrameChange}
            disabled={totalFrames === 0}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />

          {/* 进度显示 */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>开始</span>
            <span>当前: {formatTime(animationState.currentFrame)}</span>
            <span>结束</span>
          </div>
        </div>
      </div>

      {/* 速度控制 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          播放速度: {animationState.speed}ms
        </label>
        <input
          type="range"
          min="50"
          max="3000"
          step="50"
          value={animationState.speed}
          onChange={handleSpeedChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>快速 (50ms)</span>
          <span>中等 (1000ms)</span>
          <span>慢速 (3000ms)</span>
        </div>
      </div>

      {/* 循环设置 */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={animationState.loop}
            onChange={(e) => setAnimationLoop(e.target.checked)}
            className="rounded text-ocean-600 focus:ring-ocean-500"
          />
          <span className="text-sm text-gray-700">循环播放</span>
        </label>

        <button
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="动画设置"
        >
          <Settings size={16} className="text-gray-500" />
        </button>
      </div>

      {/* 数据状态指示器 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "w-2 h-2 rounded-full",
                data.glider.length > 0 ? "bg-green-500" : "bg-gray-300"
              )}
            ></div>
            <span>滑翔器数据 ({data.glider.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                "w-2 h-2 rounded-full",
                data.typhoon.length > 0 ? "bg-green-500" : "bg-gray-300"
              )}
            ></div>
            <span>台风数据 ({data.typhoon.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationController;
