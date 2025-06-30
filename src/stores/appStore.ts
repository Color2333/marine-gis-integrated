// src/stores/appStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  AppState, 
  GliderData, 
  TyphoonData, 
  WaveFieldData,
  LayerConfig,
  AnimationState,
  MapState,
  SystemSettings 
} from '../types';

interface AppStore extends AppState {
  // Actions
  setActiveModule: (module: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setSystemStatus: (status: string) => void;
  
  // Map actions
  setMapReady: (ready: boolean) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setBasemap: (basemap: string) => void;
  
  // Animation actions
  setAnimationPlaying: (playing: boolean) => void;
  setCurrentFrame: (frame: number | ((prev: number) => number)) => void;
  setAnimationSpeed: (speed: number) => void;
  setAnimationLoop: (loop: boolean) => void;
  
  // Layer actions
  setLayerVisible: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  
  // Data actions
  setGliderData: (data: GliderData[]) => void;
  setTyphoonData: (data: TyphoonData[]) => void;
  setWaveFieldData: (data: WaveFieldData[]) => void;
  
  // Async actions
  loadGliderData: () => Promise<void>;
  loadTyphoonData: () => Promise<void>;
  loadWaveFieldData: () => Promise<void>;
  initializeSystem: () => Promise<void>;
}

// 默认配置
const defaultMapState: MapState = {
  center: [126.32, 28.24],
  zoom: 7,
  basemap: 'gray',
  ready: false,
};

const defaultAnimationState: AnimationState = {
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 0,
  speed: 500,
  loop: false,
};

const defaultLayers: Record<string, LayerConfig> = {
  gliderTrack: {
    id: 'gliderTrack',
    visible: true,
    opacity: 0.8,
    title: '滑翔器轨迹',
  },
  gliderPoints: {
    id: 'gliderPoints',
    visible: true,
    opacity: 1.0,
    title: '观测点',
  },
  waveField: {
    id: 'waveField',
    visible: true,
    opacity: 0.7,
    title: '波浪场',
  },
  typhoonTrack: {
    id: 'typhoonTrack',
    visible: true,
    opacity: 0.8,
    title: '台风轨迹',
  },
  typhoonCenter: {
    id: 'typhoonCenter',
    visible: true,
    opacity: 1.0,
    title: '台风中心',
  },
  typhoonInfluenceArea: {
    id: 'typhoonInfluenceArea',
    visible: true,
    opacity: 0.6,
    title: '台风影响区域',
  },
};

// 生成示例滑翔器数据
const generateGliderData = (): GliderData[] => {
  const data: GliderData[] = [];
  const baseTime = new Date('2019-08-05T09:00:00');
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 3 * 60 * 1000); // 每3分钟
    data.push({
      id: 135458 + i,
      timestamp,
      date: '2019-08-05',
      time: timestamp.toTimeString().substring(0, 8),
      longitude: 124.671684 - i * 0.0003,
      latitude: 19.0618 + i * 0.0002,
      expectedHeading: 333,
      currentHeading: 330 + (Math.random() - 0.5) * 40,
      pitch: -5 + (Math.random() - 0.5) * 10,
      roll: -2 + (Math.random() - 0.5) * 4,
      voltage: 16.5 + (Math.random() - 0.5) * 0.2,
      rudderAngle: (Math.random() - 0.5) * 40,
      speed: 0.3 + Math.random() * 0.3,
      effectiveSpeed: 0.1 + Math.random() * 0.2,
      distance: 1774000 + i * 10,
      airTemp: 28.0 + (Math.random() - 0.5) * 2,
      pressure: 1.002 + (Math.random() - 0.5) * 0.005,
      windSpeed: 4.0 + (Math.random() - 0.5) * 3,
      windDirection: (Math.random() * 360),
      waterTemp: 30.47 + (Math.random() - 0.5) * 0.5,
      heading: 330 + (Math.random() - 0.5) * 40,
    });
  }
  return data;
};

// 生成示例台风数据
const generateTyphoonData = (): TyphoonData[] => {
  const data: TyphoonData[] = [];
  const baseTime = new Date('2011-08-05T08:00:00');
  
  for (let i = 0; i < 86; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 60 * 60 * 1000); // 每小时
    const timeStr = formatTimeString(timestamp);
    const radius = 135 - i * 0.8;
    
    data.push({
      id: i + 1,
      timestamp,
      longitude: 127.624678 - i * 0.03,
      latitude: 25.1178031 + i * 0.12,
      time: timeStr, // 必需字段
      radius: radius, // 必需字段
      unixTimestamp: Math.floor(timestamp.getTime() / 1000), // 必需字段
      windRadius: radius, // 向后兼容字段
      intensity: i < 20 ? '热带风暴' : i < 50 ? '台风' : '强台风',
      pressure: 1000 - i * 2,
      maxWindSpeed: 20 + i * 0.5,
    });
  }
  return data;
};

// 生成波浪场时间序列（与台风数据时间同步）
const generateWaveFieldData = (): WaveFieldData[] => {
  const data: WaveFieldData[] = [];
  const baseTime = new Date('2011-08-05T08:00:00');
  
  for (let i = 0; i < 121; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
    const timeStr = formatTimeString(timestamp);
    data.push({
      timeString: timeStr,
      layerName: `idw_masked_${timeStr}`,
      index: i,
      timestamp,
      unixTimestamp: Math.floor(timestamp.getTime() / 1000),
    });
  }
  return data;
};

// 格式化时间字符串
const formatTimeString = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  return `${day}-${month}-${year}__${hour}-${minute}-${second}`;
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeModule: 'dashboard',
        sidebarOpen: true,
        mapState: defaultMapState,
        animationState: defaultAnimationState,
        layers: defaultLayers,
        data: {
          glider: [],
          typhoon: [],
          waveField: [],
        },
        systemStatus: '正在初始化...',

        // Basic actions
        setActiveModule: (module) => set({ activeModule: module }),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSystemStatus: (status) => set({ systemStatus: status }),

        // Map actions
        setMapReady: (ready) => 
          set((state) => ({
            mapState: { ...state.mapState, ready }
          })),
        
        setMapCenter: (center) =>
          set((state) => ({
            mapState: { ...state.mapState, center }
          })),
        
        setMapZoom: (zoom) =>
          set((state) => ({
            mapState: { ...state.mapState, zoom }
          })),
        
        setBasemap: (basemap) =>
          set((state) => ({
            mapState: { ...state.mapState, basemap }
          })),

        // Animation actions
        setAnimationPlaying: (playing) =>
          set((state) => ({
            animationState: { ...state.animationState, isPlaying: playing }
          })),
        
        setCurrentFrame: (frame) =>
          set((state) => {
            const newFrame = typeof frame === 'function' ? frame(state.animationState.currentFrame) : frame;
            return {
              animationState: { ...state.animationState, currentFrame: newFrame }
            };
          }),
        
        setAnimationSpeed: (speed) =>
          set((state) => ({
            animationState: { ...state.animationState, speed }
          })),
        
        setAnimationLoop: (loop) =>
          set((state) => ({
            animationState: { ...state.animationState, loop }
          })),

        // Layer actions
        setLayerVisible: (layerId, visible) =>
          set((state) => ({
            layers: {
              ...state.layers,
              [layerId]: { ...state.layers[layerId], visible }
            }
          })),
        
        setLayerOpacity: (layerId, opacity) =>
          set((state) => ({
            layers: {
              ...state.layers,
              [layerId]: { ...state.layers[layerId], opacity }
            }
          })),

        // Data actions
        setGliderData: (data) =>
          set((state) => ({
            data: { ...state.data, glider: data }
          })),
        
        setTyphoonData: (data) =>
          set((state) => ({
            data: { ...state.data, typhoon: data }
          })),
        
        setWaveFieldData: (data) =>
          set((state) => ({
            data: { ...state.data, waveField: data },
            animationState: { 
              ...state.animationState, 
              totalFrames: data.length 
            }
          })),

        // Async actions
        loadGliderData: async () => {
          try {
            set({ systemStatus: '正在加载滑翔器数据...' });
            
            // 尝试从 public 目录加载 JSONL 文件
            const response = await fetch('/滑翔机观测数据.jsonl');
            
            if (!response.ok) {
              throw new Error('无法加载滑翔机数据文件');
            }
            
            const jsonlText = await response.text();
            const lines = jsonlText.trim().split('\n');
            
            const rawData = lines.map(line => {
              try {
                return JSON.parse(line);
              } catch (error) {
                // console.warn('解析行数据失败:', line, error);
                return null;
              }
            }).filter(Boolean);
            
            // 转换数据格式以匹配 GliderData 接口
            const data: GliderData[] = rawData.map((item, index) => {
              // 解析日期和时间
              const timestamp = new Date(`${item.日期} ${item.时间}`);
              
              return {
                id: item.ID,
                timestamp,
                date: item.日期,
                time: item.时间,
                longitude: item.经度,
                latitude: item.纬度,
                expectedHeading: item.期望航向,
                currentHeading: item.当前航向,
                pitch: item.当前俯仰,
                roll: item.当前横滚,
                voltage: item.电压,
                rudderAngle: item.舵角,
                speed: item.速度,
                effectiveSpeed: item.有效速度,
                distance: item.距离,
                airTemp: item.气温,
                pressure: item.气压,
                windSpeed: item.风速,
                windDirection: item.风向,
                waterTemp: item.表层水温,
                heading: item.当前航向 // 使用当前航向作为heading
              };
            });
            
            get().setGliderData(data);
            set({ systemStatus: `滑翔器数据加载完成 (${data.length} 个观测点)` });
          } catch (error) {
            // console.error('加载滑翔器数据失败:', error);
            set({ systemStatus: '滑翔器数据加载失败，使用示例数据' });
            
            // 如果加载失败，使用示例数据作为后备
            const data = generateGliderData();
            get().setGliderData(data);
          }
        },

        loadTyphoonData: async () => {
          try {
            set({ systemStatus: '正在加载台风数据...' });
            
            // 尝试从 public 目录加载台风数据
            const response = await fetch('/梅花台风轨迹数据.jsonl');
            
            if (!response.ok) {
              throw new Error('无法加载台风数据文件');
            }
            
            const jsonlText = await response.text();
            const lines = jsonlText.trim().split('\n');
            
            const rawData = lines.map(line => {
              try {
                return JSON.parse(line);
              } catch (error) {
                // console.warn('解析台风数据行失败:', line, error);
                return null;
              }
            }).filter(Boolean);
            
            // 转换数据格式以匹配 TyphoonData 接口
            const data: TyphoonData[] = rawData.map((item) => {
              const timestamp = new Date(item.timestamp);
              
              return {
                id: item.id,
                timestamp,
                longitude: item.longitude,
                latitude: item.latitude,
                time: item.time,
                radius: item.radius,
                windRadius: item.radius, // 向后兼容
                unixTimestamp: item.unix_timestamp,
                intensity: 'unknown', // 可以根据半径或其他数据计算强度
              };
            });
            
            get().setTyphoonData(data);
            set({ systemStatus: `台风数据加载完成 (${data.length} 个轨迹点)` });
          } catch (error) {
            // console.error('加载台风数据失败:', error);
            set({ systemStatus: '台风数据加载失败，使用示例数据' });
            
            // 如果加载失败，使用示例数据作为后备
            const data = generateTyphoonData();
            get().setTyphoonData(data);
          }
        },

        loadWaveFieldData: async () => {
          try {
            set({ systemStatus: '正在加载波浪场数据...' });
            await new Promise(resolve => setTimeout(resolve, 600));
            const data = generateWaveFieldData();
            get().setWaveFieldData(data);
            set({ systemStatus: `波浪场数据加载完成 (${data.length} 个时间帧)` });
          } catch (error) {
            set({ systemStatus: '波浪场数据加载失败' });
            // console.error('Failed to load wave field data:', error);
          }
        },

        initializeSystem: async () => {
          try {
            set({ systemStatus: '正在初始化系统...' });
            
            // 并行加载所有数据
            await Promise.all([
              get().loadGliderData(),
              get().loadTyphoonData(),
              get().loadWaveFieldData(),
            ]);
            
            // 验证图层配置
            const { layers } = get();
            // console.log("🔍 系统初始化完成，验证图层配置:");
            // console.log("当前图层配置:", layers);
            
            const requiredLayers = ['gliderTrack', 'gliderPoints', 'waveField', 'typhoonTrack', 'typhoonCenter', 'typhoonInfluenceArea'];
            const missingLayers = requiredLayers.filter(layerId => !layers[layerId]);
            
            if (missingLayers.length > 0) {
              // console.warn("❌ 缺失图层配置:", missingLayers);
              // 补充缺失的图层配置
              const updatedLayers = { ...layers };
              missingLayers.forEach(layerId => {
                if (layerId === 'typhoonInfluenceArea') {
                  updatedLayers[layerId] = {
                    id: 'typhoonInfluenceArea',
                    visible: true,
                    opacity: 0.6,
                    title: '台风影响区域',
                  };
                  // console.log("✅ 补充台风影响区域图层配置");
                }
                // 补充其他缺失图层的配置...
              });
              
              set({ layers: updatedLayers });
              // console.log("✅ 图层配置修复完成:", updatedLayers);
            } else {
              // console.log("✅ 所有必需图层配置都存在");
            }
            
            set({ systemStatus: '系统初始化完成' });
          } catch (error) {
            set({ systemStatus: '系统初始化失败' });
            // console.error('Failed to initialize system:', error);
          }
        },
      }),
      {
        name: 'marine-gis-storage',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          mapState: {
            basemap: state.mapState.basemap,
            center: state.mapState.center,
            zoom: state.mapState.zoom,
          },
          layers: state.layers,
        }),
      }
    ),
    {
      name: 'marine-gis-store',
    }
  )
);