// src/types/index.ts

// 通用数据点接口
export interface DataPoint {
  id: string | number;
  timestamp: Date;
  longitude: number;
  latitude: number;
}

// 波浪滑翔器数据
export interface GliderData extends DataPoint {
  date: string;
  time: string;
  expectedHeading: number;
  currentHeading: number;
  pitch: number;
  roll: number;
  voltage: number;
  rudderAngle: number;
  speed: number;
  effectiveSpeed: number;
  distance: number;
  airTemp: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  waterTemp: number;
  heading: number;
}

// 台风数据
export interface TyphoonData extends DataPoint {
  time: string; // 格式如: "05-Aug-2011__08-00-00"
  radius: number; // 风圈半径
  unixTimestamp: number; // Unix时间戳
  windRadius: number; // 为了向后兼容，保留这个字段
  intensity?: string;
  pressure?: number;
  maxWindSpeed?: number;
}

// 波浪场数据（与台风数据时间同步）
export interface WaveFieldData {
  timeString: string; // 格式如: "05-Aug-2011__08-00-00"
  layerName: string; // 如: "idw_masked_05-Aug-2011__08-00-00"
  index: number;
  timestamp: Date;
  unixTimestamp: number;
}

// 地图图层配置
export interface LayerConfig {
  id: string;
  visible: boolean;
  opacity: number;
  title: string;
}

// 动画状态
export interface AnimationState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  loop: boolean;
}

// 地图状态
export interface MapState {
  center: [number, number];
  zoom: number;
  basemap: string;
  ready: boolean;
}

// 系统模块
export interface SystemModule {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
}

// 应用状态
export interface AppState {
  activeModule: string;
  sidebarOpen: boolean;
  mapState: MapState;
  animationState: AnimationState;
  layers: Record<string, LayerConfig>;
  data: {
    glider: GliderData[];
    typhoon: TyphoonData[];
    waveField: WaveFieldData[];
  };
  systemStatus: string;
}

// 查询结果
export interface QueryResult {
  location: {
    longitude: number;
    latitude: number;
  };
  data: Record<string, any>;
  timestamp: string;
}

// 测量结果
export interface MeasureResult {
  startPoint: {
    longitude: number;
    latitude: number;
  };
  endPoint: {
    longitude: number;
    latitude: number;
  };
  distance: number;
  unit: string;
}

// 系统设置
export interface SystemSettings {
  map: {
    defaultBasemap: string;
    defaultZoom: number;
    defaultCenter: [number, number];
  };
  animation: {
    defaultSpeed: number;
    autoPlay: boolean;
    loop: boolean;
  };
  data: {
    autoRefresh: boolean;
    cacheTime: number;
  };
}