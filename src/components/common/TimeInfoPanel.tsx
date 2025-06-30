// src/components/common/TimeInfoPanel.tsx
import * as React from "react";
import { useAppStore } from "../../stores/appStore";
import { useMapAnimation } from "../../hooks/useMapAnimation";
import { TyphoonData } from "../../types";

interface TimeInfoPanelProps {
  className?: string;
}

// 根据风圈半径估算台风强度等级
const getTyphoonIntensity = (typhoon: TyphoonData): string => {
  // 如果有直接的强度信息，使用它
  if (typhoon.intensity && typhoon.intensity !== "unknown") {
    return typhoon.intensity;
  }

  // 根据风圈半径估算强度（这是一个简化的分类）
  const radius = typhoon.windRadius || typhoon.radius || 0;

  if (radius >= 300) {
    return "超强台风";
  } else if (radius >= 200) {
    return "强台风";
  } else if (radius >= 150) {
    return "台风";
  } else if (radius >= 100) {
    return "强热带风暴";
  } else if (radius >= 50) {
    return "热带风暴";
  } else {
    return "热带低压";
  }
};

interface TimeInfoPanelProps {
  className?: string;
}

export const TimeInfoPanel: React.FC<TimeInfoPanelProps> = ({
  className = "",
}) => {
  const { data, animationState } = useAppStore();
  const mapAnimation = useMapAnimation(null); // 不需要地图管理器实例，只获取数据

  const currentFrameData = mapAnimation.getCurrentFrameData();
  const timeRange = mapAnimation.getTimeRange();
  const dataStats = mapAnimation.getDataStats();

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="space-y-4">
        {/* 标题 */}
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          📅 时间信息
        </h3>

        {/* 当前时间帧信息 */}
        {currentFrameData ? (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">当前时间帧</h4>
              <div className="text-sm space-y-1">
                <p>
                  <strong>时间:</strong>{" "}
                  {currentFrameData.timestamp.toLocaleString("zh-CN")}
                </p>
                <p>
                  <strong>帧序号:</strong> {currentFrameData.index + 1} /{" "}
                  {dataStats.totalFrames}
                </p>
              </div>
            </div>

            {/* 台风信息 */}
            {currentFrameData.typhoon && (
              <div className="bg-orange-50 p-3 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">
                  🌀 台风状态
                </h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>位置:</strong>{" "}
                    {currentFrameData.typhoon.longitude.toFixed(3)}°E,{" "}
                    {currentFrameData.typhoon.latitude.toFixed(3)}°N
                  </p>
                  <p>
                    <strong>风圈半径:</strong>{" "}
                    {currentFrameData.typhoon.windRadius ||
                      currentFrameData.typhoon.radius ||
                      "N/A"}{" "}
                    km
                  </p>
                  <p>
                    <strong>强度:</strong>{" "}
                    {getTyphoonIntensity(currentFrameData.typhoon)}
                  </p>
                </div>
              </div>
            )}

            {/* 滑翔器信息 */}
            {currentFrameData.gliderPoints.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">
                  🚁 滑翔器观测
                </h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>观测点数:</strong>{" "}
                    {currentFrameData.gliderPoints.length}
                  </p>
                  {currentFrameData.gliderPoints[0] && (
                    <>
                      <p>
                        <strong>最新位置:</strong>{" "}
                        {currentFrameData.gliderPoints[0].longitude.toFixed(6)}
                        °E,{" "}
                        {currentFrameData.gliderPoints[0].latitude.toFixed(6)}°N
                      </p>
                      <p>
                        <strong>水温:</strong>{" "}
                        {currentFrameData.gliderPoints[0].waterTemp?.toFixed(
                          1
                        ) || "N/A"}
                        °C
                      </p>
                      <p>
                        <strong>风速:</strong>{" "}
                        {currentFrameData.gliderPoints[0].windSpeed?.toFixed(
                          1
                        ) || "N/A"}{" "}
                        m/s
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">无当前时间帧数据</div>
        )}

        {/* 时间范围信息 */}
        {timeRange && (
          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-700 mb-2">📊 时间范围</h4>
            <div className="text-sm space-y-1 text-gray-600">
              <p>
                <strong>开始:</strong> {timeRange.start.toLocaleString("zh-CN")}
              </p>
              <p>
                <strong>结束:</strong> {timeRange.end.toLocaleString("zh-CN")}
              </p>
              <p>
                <strong>时长:</strong>{" "}
                {Math.round(
                  (timeRange.end.getTime() - timeRange.start.getTime()) /
                    (1000 * 60 * 60)
                )}{" "}
                小时
              </p>
              <p>
                <strong>平均间隔:</strong>{" "}
                {Math.round(dataStats.frameInterval / (1000 * 60))} 分钟
              </p>
            </div>
          </div>
        )}

        {/* 数据重叠分析 */}
        {dataStats.overlap && (
          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-700 mb-2">🔗 数据重叠分析</h4>
            <div className="text-sm space-y-2 text-gray-600">
              {dataStats.overlap.gliderRange && (
                <div className="bg-gray-50 p-2 rounded">
                  <p>
                    <strong>滑翔器时间范围:</strong>
                  </p>
                  <p className="ml-2">
                    {dataStats.overlap.gliderRange.start.toLocaleDateString()} -{" "}
                    {dataStats.overlap.gliderRange.end.toLocaleDateString()}
                  </p>
                </div>
              )}

              {dataStats.overlap.typhoonRange && (
                <div className="bg-gray-50 p-2 rounded">
                  <p>
                    <strong>台风时间范围:</strong>
                  </p>
                  <p className="ml-2">
                    {dataStats.overlap.typhoonRange.start.toLocaleDateString()}{" "}
                    - {dataStats.overlap.typhoonRange.end.toLocaleDateString()}
                  </p>
                </div>
              )}

              {dataStats.overlap.waveFieldRange && (
                <div className="bg-gray-50 p-2 rounded">
                  <p>
                    <strong>波场时间范围:</strong>
                  </p>
                  <p className="ml-2">
                    {dataStats.overlap.waveFieldRange.start.toLocaleDateString()}{" "}
                    -{" "}
                    {dataStats.overlap.waveFieldRange.end.toLocaleDateString()}
                  </p>
                </div>
              )}

              {dataStats.overlap.overlapRange ? (
                <div className="bg-green-50 p-2 rounded border border-green-200">
                  <p>
                    <strong>数据重叠期:</strong>
                  </p>
                  <p className="ml-2 text-green-700">
                    {dataStats.overlap.overlapRange.start.toLocaleDateString()}{" "}
                    - {dataStats.overlap.overlapRange.end.toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <p className="text-red-700">⚠️ 数据集之间无时间重叠</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
