// src/components/common/DataStatsPanel.tsx
import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Wind,
  Waves,
  Navigation,
  Clock,
  MapPin,
} from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { calculateStats, formatNumber } from "../../utils";
import clsx from "clsx";

interface DataStatsPanelProps {
  className?: string;
  dataType?: "glider" | "typhoon" | "all";
}

const DataStatsPanel: React.FC<DataStatsPanelProps> = ({
  className = "",
  dataType = "all",
}) => {
  const { data, animationState } = useAppStore();

  // 计算滑翔器数据统计
  const gliderStats = React.useMemo(() => {
    if (data.glider.length === 0) return null;

    const temps = data.glider.map((d) => d.airTemp).filter((t) => !isNaN(t));
    const winds = data.glider.map((d) => d.windSpeed).filter((w) => !isNaN(w));
    const waterTemps = data.glider
      .map((d) => d.waterTemp)
      .filter((wt) => !isNaN(wt));
    const pressures = data.glider
      .map((d) => d.pressure)
      .filter((p) => !isNaN(p));

    return {
      count: data.glider.length,
      temperature: calculateStats(temps),
      windSpeed: calculateStats(winds),
      waterTemp: calculateStats(waterTemps),
      pressure: calculateStats(pressures),
      timeRange: {
        start: data.glider[0]?.timestamp || new Date(),
        end: data.glider[data.glider.length - 1]?.timestamp || new Date(),
      },
    };
  }, [data.glider]);

  // 计算台风数据统计
  const typhoonStats = React.useMemo(() => {
    if (data.typhoon.length === 0) return null;

    const windRadii = data.typhoon
      .map((d) => d.windRadius)
      .filter((r) => !isNaN(r));
    const longitudes = data.typhoon.map((d) => d.longitude);
    const latitudes = data.typhoon.map((d) => d.latitude);

    return {
      count: data.typhoon.length,
      windRadius: calculateStats(windRadii),
      lonRange: { min: Math.min(...longitudes), max: Math.max(...longitudes) },
      latRange: { min: Math.min(...latitudes), max: Math.max(...latitudes) },
      timeRange: {
        start: data.typhoon[0]?.timestamp || new Date(),
        end: data.typhoon[data.typhoon.length - 1]?.timestamp || new Date(),
      },
    };
  }, [data.typhoon]);

  // 当前帧数据
  const currentGliderData = data.glider[animationState.currentFrame];
  const currentTyphoonData = data.typhoon[animationState.currentFrame];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ComponentType<any>;
    color: string;
    trend?: "up" | "down" | "stable";
    subtitle?: string;
  }> = ({ title, value, unit = "", icon: Icon, color, trend, subtitle }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={clsx("h-5 w-5", color)} />
        {trend && (
          <div
            className={clsx(
              "flex items-center text-xs",
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                ? "text-red-600"
                : "text-gray-500"
            )}
          >
            {trend === "up" && <TrendingUp size={12} />}
            {trend === "down" && <TrendingDown size={12} />}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-600 mb-1">{title}</p>
        <p className="text-lg font-bold text-gray-900">
          {typeof value === "number" ? formatNumber(value, 2) : value}
          {unit && (
            <span className="text-sm font-normal text-gray-500 ml-1">
              {unit}
            </span>
          )}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className={clsx("space-y-4", className)}>
      {/* 滑翔器统计 */}
      {(dataType === "glider" || dataType === "all") && gliderStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">波浪滑翔器数据统计</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              title="观测点总数"
              value={gliderStats.count}
              icon={MapPin}
              color="text-blue-500"
            />
            <StatCard
              title="当前观测点"
              value={animationState.currentFrame + 1}
              icon={Clock}
              color="text-green-500"
              subtitle={`${(
                (animationState.currentFrame / gliderStats.count) *
                100
              ).toFixed(1)}% 完成`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <StatCard
              title="平均气温"
              value={gliderStats.temperature.mean}
              unit="°C"
              icon={Thermometer}
              color="text-red-500"
              subtitle={`范围: ${gliderStats.temperature.min.toFixed(
                1
              )} - ${gliderStats.temperature.max.toFixed(1)}°C`}
            />
            <StatCard
              title="平均风速"
              value={gliderStats.windSpeed.mean}
              unit="m/s"
              icon={Wind}
              color="text-cyan-500"
              subtitle={`最大: ${gliderStats.windSpeed.max.toFixed(1)} m/s`}
            />
            <StatCard
              title="平均水温"
              value={gliderStats.waterTemp.mean}
              unit="°C"
              icon={Waves}
              color="text-blue-500"
              subtitle={`标准差: ${gliderStats.waterTemp.std.toFixed(2)}°C`}
            />
          </div>

          {/* 当前观测数据 */}
          {currentGliderData && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                📍 当前观测数据
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">经度: </span>
                  <span className="font-medium">
                    {currentGliderData.longitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">纬度: </span>
                  <span className="font-medium">
                    {currentGliderData.latitude.toFixed(6)}°
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">气温: </span>
                  <span className="font-medium">
                    {currentGliderData.airTemp.toFixed(1)}°C
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-600">风速: </span>
                  <span className="font-medium">
                    {currentGliderData.windSpeed.toFixed(1)} m/s
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 台风统计 */}
      {(dataType === "typhoon" || dataType === "all") && typhoonStats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wind className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-gray-800">台风梅花数据统计</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              title="轨迹点总数"
              value={typhoonStats.count}
              icon={MapPin}
              color="text-red-500"
            />
            <StatCard
              title="平均风圈半径"
              value={typhoonStats.windRadius.mean}
              unit="km"
              icon={Wind}
              color="text-orange-500"
              subtitle={`最大: ${typhoonStats.windRadius.max.toFixed(0)} km`}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">经度范围: </span>
              <span className="font-medium">
                {typhoonStats.lonRange.min.toFixed(2)}° -{" "}
                {typhoonStats.lonRange.max.toFixed(2)}°
              </span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600">纬度范围: </span>
              <span className="font-medium">
                {typhoonStats.latRange.min.toFixed(2)}° -{" "}
                {typhoonStats.latRange.max.toFixed(2)}°
              </span>
            </div>
          </div>

          {/* 当前台风数据 */}
          {currentTyphoonData && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                🌀 当前台风状态
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <span className="text-red-600">位置: </span>
                  <span className="font-medium">
                    {currentTyphoonData.longitude.toFixed(2)}°E,{" "}
                    {currentTyphoonData.latitude.toFixed(2)}°N
                  </span>
                </div>
                <div className="bg-red-50 p-2 rounded border border-red-200">
                  <span className="text-red-600">风圈: </span>
                  <span className="font-medium">
                    {currentTyphoonData.windRadius.toFixed(0)} km
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 系统性能统计 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">系统状态</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">总数据点</p>
            <p className="text-xl font-bold text-gray-800">
              {data.glider.length + data.typhoon.length}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">动画帧数</p>
            <p className="text-xl font-bold text-gray-800">
              {Math.max(data.glider.length, data.waveField.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataStatsPanel;
