// src/locales/translations.ts

export const translations = {
  'zh-CN': {
    // 系统标题
    'system.title': '🌊 海洋GIS集成系统',
    
    // 模块名称
    'module.dashboard': '系统概览',
    'module.waveGlider': '波浪滑翔器',
    'module.waveField': 'SWAN波浪场',
    'module.integratedAnalysis': '综合分析',
    'module.settings': '系统设置',
    
    // 模块描述
    'module.dashboard.desc': '系统整体状态和数据概览',
    'module.waveGlider.desc': '台风白鹿观测数据分析',
    'module.waveField.desc': '台风梅花波浪场动画',
    'module.integratedAnalysis.desc': '多源数据融合分析',
    'module.settings.desc': '系统配置和参数设置',
    
    // 按钮
    'button.screenshot': '截图',
    'button.resetView': '重置视图',
    'button.help': '帮助',
    'button.play': '播放',
    'button.pause': '暂停',
    'button.stop': '停止',
    'button.reset': '重置',
    'button.export': '导出',
    'button.import': '导入',
    'button.save': '保存',
    'button.cancel': '取消',
    
    // 设置页面
    'settings.title': '系统设置',
    'settings.map': '地图设置',
    'settings.layers': '图层设置',
    'settings.animation': '动画设置',
    'settings.ui': '界面设置',
    
    // 地图设置
    'settings.map.basemap': '底图类型',
    'settings.map.opacity': '底图透明度',
    'settings.map.showLabels': '显示地名标注',
    'settings.map.showBoundaries': '显示行政边界',
    'settings.map.defaultView': '默认视图',
    'settings.map.zoomLevel': '缩放级别',
    'settings.map.centerLon': '中心经度',
    'settings.map.centerLat': '中心纬度',
    
    // 底图选项
    'basemap.satellite': '卫星影像',
    'basemap.hybrid': '混合地图',
    'basemap.streets': '街道地图',
    'basemap.topo': '地形图',
    'basemap.oceans': '海洋图',
    'basemap.gray': '灰度地图',
    
    // 图层设置
    'layer.glider': '波浪滑翔器',
    'layer.typhoon': '台风轨迹',
    'layer.waveField': 'SWAN波浪场',
    'layer.opacity': '透明度',
    'layer.trails': '轨迹显示',
    'layer.showTrails': '显示历史轨迹',
    'layer.trailLength': '轨迹长度',
    
    // 动画设置
    'animation.playbackSpeed': '默认播放速度',
    'animation.autoLoop': '自动循环播放',
    'animation.smoothTransition': '平滑过渡动画',
    'animation.pauseOnHover': '悬停时暂停',
    'animation.showProgress': '显示进度条',
    'animation.quality': '动画质量',
    'animation.quality.low': '低质量',
    'animation.quality.medium': '中等质量',
    'animation.quality.high': '高质量',
    
    // UI设置
    'ui.theme': '界面主题',
    'ui.language': '界面语言',
    'ui.showTooltips': '显示工具提示',
    'ui.compactMode': '紧凑模式',
    'theme.light': '浅色主题',
    'theme.dark': '深色主题',
    'theme.ocean': '海洋主题',
    
    // 分析工具
    'analysis.spatial': '空间相关性分析',
    'analysis.temporal': '时序对比分析',
    'analysis.validation': '波浪场验证分析',
    
    // 状态信息
    'status.systemStatus': '系统状态',
    'status.gliderDataPoints': '滑翔机数据点',
    'status.typhoonTrackPoints': '台风轨迹点',
    'status.waveFieldFrames': '波浪场帧数',
    
    // 提示信息
    'tip.settingsAutoSave': '设置会自动保存，刷新页面后仍然生效',
    'tip.animationControls': '动画控制已移至"仪表板"模块，请点击左侧"仪表板"进行动画控制',
    'tip.loading': '加载设置中...',
  },
  
  'zh-TW': {
    'system.title': '🌊 海洋GIS集成系統',
    'module.dashboard': '系統概覽',
    'module.waveGlider': '波浪滑翔器',
    'module.waveField': 'SWAN波浪場',
    'module.integratedAnalysis': '綜合分析',
    'module.settings': '系統設置',
    'module.dashboard.desc': '系統整體狀態和數據概覽',
    'module.waveGlider.desc': '颱風白鹿觀測數據分析',
    'module.waveField.desc': '颱風梅花波浪場動畫',
    'module.integratedAnalysis.desc': '多源數據融合分析',
    'module.settings.desc': '系統配置和參數設置',
    'button.screenshot': '截圖',
    'button.resetView': '重置視圖',
    'button.help': '幫助',
    'settings.title': '系統設置',
    'tip.settingsAutoSave': '設置會自動保存，刷新頁面後仍然生效',
  },
  
  'en-US': {
    'system.title': '🌊 Marine GIS Integrated System',
    'module.dashboard': 'Dashboard',
    'module.waveGlider': 'Wave Glider',
    'module.waveField': 'SWAN Wave Field',
    'module.integratedAnalysis': 'Integrated Analysis',
    'module.settings': 'System Settings',
    'module.dashboard.desc': 'System overview and data statistics',
    'module.waveGlider.desc': 'Typhoon Bailu observation data analysis',
    'module.waveField.desc': 'Typhoon Meihua wave field animation',
    'module.integratedAnalysis.desc': 'Multi-source data fusion analysis',
    'module.settings.desc': 'System configuration and parameters',
    'button.screenshot': 'Screenshot',
    'button.resetView': 'Reset View',
    'button.help': 'Help',
    'settings.title': 'System Settings',
    'tip.settingsAutoSave': 'Settings are auto-saved and persist after page refresh',
  }
};

export type TranslationKey = keyof typeof translations['zh-CN'];

export const getTranslation = (language: string, key: TranslationKey): string => {
  const lang = language as keyof typeof translations;
  const langTranslations = translations[lang];
  if (langTranslations && key in langTranslations) {
    return (langTranslations as any)[key];
  }
  return translations['zh-CN'][key] || key;
};
