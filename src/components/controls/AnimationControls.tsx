// src/components/controls/AnimationControls.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAnimationController } from "../../hooks/useAnimationController";
import { useMapManagerStore } from "../../hooks/useMapManager";
import { useAppStore } from "../../stores/appStore";

interface AnimationControlsProps {
  className?: string;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  className = "",
}) => {
  const { mapManager } = useMapManagerStore();
  const { data, setAnimationLoop } = useAppStore();

  // 使用全新的动画控制器
  const {
    isPlaying,
    currentFrame,
    totalFrames,
    speed,
    loop,
    metrics,
    togglePlayPause,
    updateSpeed,
    goToFrame,
    nextFrame,
    prevFrame,
    stop,
    getProgress,
    getCurrentFrameInfo,
  } = useAnimationController();

  // 本地状态
  const [waveFieldStatus, setWaveFieldStatus] = useState<{
    exists: boolean;
    loaded: boolean;
    message: string;
  } | null>(null);

  // 速度预设配置
  const speedPresets = useMemo(
    () => [
      { label: "极快", value: 100, fps: 10 },
      { label: "快", value: 200, fps: 5 },
      { label: "正常", value: 400, fps: 2.5 },
      { label: "慢", value: 800, fps: 1.25 },
      { label: "极慢", value: 1600, fps: 0.6 },
    ],
    []
  );

  // 获取当前帧信息
  const currentFrameInfo = getCurrentFrameInfo();

  // 获取速度标签
  const getSpeedLabel = useCallback(
    (currentSpeed: number): string => {
      const preset = speedPresets.find(
        (p) => Math.abs(p.value - currentSpeed) < 50
      );
      return preset ? preset.label : "自定义";
    },
    [speedPresets]
  );

  // 获取帧率显示
  const getFrameRateDisplay = useCallback((currentSpeed: number): string => {
    const fps = 1000 / currentSpeed;
    return fps >= 1 ? `${fps.toFixed(1)}fps` : `${(fps * 1000).toFixed(0)}ms`;
  }, []);

  // 处理速度滑块变化
  const handleSpeedChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newSpeed = parseInt(event.target.value, 10);
      // console.log(`🎛️ 用户调整速度: ${speed}ms → ${newSpeed}ms`);
      updateSpeed(newSpeed);
    },
    [speed, updateSpeed]
  );

  // 处理帧位置变化
  const handleFrameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const frame = parseInt(event.target.value, 10);
      goToFrame(frame);
    },
    [goToFrame]
  );

  // 处理速度预设选择
  const handleSpeedPreset = useCallback(
    (presetValue: number) => {
      // console.log(`⚡ 快速切换到预设速度: ${presetValue}ms`);
      updateSpeed(presetValue);
    },
    [updateSpeed]
  );

  // 处理循环模式切换
  const handleLoopToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAnimationLoop(event.target.checked);
    },
    [setAnimationLoop]
  );

  // 波场图层状态监控
  useEffect(() => {
    if (!mapManager) {
      setWaveFieldStatus(null);
      return;
    }

    const updateWaveFieldStatus = () => {
      try {
        const status = mapManager.getWaveFieldStatus();
        setWaveFieldStatus(status);
      } catch (error) {
        // console.warn("获取波场图层状态失败:", error);
        setWaveFieldStatus({
          exists: false,
          loaded: false,
          message: "波场图层状态未知",
        });
      }
    };

    updateWaveFieldStatus();
    const intervalId = setInterval(updateWaveFieldStatus, 3000);

    return () => clearInterval(intervalId);
  }, [mapManager]);

  // 手动重试波场图层初始化
  const handleRetryWaveField = useCallback(() => {
    if (!mapManager) return;

    // console.log("手动重试波场图层初始化...");
    mapManager
      .initializeWaveField()
      .then(() => {
        // console.log("手动初始化波场图层成功");
        const status = mapManager.getWaveFieldStatus();
        setWaveFieldStatus(status);
      })
      .catch((error: any) => {
        // console.error("手动初始化波场图层失败:", error);
        setWaveFieldStatus({
          exists: false,
          loaded: false,
          message: "波场图层初始化失败，请检查 ArcGIS Server",
        });
      });
  }, [mapManager]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          event.preventDefault();
          prevFrame();
          break;
        case "ArrowRight":
          event.preventDefault();
          nextFrame();
          break;
        case "Home":
          event.preventDefault();
          goToFrame(0);
          break;
        case "End":
          event.preventDefault();
          goToFrame(totalFrames - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, prevFrame, nextFrame, goToFrame, totalFrames]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        {/* 标题和时间显示 */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            🎬 动画控制 {isPlaying && <span className="text-blue-600">●</span>}
          </h3>
          <div className="text-sm text-gray-600">
            {currentFrameInfo ? (
              <span>{currentFrameInfo.timestamp.toLocaleString("zh-CN")}</span>
            ) : (
              <span>无数据</span>
            )}
          </div>
        </div>

        {/* 播放控制按钮 */}
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={prevFrame}
            disabled={totalFrames === 0}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="上一帧 (←)"
          >
            ⏮
          </button>

          <button
            onClick={togglePlayPause}
            disabled={totalFrames === 0}
            className={`px-4 py-2 text-white rounded transition-colors font-bold ${
              isPlaying
                ? "bg-orange-500 hover:bg-orange-600 animate-pulse"
                : "bg-green-500 hover:bg-green-600"
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}
            title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button
            onClick={stop}
            disabled={totalFrames === 0}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="停止并重置"
          >
            ⏹
          </button>

          <button
            onClick={nextFrame}
            disabled={totalFrames === 0}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="下一帧 (→)"
          >
            ⏭
          </button>
        </div>

        {/* 进度条和帧信息 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className={isPlaying ? "font-bold text-blue-600" : ""}>
              帧 {currentFrame + 1} / {totalFrames}
            </span>
            <span className={isPlaying ? "font-bold text-blue-600" : ""}>
              进度: {getProgress().toFixed(1)}%
            </span>
          </div>

          <div className="relative">
            <input
              type="range"
              min={0}
              max={Math.max(0, totalFrames - 1)}
              value={currentFrame}
              onChange={handleFrameChange}
              disabled={totalFrames === 0}
              className="w-full h-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg appearance-none cursor-pointer 
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                         [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-gradient-to-r 
                         [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-blue-600
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all
                         [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-xl
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* 播放进度指示器 */}
            {totalFrames > 0 && (
              <div
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg pointer-events-none"
                style={{
                  width: `${getProgress()}%`,
                  transition: isPlaying ? "none" : "width 0.2s ease",
                }}
              />
            )}
          </div>
        </div>

        {/* 速度控制 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="speed-slider">🚀 播放速度:</label>
            <div className="text-right">
              <div className="text-gray-600 font-medium">
                {getSpeedLabel(speed)}
              </div>
            </div>
          </div>

          {/* 主速度滑块 */}
          <input
            id="speed-slider"
            type="range"
            min={100}
            max={2000}
            step={50}
            value={speed}
            onChange={handleSpeedChange}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 
                       [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-blue-500 
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all
                       [&::-webkit-slider-thumb]:hover:bg-blue-600 [&::-webkit-slider-thumb]:hover:scale-110"
          />

          {/* 速度预设按钮 */}
          <div className="grid grid-cols-5 gap-2">
            {speedPresets.map((preset) => {
              const isActive = Math.abs(speed - preset.value) < 50;
              return (
                <button
                  key={preset.value}
                  onClick={() => handleSpeedPreset(preset.value)}
                  className={`px-2 py-1 text-xs rounded transition-all font-medium ${
                    isActive
                      ? "bg-blue-500 text-white shadow-md scale-105 ring-2 ring-blue-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title={`${preset.fps}fps`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-gray-400">
            <span>快 (10fps)</span>
            <span>中等 (2.5fps)</span>
            <span>慢 (0.6fps)</span>
          </div>
        </div>

        {/* 循环播放选项 */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="loop-checkbox"
            checked={loop}
            onChange={handleLoopToggle}
            className="rounded"
          />
          <label htmlFor="loop-checkbox" className="text-sm">
            🔄 循环播放
          </label>
        </div>

        {/* 数据统计 */}
        <div className="text-xs text-gray-500 border-t pt-2 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>🌊 滑翔器: {data.glider.length} 点</div>
            <div>🌀 台风: {data.typhoon.length} 点</div>
            <div>🌊 波场: {data.waveField.length} 帧</div>
          </div>

          {/* 波场图层状态 */}
          {waveFieldStatus && (
            <div
              className={`flex items-center justify-between text-xs p-2 rounded ${
                waveFieldStatus.loaded
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : waveFieldStatus.exists
                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    waveFieldStatus.loaded
                      ? "bg-green-500"
                      : waveFieldStatus.exists
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-blue-500"
                  }`}
                ></span>
                <span>{waveFieldStatus.message}</span>
              </div>

              {!waveFieldStatus.loaded && (
                <button
                  onClick={handleRetryWaveField}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  title="重新初始化波场图层"
                >
                  🔄 重试
                </button>
              )}
            </div>
          )}

          {/* 快捷键提示 */}
          <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
            <strong>快捷键:</strong>{" "}
            空格键播放/暂停，←→箭头逐帧，Home/End跳转首尾
          </div>
        </div>
      </div>
    </div>
  );
};
