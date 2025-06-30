// src/components/common/FloatingInfoPanel.tsx
import { useState } from "react";
import {
  X,
  MapPin,
  Thermometer,
  Wind,
  Gauge,
  Navigation2,
  Calendar,
  Battery,
  Compass,
  Activity,
  Settings,
  ChevronDown,
  ChevronRight,
  Info,
  Eye,
  Zap,
} from "lucide-react";
import { GliderData } from "../../types";
import clsx from "clsx";

interface FloatingInfoPanelProps {
  isVisible: boolean;
  currentPoint: GliderData | null;
  currentIndex: number;
  totalPoints: number;
  onClose: () => void;
  className?: string;
}

// 数据分类定义
interface DataCategory {
  id: string;
  title: string;
  icon: any; // 简化图标类型
  color: string;
  bgColor: string;
  items: Array<{
    key: keyof GliderData | string;
    label: string;
    unit?: string;
    decimals?: number;
    icon?: any; // 简化图标类型
  }>;
}

const FloatingInfoPanel: React.FC<FloatingInfoPanelProps> = ({
  isVisible,
  currentPoint,
  currentIndex,
  totalPoints,
  onClose,
  className,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["basic", "location", "environment"]) // 默认展开的分类
  );

  if (!isVisible || !currentPoint) {
    return null;
  }

  // 数据分类配置
  const dataCategories: DataCategory[] = [
    {
      id: "basic",
      title: "基本信息",
      icon: Info,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      items: [
        { key: "ID", label: "ID", decimals: 0 },
        { key: "日期", label: "日期" },
        { key: "时间", label: "时间" },
      ],
    },
    {
      id: "location",
      title: "位置与导航",
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-50",
      items: [
        {
          key: "longitude",
          label: "经度",
          unit: "°",
          decimals: 6,
          icon: Compass,
        },
        {
          key: "latitude",
          label: "纬度",
          unit: "°",
          decimals: 6,
          icon: Compass,
        },
        {
          key: "期望航向",
          label: "期望航向",
          unit: "°",
          decimals: 0,
          icon: Navigation2,
        },
        {
          key: "heading",
          label: "当前航向",
          unit: "°",
          decimals: 1,
          icon: Navigation2,
        },
        { key: "距离", label: "累计距离", unit: "m", decimals: 0 },
      ],
    },
    {
      id: "attitude",
      title: "姿态控制",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      items: [
        { key: "pitch", label: "俯仰角", unit: "°", decimals: 2 },
        { key: "roll", label: "横滚角", unit: "°", decimals: 2 },
        { key: "舵角", label: "舵角", unit: "°", decimals: 2, icon: Settings },
      ],
    },
    {
      id: "motion",
      title: "运动特征",
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      items: [
        { key: "speed", label: "总速度", unit: "m/s", decimals: 3 },
        { key: "有效速度", label: "有效速度", unit: "m/s", decimals: 3 },
      ],
    },
    {
      id: "environment",
      title: "环境观测",
      icon: Eye,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      items: [
        {
          key: "waterTemp",
          label: "表层水温",
          unit: "°C",
          decimals: 2,
          icon: Thermometer,
        },
        {
          key: "airTemp",
          label: "气温",
          unit: "°C",
          decimals: 2,
          icon: Thermometer,
        },
        {
          key: "pressure",
          label: "气压",
          unit: "atm",
          decimals: 3,
          icon: Gauge,
        },
        {
          key: "windSpeed",
          label: "风速",
          unit: "m/s",
          decimals: 3,
          icon: Wind,
        },
        {
          key: "windDirection",
          label: "风向",
          unit: "°",
          decimals: 1,
          icon: Wind,
        },
      ],
    },
    {
      id: "system",
      title: "系统状态",
      icon: Battery,
      color: "text-red-600",
      bgColor: "bg-red-50",
      items: [
        {
          key: "电压",
          label: "电池电压",
          unit: "V",
          decimals: 2,
          icon: Battery,
        },
      ],
    },
  ];

  // 切换分类展开/折叠
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: Date) => {
    try {
      return timestamp.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return timestamp.toString();
    }
  };

  // 获取数据值 - 使用转换后的英文字段名
  const getDataValue = (data: GliderData, key: string): any => {
    // 基本信息映射
    if (key === "ID") return data.id;
    if (key === "日期") return data.date;
    if (key === "时间") return data.time;

    // 位置与导航映射
    if (key === "longitude") return data.longitude;
    if (key === "latitude") return data.latitude;
    if (key === "heading") return data.heading;
    if (key === "期望航向") return data.expectedHeading;
    if (key === "距离") return data.distance;

    // 姿态控制映射
    if (key === "pitch") return data.pitch;
    if (key === "roll") return data.roll;
    if (key === "舵角") return data.rudderAngle;

    // 运动特征映射
    if (key === "speed") return data.speed;
    if (key === "有效速度") return data.effectiveSpeed;

    // 环境观测映射
    if (key === "waterTemp") return data.waterTemp;
    if (key === "airTemp") return data.airTemp;
    if (key === "pressure") return data.pressure;
    if (key === "windSpeed") return data.windSpeed;
    if (key === "windDirection") return data.windDirection;

    // 系统状态映射
    if (key === "电压") return data.voltage;

    // 如果没有映射，直接返回原始值
    const value = (data as any)[key];
    return value;
  };

  // 格式化数值
  const formatValue = (value: any, unit?: string, decimals: number = 2) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "number" && isNaN(value))
    ) {
      return "N/A";
    }

    if (typeof value === "string") {
      return unit ? `${value} ${unit}` : value;
    }

    if (typeof value === "number") {
      return unit
        ? `${value.toFixed(decimals)} ${unit}`
        : value.toFixed(decimals);
    }

    return value.toString();
  };

  // 格式化坐标
  const formatCoordinate = (value: number, type: "lat" | "lon") => {
    const direction =
      type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
    return `${Math.abs(value).toFixed(6)}° ${direction}`;
  };

  return (
    <div
      className={clsx(
        "fixed top-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50",
        "animate-in slide-in-from-left-2 duration-300 max-h-[90vh] overflow-hidden flex flex-col",
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-ocean-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Navigation2 size={20} className="text-ocean-600" />
          <div>
            <h3 className="font-semibold text-ocean-800">滑翔器观测数据</h3>
            <div className="text-sm text-ocean-600">
              第 {currentIndex + 1} 个观测点 / 共 {totalPoints} 个
            </div>
          </div>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-ocean-100 transition-colors"
        >
          <X size={16} className="text-ocean-600" />
        </button>
      </div>

      {/* 内容区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 时间信息卡片 */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <Calendar size={18} className="text-blue-600" />
          <div>
            <div className="text-sm font-medium text-blue-800">观测时间</div>
            <div className="text-sm text-blue-600">
              {formatTimestamp(currentPoint.timestamp)}
            </div>
          </div>
        </div>

        {/* 数据分类展示 */}
        {dataCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const CategoryIcon = category.icon;

          return (
            <div
              key={category.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* 分类头部 */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={clsx(
                  "w-full flex items-center justify-between p-3 transition-colors",
                  category.bgColor,
                  "hover:brightness-95"
                )}
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon size={18} className={category.color} />
                  <span className={clsx("font-medium", category.color)}>
                    {category.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({category.items.length} 项)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className={category.color} />
                ) : (
                  <ChevronRight size={16} className={category.color} />
                )}
              </button>

              {/* 分类内容 */}
              {isExpanded && (
                <div className="p-3 bg-white space-y-2">
                  {category.items.map((item, index) => {
                    const value = getDataValue(currentPoint, item.key);
                    const ItemIcon = item.icon;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {ItemIcon && (
                            <ItemIcon size={14} className="text-gray-600" />
                          )}
                          <span className="text-sm text-gray-700">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatValue(value, item.unit, item.decimals)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 进度指示器 */}
        <div className="pt-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 -mx-4 px-4 pb-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-700">播放进度</span>
            <span className="text-sm text-gray-600">
              {(((currentIndex + 1) / totalPoints) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-ocean-400 to-ocean-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentIndex + 1) / totalPoints) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>起始点</span>
            <span>当前: {currentIndex + 1}</span>
            <span>终点: {totalPoints}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingInfoPanel;
