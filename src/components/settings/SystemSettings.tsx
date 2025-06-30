// src/components/settings/SystemSettings.tsx
import { useState, useEffect } from "react";
import {
  Map,
  Layers,
  Eye,
  EyeOff,
  Settings,
  Palette,
  Globe,
  Ruler,
  Target,
  Monitor,
  RotateCcw,
  Save,
  Download,
  Upload,
  MapPin,
  Navigation,
  Waves,
  Activity,
} from "lucide-react";
import clsx from "clsx";
import {
  useSystemSettings,
  type MapSettings,
  type LayerSettings,
  type AnimationSettings,
  type UISettings,
} from "../../hooks/useSystemSettings";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "../../hooks/useTranslation";

interface SystemSettingsProps {
  onSettingsChange?: (settings: any) => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({
  onSettingsChange,
}) => {
  // 使用系统设置hook
  const {
    settings,
    isLoading,
    updateMapSettings,
    updateLayerSettings,
    updateAnimationSettings,
    updateUISettings,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSystemSettings();

  // 使用主题和翻译
  const { theme, language, setTheme, setLanguage } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("map");

  // 当系统设置的主题/语言变化时，应用到上下文
  useEffect(() => {
    if (settings?.ui) {
      if (settings.ui.theme !== theme) {
        setTheme(settings.ui.theme);
      }
      if (settings.ui.language !== language) {
        setLanguage(settings.ui.language);
      }
    }
  }, [settings?.ui, theme, language, setTheme, setLanguage]);

  // 当上下文的主题/语言变化时，同步到系统设置
  useEffect(() => {
    if (
      settings?.ui &&
      (settings.ui.theme !== theme || settings.ui.language !== language)
    ) {
      updateUISettings({
        theme: theme,
        language: language,
      });
    }
  }, [theme, language, settings?.ui, updateUISettings]);

  // 当设置变化时通知父组件
  useEffect(() => {
    if (onSettingsChange && settings) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  // 处理导入设置
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importSettings(file).catch((error) => {
        // console.error("导入设置失败:", error);
      });
    }
  };

  // 底图选项
  const basemapOptions = [
    { id: "satellite", name: "卫星影像", description: "高分辨率卫星图像" },
    { id: "hybrid", name: "混合地图", description: "卫星影像 + 标注" },
    { id: "streets", name: "街道地图", description: "详细的街道信息" },
    { id: "topo", name: "地形图", description: "地形等高线图" },
    { id: "oceans", name: "海洋图", description: "专业海洋地图" },
    { id: "gray", name: "灰度地图", description: "简洁的灰度底图" },
  ];

  // 主题选项
  const themeOptions = [
    { id: "light", name: "浅色主题", icon: "☀️" },
    { id: "dark", name: "深色主题", icon: "🌙" },
    { id: "ocean", name: "海洋主题", icon: "🌊" },
  ];

  // 语言选项
  const languageOptions = [
    { id: "zh-CN", name: "简体中文" },
    { id: "zh-TW", name: "繁體中文" },
    { id: "en-US", name: "English" },
  ];

  // 动画质量选项
  const qualityOptions = [
    { id: "low", name: "低质量", description: "更快的性能" },
    { id: "medium", name: "中等质量", description: "平衡性能和质量" },
    { id: "high", name: "高质量", description: "最佳视觉效果" },
  ];

  // 标签页配置
  const tabs = [
    { id: "map", name: "地图设置", icon: Map },
    { id: "layers", name: "图层设置", icon: Layers },
    { id: "animation", name: "动画设置", icon: Activity },
    { id: "ui", name: "界面设置", icon: Monitor },
  ];

  // 加载中状态 - 移到所有hooks之后
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">加载设置中...</p>
        </div>
      </div>
    );
  }

  // 渲染地图设置
  const renderMapSettings = () => {
    if (!settings) return null;

    return (
      <div className="space-y-6">
        {/* 底图选择 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">底图类型</h4>
          <div className="grid grid-cols-2 gap-3">
            {basemapOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => updateMapSettings({ basemap: option.id })}
                className={clsx(
                  "p-3 rounded-lg border text-left transition-all",
                  settings.map.basemap === option.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="font-medium text-sm">{option.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底图透明度 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            底图透明度 ({Math.round((settings.map.opacity || 1) * 100)}%)
          </h4>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.map.opacity || 1}
            onChange={(e) =>
              updateMapSettings({ opacity: parseFloat(e.target.value) || 1 })
            }
            className="w-full themed-range"
          />
        </div>

        {/* 地图选项 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">地图选项</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.map.showLabels}
                onChange={(e) =>
                  updateMapSettings({ showLabels: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">显示地名标注</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.map.showBoundaries}
                onChange={(e) =>
                  updateMapSettings({ showBoundaries: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">显示行政边界</span>
            </label>
          </div>
        </div>

        {/* 默认视图 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">默认视图</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                缩放级别
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.map.defaultZoom || 8}
                onChange={(e) =>
                  updateMapSettings({
                    defaultZoom: parseInt(e.target.value) || 8,
                  })
                }
                className="w-full themed-input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                中心经度
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.map.defaultCenter?.[0] || 120.0}
                onChange={(e) =>
                  updateMapSettings({
                    defaultCenter: [
                      parseFloat(e.target.value) || 120.0,
                      settings.map.defaultCenter?.[1] || 24.0,
                    ],
                  })
                }
                className="w-full themed-input text-sm"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">中心纬度</label>
            <input
              type="number"
              step="0.1"
              value={settings.map.defaultCenter?.[1] || 24.0}
              onChange={(e) =>
                updateMapSettings({
                  defaultCenter: [
                    settings.map.defaultCenter?.[0] || 120.0,
                    parseFloat(e.target.value) || 24.0,
                  ],
                })
              }
              className="w-full themed-input text-sm"
            />
          </div>
        </div>
      </div>
    );
  };

  // 渲染图层设置
  const renderLayerSettings = () => {
    if (!settings) return null;

    return (
      <div className="space-y-6">
        {/* 滑翔器图层 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Navigation size={16} className="mr-2 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-700">波浪滑翔器</h4>
            </div>
            <button
              onClick={() =>
                updateLayerSettings({
                  gliderVisible: !settings.layers.gliderVisible,
                })
              }
              className="p-1 rounded"
            >
              {settings.layers.gliderVisible ? (
                <Eye size={16} className="text-green-600" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                透明度 (
                {Math.round((settings.layers.gliderOpacity || 0.8) * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.layers.gliderOpacity || 0.8}
                onChange={(e) =>
                  updateLayerSettings({
                    gliderOpacity: parseFloat(e.target.value) || 0.8,
                  })
                }
                className="w-full"
                disabled={!settings.layers.gliderVisible}
              />
            </div>
          </div>
        </div>

        {/* 台风图层 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Target size={16} className="mr-2 text-red-600" />
              <h4 className="text-sm font-medium text-gray-700">台风轨迹</h4>
            </div>
            <button
              onClick={() =>
                updateLayerSettings({
                  typhoonVisible: !settings.layers.typhoonVisible,
                })
              }
              className="p-1 rounded"
            >
              {settings.layers.typhoonVisible ? (
                <Eye size={16} className="text-green-600" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                透明度 (
                {Math.round((settings.layers.typhoonOpacity || 0.9) * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.layers.typhoonOpacity || 0.9}
                onChange={(e) =>
                  updateLayerSettings({
                    typhoonOpacity: parseFloat(e.target.value) || 0.9,
                  })
                }
                className="w-full"
                disabled={!settings.layers.typhoonVisible}
              />
            </div>
          </div>
        </div>

        {/* 波浪场图层 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Waves size={16} className="mr-2 text-cyan-600" />
              <h4 className="text-sm font-medium text-gray-700">SWAN波浪场</h4>
            </div>
            <button
              onClick={() =>
                updateLayerSettings({
                  waveFieldVisible: !settings.layers.waveFieldVisible,
                })
              }
              className="p-1 rounded"
            >
              {settings.layers.waveFieldVisible ? (
                <Eye size={16} className="text-green-600" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                透明度 (
                {Math.round((settings.layers.waveFieldOpacity || 0.7) * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.layers.waveFieldOpacity || 0.7}
                onChange={(e) =>
                  updateLayerSettings({
                    waveFieldOpacity: parseFloat(e.target.value) || 0.7,
                  })
                }
                className="w-full"
                disabled={!settings.layers.waveFieldVisible}
              />
            </div>
          </div>
        </div>

        {/* 轨迹设置 */}
        <div className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">轨迹显示</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.layers.showTrails}
                onChange={(e) =>
                  updateLayerSettings({ showTrails: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">显示历史轨迹</span>
            </label>
            {settings.layers.showTrails && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  轨迹长度 ({settings.layers.trailLength || 10} 点)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.layers.trailLength || 10}
                  onChange={(e) =>
                    updateLayerSettings({
                      trailLength: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染动画设置
  const renderAnimationSettings = () => {
    if (!settings) return null;

    return (
      <div className="space-y-6">
        {/* 播放设置 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">播放设置</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                默认播放速度 ({settings.animation.defaultSpeed || 1}x)
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={settings.animation.defaultSpeed || 1}
                onChange={(e) =>
                  updateAnimationSettings({
                    defaultSpeed: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full themed-range"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.animation.autoLoop}
                onChange={(e) =>
                  updateAnimationSettings({ autoLoop: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">自动循环播放</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.animation.smoothTransition}
                onChange={(e) =>
                  updateAnimationSettings({
                    smoothTransition: e.target.checked,
                  })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">平滑过渡动画</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.animation.pauseOnHover}
                onChange={(e) =>
                  updateAnimationSettings({ pauseOnHover: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">悬停时暂停</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.animation.showProgress}
                onChange={(e) =>
                  updateAnimationSettings({ showProgress: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">显示进度条</span>
            </label>
          </div>
        </div>

        {/* 动画质量 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">动画质量</h4>
          <div className="space-y-2">
            {qualityOptions.map((option) => (
              <button
                key={option.id}
                onClick={() =>
                  updateUISettings({ animationQuality: option.id })
                }
                className={clsx(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  settings.ui.animationQuality === option.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div className="font-medium text-sm">{option.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染界面设置
  const renderUISettings = () => {
    if (!settings) return null;

    return (
      <div className="space-y-6">
        {/* 主题设置 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">界面主题</h4>
          <div className="grid grid-cols-1 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setTheme(option.id);
                  updateUISettings({ theme: option.id });
                }}
                className={clsx(
                  "p-3 rounded-lg border text-left transition-all flex items-center",
                  theme === option.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <span className="mr-3 text-lg">{option.icon}</span>
                <span className="font-medium text-sm">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 语言设置 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">界面语言</h4>
          <select
            value={language}
            onChange={(e) => {
              const newLanguage = e.target.value;
              setLanguage(newLanguage);
              updateUISettings({ language: newLanguage });
            }}
            className="w-full themed-select"
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* 界面选项 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">界面选项</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.ui.showTooltips}
                onChange={(e) =>
                  updateUISettings({ showTooltips: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">显示工具提示</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.ui.compactMode}
                onChange={(e) =>
                  updateUISettings({ compactMode: e.target.checked })
                }
                className="mr-2 themed-checkbox"
              />
              <span className="text-sm">紧凑模式</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Settings size={20} className="mr-2 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">系统设置</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetSettings}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="重置所有设置"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={exportSettings}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="导出设置"
          >
            <Download size={16} />
          </button>
          <label className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors cursor-pointer">
            <Upload size={16} />
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
              title="导入设置"
            />
          </label>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon size={16} className="mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="min-h-96">
        {activeTab === "map" && renderMapSettings()}
        {activeTab === "layers" && renderLayerSettings()}
        {activeTab === "animation" && renderAnimationSettings()}
        {activeTab === "ui" && renderUISettings()}
      </div>

      {/* 保存提示 */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        💡 设置会自动保存，刷新页面后仍然生效
      </div>
    </div>
  );
};

export default SystemSettings;
