// src/hooks/useSystemSettings.ts
import { useState, useEffect, useCallback } from 'react';

export interface MapSettings {
  basemap: string;
  opacity: number;
  showLabels: boolean;
  showBoundaries: boolean;
  defaultZoom: number;
  defaultCenter: [number, number];
}

export interface LayerSettings {
  gliderVisible: boolean;
  gliderOpacity: number;
  typhoonVisible: boolean;
  typhoonOpacity: number;
  waveFieldVisible: boolean;
  waveFieldOpacity: number;
  showTrails: boolean;
  trailLength: number;
}

export interface AnimationSettings {
  defaultSpeed: number;
  autoLoop: boolean;
  smoothTransition: boolean;
  pauseOnHover: boolean;
  showProgress: boolean;
}

export interface UISettings {
  theme: string;
  language: string;
  showTooltips: boolean;
  compactMode: boolean;
  animationQuality: string;
}

export interface SystemSettingsData {
  map: MapSettings;
  layers: LayerSettings;
  animation: AnimationSettings;
  ui: UISettings;
}

const defaultSettings: SystemSettingsData = {
  map: {
    basemap: "satellite",
    opacity: 1,
    showLabels: true,
    showBoundaries: true,
    defaultZoom: 7,
    defaultCenter: [126.32, 28.24],
  },
  layers: {
    gliderVisible: true,
    gliderOpacity: 0.8,
    typhoonVisible: true,
    typhoonOpacity: 0.9,
    waveFieldVisible: true,
    waveFieldOpacity: 0.7,
    showTrails: true,
    trailLength: 10,
  },
  animation: {
    defaultSpeed: 1,
    autoLoop: true,
    smoothTransition: true,
    pauseOnHover: false,
    showProgress: true,
  },
  ui: {
    theme: "light",
    language: "zh-CN",
    showTooltips: true,
    compactMode: false,
    animationQuality: "high",
  },
};

const SETTINGS_STORAGE_KEY = 'marine-gis-system-settings';

export const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        // 合并默认设置和保存的设置，确保所有字段都存在
        setSettings({
          map: { ...defaultSettings.map, ...parsedSettings.map },
          layers: { ...defaultSettings.layers, ...parsedSettings.layers },
          animation: { ...defaultSettings.animation, ...parsedSettings.animation },
          ui: { ...defaultSettings.ui, ...parsedSettings.ui },
        });
      }
    } catch (error) {
      // console.error('加载系统设置失败:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存设置到localStorage
  const saveSettings = useCallback((newSettings: SystemSettingsData) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      // console.error('保存系统设置失败:', error);
    }
  }, []);

  // 更新特定部分的设置
  const updateMapSettings = useCallback((mapSettings: Partial<MapSettings>) => {
    const newSettings = {
      ...settings,
      map: { ...settings.map, ...mapSettings }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateLayerSettings = useCallback((layerSettings: Partial<LayerSettings>) => {
    const newSettings = {
      ...settings,
      layers: { ...settings.layers, ...layerSettings }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateAnimationSettings = useCallback((animationSettings: Partial<AnimationSettings>) => {
    const newSettings = {
      ...settings,
      animation: { ...settings.animation, ...animationSettings }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateUISettings = useCallback((uiSettings: Partial<UISettings>) => {
    const newSettings = {
      ...settings,
      ui: { ...settings.ui, ...uiSettings }
    };
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  // 重置所有设置
  const resetSettings = useCallback(() => {
    saveSettings(defaultSettings);
  }, [saveSettings]);

  // 导出设置
  const exportSettings = useCallback(() => {
    const dataToExport = {
      ...settings,
      exportTime: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marine-gis-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [settings]);

  // 导入设置
  const importSettings = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          
          // 验证导入的数据结构
          if (imported.map && imported.layers && imported.animation && imported.ui) {
            const newSettings = {
              map: { ...defaultSettings.map, ...imported.map },
              layers: { ...defaultSettings.layers, ...imported.layers },
              animation: { ...defaultSettings.animation, ...imported.animation },
              ui: { ...defaultSettings.ui, ...imported.ui },
            };
            
            saveSettings(newSettings);
            resolve(true);
          } else {
            reject(new Error('无效的设置文件格式'));
          }
        } catch (error) {
          reject(new Error('解析设置文件失败'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('读取设置文件失败'));
      };
      
      reader.readAsText(file);
    });
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateMapSettings,
    updateLayerSettings,
    updateAnimationSettings,
    updateUISettings,
    resetSettings,
    exportSettings,
    importSettings,
    saveSettings,
  };
};
