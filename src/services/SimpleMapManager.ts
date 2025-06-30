// src/services/SimpleMapManager.ts
import type { GliderData, TyphoonData } from '../types';
import type { TimelineFrame } from './TimelineService';

export class SimpleMapManager {
  private map: any = null;
  private view: any = null;
  private modules: any = {};
  private layers: any = {};
  private container: HTMLDivElement | null = null;
  private isInitialized = false;
  private currentWaveFieldLayer: any = null;
  private waveFieldBaseUrl = 'https://localhost:6443';

  // 动画状态
  private currentFrame: TimelineFrame | null = null;
  private animationCallbacks: Array<(frame: TimelineFrame) => void> = [];
  
  // 波场图层防抖更新
  private waveFieldUpdateTimeout: any = null;
  private lastWaveFieldUpdate = 0;
  
  // 波场图层状态缓存
  private currentVisibleLayerIndex = -1;

  async initialize(container: HTMLDivElement): Promise<void> {
    try {
      this.container = container;
      
      // 等待ArcGIS API加载完成
      if (!window.require) {
        throw new Error('ArcGIS API未加载');
      }

      // 加载模块
      await this.loadModules();
      
      // 尝试进行身份验证（不阻止初始化）
      try {
        await this.authenticateArcGISServer();
      } catch (error) {
        // console.warn('ArcGIS Server 身份验证失败，将继续初始化地图:', error);
      }
      
      // 创建地图
      this.createMap();
      
      // 创建视图
      this.createView();
      
      // 创建图层
      this.createLayers();
      
      // 等待视图准备就绪
      await this.view.when();
      
      this.isInitialized = true;
      // // console.log('地图初始化成功');
      
      // 移除自动初始化波场图层，改为手动或按需创建
      // // console.log('地图初始化完成，波场图层将在动画开始时按需创建');
      
    } catch (error) {
      // // console.error('地图初始化失败:', error);
      throw error;
    }
  }

  private async loadModules(): Promise<void> {
    return new Promise((resolve, reject) => {
      window.require([
        "esri/Map",
        "esri/views/MapView", 
        "esri/layers/GraphicsLayer",
        "esri/layers/MapImageLayer",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/geometry/Circle",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/PopupTemplate",
        "esri/widgets/ScaleBar",
        "esri/widgets/Locate",
        "esri/widgets/Home",
        "esri/widgets/Zoom",
        "esri/identity/IdentityManager",
        "esri/identity/ServerInfo"
      ], (
        Map: any,
        MapView: any,
        GraphicsLayer: any,
        MapImageLayer: any,
        Graphic: any,
        Point: any,
        Polyline: any,
        Circle: any,
        SimpleMarkerSymbol: any,
        SimpleLineSymbol: any,
        SimpleFillSymbol: any,
        PopupTemplate: any,
        ScaleBar: any,
        Locate: any,
        Home: any,
        Zoom: any,
        IdentityManager: any,
        ServerInfo: any
      ) => {
        this.modules = {
          Map,
          MapView,
          GraphicsLayer,
          MapImageLayer,
          Graphic,
          Point,
          Polyline,
          Circle,
          SimpleMarkerSymbol,
          SimpleLineSymbol,
          SimpleFillSymbol,
          PopupTemplate,
          ScaleBar,
          Locate,
          Home,
          Zoom,
          IdentityManager,
          ServerInfo
        };
        resolve();
      }, (error: any) => {
        reject(error);
      });
    });
  }

  private createMap(): void {
    const { Map } = this.modules;
    
    this.map = new Map({
      basemap: "gray-vector" // 使用稳定的底图
    });
  }

  private createView(): void {
    const { MapView, ScaleBar, Locate, Home, Zoom } = this.modules;

    this.view = new MapView({
      container: this.container,
      map: this.map,
      center: [126.32, 28.24], // 优化后的默认视图中心
      zoom: 7,
      constraints: {
        minZoom: 3,
        maxZoom: 18
      }
    });

    // 添加工具
    const scaleBar = new ScaleBar({
      view: this.view,
      unit: 'metric'
    });
    this.view.ui.add(scaleBar, 'bottom-left');

    const locateBtn = new Locate({
      view: this.view
    });
    this.view.ui.add(locateBtn, 'top-left');

    const homeWidget = new Home({
      view: this.view
    });
    this.view.ui.add(homeWidget, 'top-left');

    const zoomWidget = new Zoom({
      view: this.view
    });
    this.view.ui.add(zoomWidget, 'top-left');

    // 设置事件监听
    this.setupEventHandlers();
  }

  private createLayers(): void {
    const { GraphicsLayer } = this.modules;

    // 创建图层
    this.layers.gliderTrack = new GraphicsLayer({
      id: 'glider-track',
      title: '滑翔器轨迹'
    });

    this.layers.gliderPoints = new GraphicsLayer({
      id: 'glider-points', 
      title: '观测点'
    });

    this.layers.gliderCurrent = new GraphicsLayer({
      id: 'glider-current',
      title: '当前位置'
    });

    this.layers.typhoonTrack = new GraphicsLayer({
      id: 'typhoon-track',
      title: '台风轨迹'
    });

    this.layers.typhoonCenter = new GraphicsLayer({
      id: 'typhoon-center',
      title: '台风中心'
    });

    this.layers.typhoonInfluenceArea = new GraphicsLayer({
      id: 'typhoon-influence-area',
      title: '台风影响区域'
    });

    // AI 预测相关图层
    this.layers.aiSelectedPoints = new GraphicsLayer({
      id: 'ai-selected-points',
      title: 'AI预测选取点'
    });

    this.layers.aiPredictedPoints = new GraphicsLayer({
      id: 'ai-predicted-points', 
      title: 'AI预测结果点'
    });

    this.layers.aiPredictedTrack = new GraphicsLayer({
      id: 'ai-predicted-track',
      title: 'AI预测轨迹'
    });

    // 添加到地图
    this.map.addMany([
      this.layers.gliderTrack,
      this.layers.gliderPoints,
      this.layers.gliderCurrent,
      this.layers.typhoonTrack,
      this.layers.typhoonCenter,
      this.layers.typhoonInfluenceArea,
      this.layers.aiSelectedPoints,
      this.layers.aiPredictedPoints,
      this.layers.aiPredictedTrack
    ]);
  }

  private setupEventHandlers(): void {
    if (!this.view || !this.container) return;

    // 地图点击
    this.view.on('click', async (event: any) => {
      // 发送通用的地图点击事件
      this.container?.dispatchEvent(new CustomEvent('mapClick', {
        detail: {
          mapPoint: event.mapPoint,
          screenPoint: event.screenPoint
        }
      }));

      // 检查是否点击了波浪场图层
      if (this.layers.waveField && this.view) {
        try {
          const response = await this.view.hitTest(event);
          const waveFieldHit = response.results.find((result: any) => 
            result.layer === this.layers.waveField
          );

          if (waveFieldHit) {
            // 点击了波浪场图层，显示详细信息
            await this.showWaveFieldPopup(event.mapPoint, waveFieldHit);
          }
        } catch (error) {
          // console.warn('波浪场点击检测失败:', error);
        }
      }
    });

    // 鼠标移动
    this.view.on('pointer-move', (event: any) => {
      const point = this.view.toMap({ x: event.x, y: event.y });
      this.container?.dispatchEvent(new CustomEvent('mapPointerMove', {
        detail: {
          mapPoint: point,
          screenPoint: { x: event.x, y: event.y }
        }
      }));
    });
  }

  addGliderData(data: GliderData[]): void {
    if (!this.isInitialized || data.length === 0) return;

    const { Graphic, Point, Polyline, SimpleMarkerSymbol, SimpleLineSymbol, PopupTemplate } = this.modules;

    // 清空现有数据
    this.layers.gliderTrack.removeAll();
    this.layers.gliderPoints.removeAll();

    // 创建轨迹线
    const trackCoords = data.map(point => [point.longitude, point.latitude]);
    const trackPolyline = new Polyline({
      paths: [trackCoords],
      spatialReference: { wkid: 4326 }
    });

    const trackSymbol = new SimpleLineSymbol({
      color: [52, 152, 219, 0.8],
      width: 3,
      style: 'solid'
    });

    const trackGraphic = new Graphic({
      geometry: trackPolyline,
      symbol: trackSymbol
    });

    this.layers.gliderTrack.add(trackGraphic);

    // 添加观测点
    data.forEach((point, index) => {
      const pointGeom = new Point({
        longitude: point.longitude,
        latitude: point.latitude,
        spatialReference: { wkid: 4326 }
      });

      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: index === 0 ? [243, 156, 18, 0.9] : [52, 152, 219, 0.8],
        size: index === 0 ? 10 : 6,
        outline: {
          color: [255, 255, 255],
          width: 1
        }
      });

      const popupTemplate = new PopupTemplate({
        title: `观测点 #${point.id}`,
        content: `
          <div>
            <p><strong>时间:</strong> ${point.date} ${point.time}</p>
            <p><strong>位置:</strong> ${point.longitude.toFixed(6)}°E, ${point.latitude.toFixed(6)}°N</p>
            <p><strong>气温:</strong> ${point.airTemp.toFixed(1)}°C</p>
            <p><strong>风速:</strong> ${point.windSpeed.toFixed(1)} m/s</p>
            <p><strong>水温:</strong> ${point.waterTemp.toFixed(1)}°C</p>
          </div>
        `
      });

      const graphic = new Graphic({
        geometry: pointGeom,
        symbol: symbol,
        attributes: point,
        popupTemplate: popupTemplate
      });

      this.layers.gliderPoints.add(graphic);
    });

    // 缩放到数据范围
    this.zoomToData(data);
  }

  addTyphoonData(data: TyphoonData[]): void {
    if (!this.isInitialized || data.length === 0) return;

    const { Graphic, Polyline, SimpleLineSymbol } = this.modules;

    // 清空现有台风数据
    this.layers.typhoonTrack.removeAll();

    // 创建台风轨迹
    const trackCoords = data.map(point => [point.longitude, point.latitude]);
    const trackPolyline = new Polyline({
      paths: [trackCoords],
      spatialReference: { wkid: 4326 }
    });

    const trackSymbol = new SimpleLineSymbol({
      color: [231, 76, 60, 0.8],
      width: 4,
      style: 'solid'
    });

    const trackGraphic = new Graphic({
      geometry: trackPolyline,
      symbol: trackSymbol
    });

    this.layers.typhoonTrack.add(trackGraphic);
  }

  updateCurrentPosition(data: GliderData | TyphoonData, type: 'glider' | 'typhoon'): void {
    if (!this.isInitialized) return;

    const { Graphic, Point, Circle, SimpleMarkerSymbol, SimpleFillSymbol } = this.modules;

    if (type === 'glider') {
      this.layers.gliderCurrent.removeAll();

      const point = new Point({
        longitude: data.longitude,
        latitude: data.latitude,
        spatialReference: { wkid: 4326 }
      });

      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: [39, 174, 96, 0.9],
        size: 12,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      });

      const graphic = new Graphic({
        geometry: point,
        symbol: symbol
      });

      this.layers.gliderCurrent.add(graphic);

      // 平滑移动到当前位置
      this.view.goTo({
        center: [data.longitude, data.latitude],
        zoom: this.view.zoom
      }, { duration: 1000 }).catch((error: any) => {
        // console.warn('移动到位置失败:', error);
      });

    } else if (type === 'typhoon') {
      this.layers.typhoonCenter.removeAll();
      this.layers.typhoonInfluenceArea.removeAll();

      const typhoonData = data as TyphoonData;
      const point = new Point({
        longitude: typhoonData.longitude,
        latitude: typhoonData.latitude,
        spatialReference: { wkid: 4326 }
      });

      // 台风中心点
      const centerSymbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: [231, 76, 60, 0.9],
        size: 14,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      });

      const centerGraphic = new Graphic({
        geometry: point,
        symbol: centerSymbol
      });

      this.layers.typhoonCenter.add(centerGraphic);

      // 台风影响区域（使用radius字段）
      const influenceRadius = typhoonData.radius || typhoonData.windRadius || 100; // 默认100公里
      if (influenceRadius > 0) {
        const influenceCircle = new Circle({
          center: point,
          radius: influenceRadius,
          radiusUnit: 'kilometers'
        });

        const influenceSymbol = new SimpleFillSymbol({
          style: 'solid',
          color: [255, 69, 0, 0.15], // 橙红色半透明填充，提高可见性
          outline: {
            color: [255, 69, 0, 0.8], // 橙红色边界，更加明显
            width: 3, // 增加边界宽度
            style: 'solid'
          }
        });

        const influenceGraphic = new Graphic({
          geometry: influenceCircle,
          symbol: influenceSymbol,
          attributes: {
            type: 'typhoon-influence',
            radius: influenceRadius,
            typhoonId: typhoonData.id
          }
        });

        this.layers.typhoonInfluenceArea.add(influenceGraphic);
      }

      // 风圈（如果有windRadius，显示更精确的风圈）
      if (typhoonData.windRadius && typhoonData.windRadius !== influenceRadius) {
        const windCircle = new Circle({
          center: point,
          radius: typhoonData.windRadius,
          radiusUnit: 'kilometers'
        });

        const circleSymbol = new SimpleFillSymbol({
          style: 'none',
          outline: {
            color: [255, 165, 0, 0.8],
            width: 2,
            style: 'dash'
          }
        });

        const circleGraphic = new Graphic({
          geometry: windCircle,
          symbol: circleSymbol,
          attributes: {
            type: 'wind-circle',
            radius: typhoonData.windRadius
          }
        });

        this.layers.typhoonCenter.add(circleGraphic);
      }
    }
  }

  // 创建波浪场图层
  async createWaveLayer(serverUrl: string = 'https://localhost:6443/arcgis/rest/services/wave_server/MapServer', opacity: number = 0.7): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('地图未初始化');
    }

    const { MapImageLayer } = this.modules;

    try {
      // console.log(`正在创建波浪场图层: ${serverUrl}`);
      
      // 验证服务可用性
      const serviceResponse = await fetch(`${serverUrl}?f=json`);
      
      if (!serviceResponse.ok) {
        throw new Error(`ArcGIS Server 服务不可用: ${serviceResponse.status} ${serviceResponse.statusText}. 请检查服务器是否运行以及CORS配置。`);
      }
      
      const serviceInfo = await serviceResponse.json();
      // console.log('波浪场服务信息:', serviceInfo);

      if (serviceInfo.error) {
        throw new Error(`服务错误: ${serviceInfo.error.message || serviceInfo.error.details}`);
      }

      // 打印服务的详细信息以便调试
      // console.log('服务图层信息:', serviceInfo.layers);
      // console.log('服务支持的操作:', serviceInfo.supportedImageFormatTypes);

      // 配置子图层 - 默认全部隐藏，按需显示
      const sublayersConfig = [];
      if (serviceInfo?.layers?.length > 1) {
        for (let layer of serviceInfo.layers) {
          sublayersConfig.push({
            id: layer.id,
            visible: false, // 默认隐藏，动画时按需显示
            opacity: opacity,
          });
        }
        // console.log(`配置了 ${sublayersConfig.length} 个子图层，默认全部隐藏`);
      } else {
        sublayersConfig.push({
          id: 0,
          visible: false, // 默认隐藏
          opacity: opacity,
        });
        // console.log('配置了单个子图层，默认隐藏');
      }

      // 创建 MapImageLayer
      this.layers.waveField = new MapImageLayer({
        url: serverUrl,
        sublayers: sublayersConfig,
        opacity: opacity,
        title: 'SWAN波浪场'
      });

      // 监听图层加载事件
      this.layers.waveField.when(() => {
        // console.log('波浪场图层加载成功');
        
        // 重置图层索引缓存
        this.currentVisibleLayerIndex = -1;
        
        // 图层加载成功后，显示第一个子图层作为预览
        if (this.layers.waveField.sublayers && this.layers.waveField.sublayers.length > 0) {
          // 显示第一个子图层，让用户知道图层已经可用
          this.layers.waveField.sublayers.items[0].visible = true;
          this.currentVisibleLayerIndex = 0; // 记录当前可见图层
          // console.log('显示第一个子图层作为预览');
        }
        
        // 自动缩放到波浪场范围
        setTimeout(() => {
          this.zoomToWaveFieldExtent();
        }, 1000);
      }).catch((error: any) => {
        // console.error('波浪场图层加载失败:', error);
        throw error;
      });

      // 添加到地图
      this.map.add(this.layers.waveField);
      // console.log('波浪场图层创建并添加到地图成功');
      
    } catch (error) {
      // console.error('波浪场图层创建失败:', error);
      
      // 如果是网络或服务器错误，给出更清晰的错误信息
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('无法连接到 ArcGIS Server。请检查：\n1. 服务器是否正在运行\n2. URL是否正确\n3. 网络连接是否正常\n4. 证书是否有效（HTTPS）');
      }
      
      throw error;
    }
  }

  // 更新波浪场图层的时间帧
  updateWaveLayerTime(timeString: string): void {
    if (!this.layers.waveField || !this.isInitialized) return;

    try {
      // 检查是否是真实的 MapImageLayer
      if (this.layers.waveField.type === 'map-image') {
        const sublayers = this.layers.waveField.sublayers;
        if (sublayers && sublayers.length > 0) {
          // 首先隐藏所有子图层
          sublayers.forEach((sublayer: any) => {
            sublayer.visible = false;
          });

          // 根据时间字符串计算子图层索引
          // 波浪场数据从 2011-08-05T08:00:00 开始，每小时一帧
          const layerIndex = this.calculateLayerIndexFromTimeString(timeString);
          
          if (layerIndex >= 0 && layerIndex < sublayers.length) {
            sublayers.items[layerIndex].visible = true;
            // 减少日志输出，只在必要时显示
            if (window.location.search.includes('debug')) {
              // console.log(`显示子图层 ${layerIndex} (时间: ${timeString})`);
            }
          } else {
            // 如果索引超出范围，显示第一个图层
            sublayers.items[0].visible = true;
            // console.warn(`时间索引 ${layerIndex} 超出范围 [0, ${sublayers.length-1}]，显示第一个图层`);
          }
        }
      } else {
        // console.warn('波浪场图层不是有效的 MapImageLayer');
      }
    } catch (error) {
      // console.error('更新波浪场时间失败:', error);
    }
  }

  // 快速更新波浪场图层的时间帧 - 超快响应版本
  updateWaveLayerTimeFast(timeString: string): void {
    if (!this.layers.waveField || !this.isInitialized) return;

    try {
      // 检查是否是真实的 MapImageLayer
      if (this.layers.waveField.type === 'map-image') {
        const sublayers = this.layers.waveField.sublayers;
        if (sublayers && sublayers.length > 0) {
          // 根据时间字符串计算子图层索引
          const layerIndex = this.calculateLayerIndexFromTimeString(timeString);
          
          // 缓存当前可见图层索引，避免重复操作
          if (this.currentVisibleLayerIndex === layerIndex) {
            return; // 已经是正确的图层，无需更新
          }
          
          // 先隐藏当前可见图层（如果存在）
          if (this.currentVisibleLayerIndex >= 0 && this.currentVisibleLayerIndex < sublayers.length) {
            sublayers.getItemAt(this.currentVisibleLayerIndex).visible = false;
          }
          
          // 显示新图层
          if (layerIndex >= 0 && layerIndex < sublayers.length) {
            sublayers.getItemAt(layerIndex).visible = true;
            this.currentVisibleLayerIndex = layerIndex;
          }
        }
      }
    } catch (error) {
      // console.error('快速更新波浪场时间失败:', error);
    }
  }

  /**
   * 根据时间字符串计算对应的子图层索引
   * @param timeString 格式: "05-Aug-2011__08-00-00"
   * @returns 图层索引 (0-120)
   */
  private calculateLayerIndexFromTimeString(timeString: string): number {
    try {
      // 解析时间字符串
      const timeMatch = timeString.match(/(\d{2})-(\w{3})-(\d{4})__(\d{2})-(\d{2})-(\d{2})/);
      if (!timeMatch) {
        // console.warn('无法解析时间字符串:', timeString);
        return 0;
      }

      const [, day, month, year, hour, minute, second] = timeMatch;
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const currentTime = new Date(
        parseInt(year), 
        monthMap[month], 
        parseInt(day), 
        parseInt(hour), 
        parseInt(minute), 
        parseInt(second)
      );
      
      // 波浪场数据开始时间: 2011-08-05T08:00:00
      const startTime = new Date(2011, 7, 5, 8, 0, 0); // 月份是0索引
      
      // 计算小时差
      const hoursDiff = Math.round((currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      
      // console.log(`时间解析: ${currentTime.toISOString()}, 小时差: ${hoursDiff}`);
      
      return Math.max(0, hoursDiff);
    } catch (error) {
      // console.error('计算图层索引时出错:', error);
      return 0;
    }
  }

  // 设置波浪场图层可见性
  setWaveLayerVisible(visible: boolean): void {
    if (!this.layers.waveField) return;

    this.layers.waveField.visible = visible;
  }

  // 设置波浪场图层透明度
  setWaveLayerOpacity(opacity: number): void {
    if (!this.layers.waveField) return;

    this.layers.waveField.opacity = opacity;
  }

  changeBasemap(basemapId: string): void {
    if (!this.map) return;

    try {
      const basemapMap: Record<string, string> = {
        'oceans': 'gray-vector',
        'satellite': 'satellite',
        'topo': 'topo-vector',
        'streets': 'streets-vector',
        'gray': 'gray-vector'
      };

      const targetBasemap = basemapMap[basemapId] || 'gray-vector';
      this.map.basemap = targetBasemap;
      
    } catch (error) {
      // console.warn('切换底图失败:', error);
    }
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    // 处理图层组映射
    const layerMap: { [key: string]: string[] } = {
      'gliderTrack': ['gliderTrack'],
      'gliderPoints': ['gliderPoints', 'gliderCurrent'],
      'typhoonTrack': ['typhoonTrack'],
      'typhoonCenter': ['typhoonCenter'],
      'typhoonInfluenceArea': ['typhoonInfluenceArea'],
      'waveField': ['waveField'],
      // 组合图层映射
      'glider': ['gliderTrack', 'gliderPoints', 'gliderCurrent'],
      'typhoon': ['typhoonTrack', 'typhoonCenter', 'typhoonInfluenceArea']
    };

    const targetLayers = layerMap[layerId] || [layerId];
    
    targetLayers.forEach(targetLayerId => {
      const layer = this.layers[targetLayerId];
      if (layer) {
        layer.visible = visible;
        // console.log(`🗂️ 图层 ${targetLayerId} 可见性设置为: ${visible}`);
      }
    });
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    // 处理图层组映射
    const layerMap: { [key: string]: string[] } = {
      'gliderTrack': ['gliderTrack'],
      'gliderPoints': ['gliderPoints', 'gliderCurrent'],
      'typhoonTrack': ['typhoonTrack'],
      'typhoonCenter': ['typhoonCenter'],
      'typhoonInfluenceArea': ['typhoonInfluenceArea'],
      'waveField': ['waveField'],
      // 组合图层映射
      'glider': ['gliderTrack', 'gliderPoints', 'gliderCurrent'],
      'typhoon': ['typhoonTrack', 'typhoonCenter', 'typhoonInfluenceArea']
    };

    const targetLayers = layerMap[layerId] || [layerId];
    
    targetLayers.forEach(targetLayerId => {
      const layer = this.layers[targetLayerId];
      if (layer) {
        layer.opacity = opacity;
        // console.log(`🗂️ 图层 ${targetLayerId} 透明度设置为: ${opacity}`);
      }
    });
  }

  setView(options: { center: [number, number]; zoom: number }): void {
    if (!this.view) return;

    try {
      this.view.goTo({
        center: options.center,
        zoom: options.zoom
      });
    } catch (error) {
      // console.warn('设置视图失败:', error);
    }
  }

  private zoomToData(data: Array<{ longitude: number; latitude: number }>): void {
    if (!this.view || data.length === 0) return;

    try {
      const longitudes = data.map(d => d.longitude);
      const latitudes = data.map(d => d.latitude);

      const extent = {
        xmin: Math.min(...longitudes) - 0.1,
        ymin: Math.min(...latitudes) - 0.1,
        xmax: Math.max(...longitudes) + 0.1,
        ymax: Math.max(...latitudes) + 0.1,
        spatialReference: { wkid: 4326 }
      };

      setTimeout(() => {
        if (this.view && this.view.ready) {
          this.view.goTo(extent, { duration: 2000 }).catch((error: any) => {
            // console.warn('缩放到数据范围失败:', error);
          });
        }
      }, 1000);
    } catch (error) {
      // console.warn('计算数据范围失败:', error);
    }
  }

  async takeScreenshot(): Promise<string> {
    if (!this.view) throw new Error('地图视图未初始化');

    try {
      const screenshot = await this.view.takeScreenshot();
      return screenshot.dataUrl;
    } catch (error) {
      // console.error('截图失败:', error);
      throw error;
    }
  }

  destroy(): void {
    try {
      // 先标记为未初始化，防止其他方法继续执行
      this.isInitialized = false;
      
      // 清理图层
      Object.values(this.layers).forEach(layer => {
        try {
          if (layer && typeof (layer as any).destroy === 'function') {
            (layer as any).destroy();
          }
        } catch (error) {
          // console.warn('销毁图层时出错:', error);
        }
      });
      
      // 清理视图
      if (this.view) {
        try {
          // 先移除容器引用，避免DOM操作冲突
          if (this.view.container) {
            this.view.container = null;
          }
          this.view.destroy();
        } catch (error) {
          // console.warn('销毁视图时出错:', error);
        }
        this.view = null;
      }
      
      // 清理引用
      this.map = null;
      this.modules = {};
      this.layers = {};
    } catch (error) {
      // console.warn('清理地图资源时出错:', error);
    }
  }

  get mapView() {
    return this.view;
  }

  get mapInstance() {
    return this.map;
  }

  // 获取图层状态 - 调试用
  getLayerStatus(): any {
    const status: any = {};
    Object.keys(this.layers).forEach(layerId => {
      const layer = this.layers[layerId];
      if (layer) {
        status[layerId] = {
          visible: layer.visible,
          opacity: layer.opacity,
          graphics: layer.graphics ? layer.graphics.length : 0
        };
      }
    });
    return status;
  }

  // 时间轴动画方法
  
  /**
   * 更新到指定时间帧 - 优化版本，台风快速更新，波场防抖更新
   */
  updateToFrame(frame: TimelineFrame): void {
    if (!this.isInitialized) return;

    this.currentFrame = frame;

    // 立即更新台风位置（快速响应）
    if (frame.typhoon) {
      this.updateTyphoonPosition(frame.typhoon);
    }

    // 立即更新滑翔器位置（快速响应）
    this.updateGliderPositions(frame.gliderPoints);

    // 波场图层使用防抖更新，避免频繁切换
    this.updateWaveFieldLayerDebounced(frame.waveField);

    // 触发动画回调
    this.animationCallbacks.forEach(callback => {
      try {
        callback(frame);
      } catch (error) {
        // console.warn('动画回调执行失败:', error);
      }
    });
  }

  /**
   * 立即更新到指定时间帧 - 无防抖，确保动画跟手
   */
  updateToFrameInstant(frame: TimelineFrame): void {
    if (!this.isInitialized) return;

    this.currentFrame = frame;

    // 立即更新台风位置
    if (frame.typhoon) {
      this.updateTyphoonPosition(frame.typhoon);
    }

    // 立即更新滑翔器位置
    this.updateGliderPositions(frame.gliderPoints);

    // 立即更新波场图层，无防抖延迟
    this.updateWaveFieldLayer(frame.waveField);

    // 触发动画回调
    this.animationCallbacks.forEach(callback => {
      try {
        callback(frame);
      } catch (error) {
        // console.warn('动画回调执行失败:', error);
      }
    });
  }

  /**
   * 防抖版本的波场图层更新
   */
  private updateWaveFieldLayerDebounced(waveFieldData?: any): void {
    const now = performance.now();
    
    // 如果距离上次更新时间小于100ms，使用防抖
    if (now - this.lastWaveFieldUpdate < 100) {
      if (this.waveFieldUpdateTimeout) {
        clearTimeout(this.waveFieldUpdateTimeout);
      }
      
      this.waveFieldUpdateTimeout = setTimeout(() => {
        this.updateWaveFieldLayer(waveFieldData);
        this.lastWaveFieldUpdate = performance.now();
      }, 50); // 50ms防抖
    } else {
      // 超过100ms，立即更新
      this.updateWaveFieldLayer(waveFieldData);
      this.lastWaveFieldUpdate = now;
    }
  }

  /**
   * 添加动画回调
   */
  onAnimationUpdate(callback: (frame: TimelineFrame) => void): void {
    this.animationCallbacks.push(callback);
  }

  /**
   * 移除动画回调
   */
  removeAnimationCallback(callback: (frame: TimelineFrame) => void): void {
    const index = this.animationCallbacks.indexOf(callback);
    if (index > -1) {
      this.animationCallbacks.splice(index, 1);
    }
  }

  /**
   * 更新波场图层 - 优化版本，支持自动创建图层，仅在动画播放时显示
   */
  private updateWaveFieldLayer(waveFieldData?: any): void {
    if (!waveFieldData) {
      // 隐藏波场图层
      if (this.layers.waveField) {
        this.layers.waveField.visible = false;
      }
      return;
    }

    try {
      // 如果波场图层不存在，尝试自动创建（但不阻塞动画）
      if (!this.layers.waveField) {
        // 使用异步方式创建图层，不阻塞当前动画帧
        this.createWaveLayerAsync().catch((error: any) => {
          // console.warn('自动创建波场图层失败:', error);
        });
        return;
      }

      // 显示波场图层（仅在有数据时）
      if (this.layers.waveField) {
        this.layers.waveField.visible = true;
        
        // 如果有时间字符串，快速更新图层时间参数
        if (waveFieldData.timeString) {
          this.updateWaveLayerTimeFast(waveFieldData.timeString);
        }
      }
    } catch (error) {
      // console.warn('更新波场图层失败:', error);
      // 不抛出错误，让动画继续
    }
  }

  /**
   * 更新台风位置
   */
  private updateTyphoonPosition(typhoonData: TyphoonData): void {
    if (!this.layers.typhoonCenter || !this.layers.typhoonInfluenceArea) return;

    try {
      const { Graphic, Point, Circle, SimpleMarkerSymbol, SimpleFillSymbol, PopupTemplate } = this.modules;

      // 清空当前台风位置和影响区域
      this.layers.typhoonCenter.removeAll();
      this.layers.typhoonInfluenceArea.removeAll();

      // 创建台风中心点
      const pointGeom = new Point({
        longitude: typhoonData.longitude,
        latitude: typhoonData.latitude,
        spatialReference: { wkid: 4326 }
      });

      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: [255, 69, 0, 0.8], // 橙红色台风眼
        size: 15,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      });

      const popupTemplate = new PopupTemplate({
        title: '台风中心',
        content: `
          <div>
            <p><strong>时间:</strong> ${typhoonData.timestamp.toLocaleString('zh-CN')}</p>
            <p><strong>位置:</strong> ${typhoonData.longitude.toFixed(3)}°E, ${typhoonData.latitude.toFixed(3)}°N</p>
            <p><strong>风圈半径:</strong> ${typhoonData.windRadius || typhoonData.radius || 'N/A'} km</p>
            <p><strong>强度:</strong> ${typhoonData.intensity || 'unknown'}</p>
          </div>
        `
      });

      const centerGraphic = new Graphic({
        geometry: pointGeom,
        symbol: symbol,
        attributes: typhoonData,
        popupTemplate: popupTemplate
      });

      this.layers.typhoonCenter.add(centerGraphic);

      // 创建台风影响区域
      const influenceRadius = typhoonData.radius || typhoonData.windRadius || 100; // 默认100公里
      if (influenceRadius > 0) {
        const influenceCircle = new Circle({
          center: pointGeom,
          radius: influenceRadius,
          radiusUnit: 'kilometers'
        });

        const influenceSymbol = new SimpleFillSymbol({
          style: 'solid',
          color: [255, 69, 0, 0.15], // 橙红色半透明填充，提高可见性
          outline: {
            color: [255, 69, 0, 0.8], // 橙红色边界，更加明显
            width: 3, // 增加边界宽度
            style: 'solid'
          }
        });

        const influenceGraphic = new Graphic({
          geometry: influenceCircle,
          symbol: influenceSymbol,
          attributes: {
            type: 'typhoon-influence',
            radius: influenceRadius,
            typhoonId: typhoonData.id,
            timestamp: typhoonData.timestamp
          },
          popupTemplate: new PopupTemplate({
            title: '台风影响区域',
            content: `
              <div>
                <p><strong>影响半径:</strong> ${influenceRadius.toFixed(1)} km</p>
                <p><strong>时间:</strong> ${typhoonData.timestamp.toLocaleString('zh-CN')}</p>
                <p><strong>台风中心:</strong> ${typhoonData.longitude.toFixed(3)}°E, ${typhoonData.latitude.toFixed(3)}°N</p>
              </div>
            `
          })
        });

        this.layers.typhoonInfluenceArea.add(influenceGraphic);
        // console.log(`🌀 台风影响区域已更新: 半径 ${influenceRadius}km`);
      }

      // 如果有额外的风圈数据，也显示风圈
      if (typhoonData.windRadius && typhoonData.windRadius !== influenceRadius) {
        const windCircle = new Circle({
          center: pointGeom,
          radius: typhoonData.windRadius,
          radiusUnit: 'kilometers'
        });

        const windSymbol = new SimpleFillSymbol({
          style: 'none',
          outline: {
            color: [255, 165, 0, 0.8], // 橙色虚线
            width: 2,
            style: 'dash'
          }
        });

        const windGraphic = new Graphic({
          geometry: windCircle,
          symbol: windSymbol,
          attributes: {
            type: 'wind-circle',
            radius: typhoonData.windRadius
          }
        });

        this.layers.typhoonInfluenceArea.add(windGraphic);
        // console.log(`💨 台风风圈已更新: 半径 ${typhoonData.windRadius}km`);
      }

    } catch (error) {
      // console.warn('更新台风位置失败:', error);
    }
  }

  /**
   * 更新滑翔器位置
   */
  private updateGliderPositions(gliderData: GliderData[]): void {
    if (!this.layers.gliderPoints) return;

    try {
      const { Graphic, Point, SimpleMarkerSymbol, PopupTemplate } = this.modules;

      // 清空当前滑翔器位置
      this.layers.gliderPoints.removeAll();

      // 添加当前时间范围内的滑翔器位置
      gliderData.forEach((point, index) => {
        const pointGeom = new Point({
          longitude: point.longitude,
          latitude: point.latitude,
          spatialReference: { wkid: 4326 }
        });

        // 根据时间远近调整透明度
        const alpha = Math.max(0.3, 1 - index * 0.1);
        
        const symbol = new SimpleMarkerSymbol({
          style: 'circle',
          color: [52, 152, 219, alpha],
          size: index === 0 ? 8 : 5, // 最新的点稍大
          outline: {
            color: [255, 255, 255],
            width: 1
          }
        });

        const popupTemplate = new PopupTemplate({
          title: `滑翔器观测点 #${point.id}`,
          content: `
            <div>
              <p><strong>时间:</strong> ${point.date} ${point.time}</p>
              <p><strong>位置:</strong> ${point.longitude.toFixed(6)}°E, ${point.latitude.toFixed(6)}°N</p>
              <p><strong>气温:</strong> ${point.airTemp?.toFixed(1) || 'N/A'}°C</p>
              <p><strong>风速:</strong> ${point.windSpeed?.toFixed(1) || 'N/A'} m/s</p>
              <p><strong>水温:</strong> ${point.waterTemp?.toFixed(1) || 'N/A'}°C</p>
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
                <button 
                  id="jump-to-point-${index}" 
                  style="
                    background: #2563eb; 
                    color: white; 
                    border: none; 
                    padding: 6px 12px; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                  "
                  onclick="window.jumpToGliderPoint && window.jumpToGliderPoint(${index})"
                >
                  跳转到此观测点
                </button>
              </div>
            </div>
          `
        });

        const graphic = new Graphic({
          geometry: pointGeom,
          symbol: symbol,
          attributes: point,
          popupTemplate: popupTemplate
        });

        this.layers.gliderPoints.add(graphic);
      });
    } catch (error) {
      // console.warn('更新滑翔器位置失败:', error);
    }
  }

  /**
   * 获取当前帧信息
   */
  getCurrentFrame(): TimelineFrame | null {
    return this.currentFrame;
  }

  /**
   * 设置波场服务URL
   */
  setWaveFieldServiceUrl(url: string): void {
    this.waveFieldBaseUrl = url;
  }

  // ArcGIS Server 身份验证
  private async authenticateArcGISServer(): Promise<void> {
    const { IdentityManager, ServerInfo } = this.modules;

    try {
      // console.log('正在进行 ArcGIS Server 身份验证...');

      const serverInfo = new ServerInfo({
        server: "https://localhost:6443",
        tokenServiceUrl: "https://localhost:6443/arcgis/tokens/generateToken",
      });

      IdentityManager.registerServers([serverInfo]);
      IdentityManager.useSignInPage = false;

      // 后台自动登录
      const credential = await IdentityManager.generateToken(serverInfo, {
        username: "siteadmin",
        password: "123456",
      });

      IdentityManager.registerToken({
        server: "https://localhost:6443",
        token: credential.token,
        expires: credential.expires,
        ssl: credential.ssl,
      });

      // console.log("ArcGIS Server 后台自动登录成功");
    } catch (error) {
      // console.error("ArcGIS Server 身份验证失败:", error);
      // 不抛出错误，允许地图继续初始化
      throw error;
    }
  }

  // 专门初始化波场图层的方法
  async initializeWaveField(): Promise<void> {
    if (!this.isInitialized) {
      // console.warn('地图未初始化，无法创建波场图层');
      return;
    }

    if (this.layers.waveField) {
      // console.log('波场图层已存在');
      return;
    }

    try {
      await this.createWaveLayer();
      // console.log('波场图层初始化成功');
    } catch (error) {
      // console.error('波场图层初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查波场图层是否存在
   */
  hasWaveFieldLayer(): boolean {
    return !!this.layers.waveField;
  }

  /**
   * 调试波场图层状态
   */
  debugWaveFieldLayer(): void {
    if (!this.layers.waveField) {
      // console.log('波场图层不存在');
      return;
    }

    // console.log('波场图层调试信息:');
    // console.log('- 图层类型:', this.layers.waveField.type);
    // console.log('- 图层可见性:', this.layers.waveField.visible);
    // console.log('- 图层透明度:', this.layers.waveField.opacity);
    // console.log('- 图层加载状态:', this.layers.waveField.loaded);
    // console.log('- 图层URL:', this.layers.waveField.url);
    
    if (this.layers.waveField.sublayers) {
      // console.log('- 子图层数量:', this.layers.waveField.sublayers.length);
      
      // 找到当前可见的子图层
      const visibleLayers: any[] = [];
      this.layers.waveField.sublayers.forEach((sublayer: any, index: number) => {
        if (sublayer.visible) {
          visibleLayers.push({
            index,
            id: sublayer.id,
            title: sublayer.title,
            opacity: sublayer.opacity,
            definitionExpression: sublayer.definitionExpression
          });
        }
      });
      
      // console.log('- 当前可见的子图层:', visibleLayers);
      
      if (visibleLayers.length === 0) {
        // console.warn('⚠️ 没有可见的子图层！');
      } else {
        // console.log(`✅ 当前有 ${visibleLayers.length} 个可见子图层`);
      }
    }
  }

  /**
   * 缩放到波浪场数据范围
   */
  zoomToWaveFieldExtent(): void {
    if (!this.layers.waveField || !this.view) return;

    try {
      // 如果图层有范围信息，缩放到该范围
      if (this.layers.waveField.fullExtent) {
        this.view.goTo(this.layers.waveField.fullExtent, { duration: 2000 })
          .then(() => {
            // console.log('已缩放到波浪场范围');
          })
          .catch((error: any) => {
            // console.warn('缩放到波浪场范围失败:', error);
          });
      } else {
        // 如果没有范围信息，缩放到一个合理的区域（南海区域）
        const extent = {
          xmin: 105, // 东经105度
          ymin: 10,  // 北纬10度  
          xmax: 125, // 东经125度
          ymax: 25,  // 北纬25度
          spatialReference: { wkid: 4326 }
        };
        
        this.view.goTo(extent, { duration: 2000 })
          .then(() => {
            // console.log('已缩放到南海区域');
          })
          .catch((error: any) => {
            // console.warn('缩放失败:', error);
          });
      }
    } catch (error) {
      // console.error('缩放到波浪场范围时出错:', error);
    }
  }

  /**
   * 手动显示指定索引的子图层（调试用）
   */
  showWaveFieldLayer(layerIndex: number): void {
    if (!this.layers.waveField || !this.layers.waveField.sublayers) {
      // console.warn('波场图层或子图层不存在');
      return;
    }

    const sublayers = this.layers.waveField.sublayers;
    
    // 隐藏所有子图层
    sublayers.forEach((sublayer: any) => {
      sublayer.visible = false;
    });

    // 显示指定的子图层
    if (layerIndex >= 0 && layerIndex < sublayers.length) {
      sublayers.items[layerIndex].visible = true;
      // console.log(`手动显示子图层 ${layerIndex}`);
      this.debugWaveFieldLayer();
    } else {
      // console.warn(`图层索引 ${layerIndex} 超出范围 [0, ${sublayers.length-1}]`);
    }
  }

  // 异步创建波浪场图层（不阻塞动画）
  private async createWaveLayerAsync(): Promise<void> {
    if (this.layers.waveField) {
      return; // 图层已存在
    }

    try {
      // console.log('正在后台创建波浪场图层...');
      await this.createWaveLayer();
      // console.log('波浪场图层后台创建成功');
    } catch (error) {
      // console.warn('后台创建波浪场图层失败:', error);
      throw error;
    }
  }

  // 自动初始化波浪场图层（静默方式）
  private autoInitializeWaveField(): void {
    if (this.layers.waveField) {
      return; // 图层已存在
    }

    // console.log('尝试自动初始化波浪场图层...');
    this.createWaveLayerAsync()
      .then(() => {
        // console.log('✅ 波场图层自动初始化成功');
      })
      .catch((error: any) => {
        // console.log('ℹ️ 波场图层自动初始化失败，可能需要手动初始化');
        // console.log('提示：请检查 ArcGIS Server 是否运行，或使用波场控制面板手动初始化');
        // 不显示错误详情，避免干扰用户
      });
  }

  /**
   * 获取波场图层状态信息
   */
  getWaveFieldStatus(): { exists: boolean; loaded: boolean; message: string } {
    if (!this.layers.waveField) {
      return {
        exists: false,
        loaded: false,
        message: '波场图层未初始化，点击播放时会自动创建'
      };
    }

    if (!this.layers.waveField.loaded) {
      return {
        exists: true,
        loaded: false,
        message: '波场图层正在加载中...'
      };
    }

    // 检查是否有可见的子图层
    const hasVisibleLayer = this.layers.waveField.sublayers?.some((layer: any) => layer.visible);
    
    return {
      exists: true,
      loaded: true,
      message: hasVisibleLayer ? '波场图层就绪并可见' : '波场图层就绪（隐藏状态）'
    };
  }

  /**
   * 关闭地图弹窗
   */
  closePopup(): void {
    if (this.view && this.view.popup) {
      this.view.popup.close();
    }
  }

  /**
   * 显示波浪场弹窗信息
   */
  private async showWaveFieldPopup(mapPoint: any, hitResult: any): Promise<void> {
    if (!this.view || !this.layers.waveField) return;

    try {
      // 获取当前可见的子图层信息
      const visibleSublayer = this.layers.waveField.sublayers?.find((layer: any) => layer.visible);
      const currentLayerIndex = this.currentVisibleLayerIndex;
      
      // 构造波浪场信息
      const coordinates = `${mapPoint.longitude.toFixed(6)}°E, ${mapPoint.latitude.toFixed(6)}°N`;
      const layerInfo = visibleSublayer ? visibleSublayer.title || `图层 ${currentLayerIndex + 1}` : '未知图层';
      
      // 尝试从图层标题中提取时间信息
      let timeInfo = '当前时刻';
      if (visibleSublayer && visibleSublayer.title) {
        const title = visibleSublayer.title;
        // 匹配时间格式，如 "05-Aug-2011_08-00-00"
        const timeMatch = title.match(/(\d{2}-\w{3}-\d{4}_\d{2}-\d{2}-\d{2})/);
        if (timeMatch) {
          const timeStr = timeMatch[1];
          // 转换为更易读的格式
          const parts = timeStr.split('_');
          const datePart = parts[0].replace(/-/g, ' ');
          const timePart = parts[1].replace(/-/g, ':');
          timeInfo = `${datePart} ${timePart}`;
        }
      }
      
      // 根据当前可见图层判断数据类型
      let waveDataType = '波浪场数据';
      let additionalInfo = '';
      
      if (visibleSublayer && visibleSublayer.title) {
        const title = visibleSublayer.title.toLowerCase();
        if (title.includes('height') || title.includes('hs')) {
          waveDataType = '有效波高 (Hs)';
          additionalInfo = '单位: 米 (m)<br>表示该位置的有效波高值';
        } else if (title.includes('period') || title.includes('tp')) {
          waveDataType = '峰值周期 (Tp)';
          additionalInfo = '单位: 秒 (s)<br>表示该位置的波浪峰值周期';
        } else if (title.includes('direction') || title.includes('dir')) {
          waveDataType = '波向 (Direction)';
          additionalInfo = '单位: 度 (°)<br>表示波浪传播方向';
        }
      }

      // 创建弹窗内容
      const popupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 8px;">
          <h3 style="margin: 0 0 12px 0; color: #2563eb; font-size: 16px; font-weight: 600;">
            🌊 SWAN波浪场信息
          </h3>
          <div style="font-size: 14px; line-height: 1.6; color: #374151;">
            <p style="margin: 8px 0;"><strong>📍 位置:</strong> ${coordinates}</p>
            <p style="margin: 8px 0;"><strong>⏰ 时间:</strong> ${timeInfo}</p>
            <p style="margin: 8px 0;"><strong>📊 数据类型:</strong> ${waveDataType}</p>
            <p style="margin: 8px 0;"><strong>📋 图层:</strong> ${layerInfo}</p>
            ${additionalInfo ? `<p style="margin: 8px 0; font-size: 12px; color: #6b7280;">${additionalInfo}</p>` : ''}
            <hr style="margin: 12px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="margin: 8px 0; font-size: 12px; color: #6b7280;">
              💡 <strong>提示:</strong> 使用动画控制面板可以查看不同时间点的波浪场变化
            </p>
          </div>
        </div>
      `;

      // 显示弹窗
      this.view.popup.open({
        title: "SWAN波浪场数据",
        content: popupContent,
        location: mapPoint,
        actions: []
      });

      // console.log(`🌊 显示波浪场弹窗 - 位置: ${coordinates}, 图层: ${layerInfo}`);
      
    } catch (error) {
      // console.error('显示波浪场弹窗失败:', error);
      
      // 显示简化的错误弹窗
      const coordinates = `${mapPoint.longitude.toFixed(6)}°E, ${mapPoint.latitude.toFixed(6)}°N`;
      this.view.popup.open({
        title: "SWAN波浪场",
        content: `
          <div style="padding: 8px; font-family: system-ui;">
            <p><strong>位置:</strong> ${coordinates}</p>
            <p><strong>状态:</strong> 波浪场数据</p>
            <p style="color: #6b7280; font-size: 12px;">详细信息暂时无法获取</p>
          </div>
        `,
        location: mapPoint
      });
    }
  }

  // ================================
  // AI 预测相关方法
  // ================================

  /**
   * 显示 AI 预测的选取点
   * @param selectedData 选取的历史数据点
   * @param startIndex 起始索引
   * @param count 选取的点数量
   */
  showAISelectedPoints(selectedData: any[], startIndex: number, count: number): void {
    if (!this.layers.aiSelectedPoints || !this.isInitialized) return;

    const { Graphic, Point, SimpleMarkerSymbol, PopupTemplate } = this.modules;

    // 清空现有的选取点
    this.layers.aiSelectedPoints.removeAll();

    selectedData.forEach((point, index) => {
      const pointGeom = new Point({
        longitude: point.longitude,
        latitude: point.latitude,
        spatialReference: { wkid: 4326 }
      });

      // 选取点使用特殊的样式：橙色，带边框
      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        color: [255, 165, 0, 0.8], // 橙色
        size: 10,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      });

      const popupTemplate = new PopupTemplate({
        title: `🤖 AI训练数据点 ${index + 1}/${count}`,
        content: `
          <div style="font-family: system-ui; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #f59e0b;">训练数据点详情</h4>
            <p><strong>原始序号:</strong> ${startIndex + index + 1}</p>
            <p><strong>时间:</strong> ${point.date} ${point.time}</p>
            <p><strong>位置:</strong> ${point.longitude.toFixed(6)}°E, ${point.latitude.toFixed(6)}°N</p>
            <p><strong>理想航向:</strong> ${point.expectedHeading.toFixed(1)}°</p>
            <p><strong>实际航向:</strong> ${point.currentHeading.toFixed(1)}°</p>
            <p><strong>水温:</strong> ${point.waterTemp.toFixed(1)}°C</p>
            <p><strong>风速:</strong> ${point.windSpeed.toFixed(1)} m/s</p>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              💡 此点被选中用于AI航迹预测分析
            </p>
          </div>
        `
      });

      const graphic = new Graphic({
        geometry: pointGeom,
        symbol: symbol,
        attributes: {
          ...point,
          aiPointType: 'selected',
          aiIndex: index,
          aiStartIndex: startIndex
        },
        popupTemplate: popupTemplate
      });

      this.layers.aiSelectedPoints.add(graphic);
    });

    // console.log(`🎯 显示了 ${selectedData.length} 个AI训练数据点`);
  }

  /**
   * 显示 AI 预测结果
   * @param predictedPoints 预测的点
   * @param confidence 整体置信度
   * @param lastTrainingPoint 最后一个训练点的位置
   */
  showAIPredictedResults(
    predictedPoints: any[], 
    confidence: number, 
    lastTrainingPoint: { latitude: number; longitude: number }
  ): void {
    if (!this.layers.aiPredictedPoints || !this.layers.aiPredictedTrack || !this.isInitialized) return;

    const { Graphic, Point, Polyline, SimpleMarkerSymbol, SimpleLineSymbol, PopupTemplate } = this.modules;

    // 清空现有的预测结果
    this.layers.aiPredictedPoints.removeAll();
    this.layers.aiPredictedTrack.removeAll();

    // 创建预测轨迹线（从最后一个训练点到预测点）
    const trackCoords = [
      [lastTrainingPoint.longitude, lastTrainingPoint.latitude], // 起始点
      ...predictedPoints.map(point => [point.longitude, point.latitude])
    ];

    const trackPolyline = new Polyline({
      paths: [trackCoords],
      spatialReference: { wkid: 4326 }
    });

    // 预测轨迹使用虚线样式，颜色根据置信度变化
    const trackColor = confidence > 0.8 
      ? [34, 197, 94, 0.8]   // 高置信度：绿色
      : confidence > 0.6 
      ? [251, 191, 36, 0.8]  // 中等置信度：黄色
      : [239, 68, 68, 0.8];  // 低置信度：红色

    const trackSymbol = new SimpleLineSymbol({
      color: trackColor,
      width: 4,
      style: 'dash'
    });

    const trackGraphic = new Graphic({
      geometry: trackPolyline,
      symbol: trackSymbol,
      attributes: {
        aiTrackType: 'predicted',
        confidence: confidence
      }
    });

    this.layers.aiPredictedTrack.add(trackGraphic);

    // 添加预测点
    predictedPoints.forEach((point, index) => {
      const pointGeom = new Point({
        longitude: point.longitude,
        latitude: point.latitude,
        spatialReference: { wkid: 4326 }
      });

      // 预测点样式：根据置信度选择颜色
      const pointColor = point.confidence > 0.8 
        ? [34, 197, 94, 0.9]   // 高置信度：绿色
        : point.confidence > 0.6 
        ? [251, 191, 36, 0.9]  // 中等置信度：黄色
        : [239, 68, 68, 0.9];  // 低置信度：红色

      const symbol = new SimpleMarkerSymbol({
        style: 'diamond', // 使用菱形区分预测点
        color: pointColor,
        size: 12,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      });

      const confidenceLevel = point.confidence > 0.8 ? '高' 
        : point.confidence > 0.6 ? '中等' : '低';
      
      const confidenceColor = point.confidence > 0.8 ? '#22c55e' 
        : point.confidence > 0.6 ? '#fbbf24' : '#ef4444';

      const popupTemplate = new PopupTemplate({
        title: `🔮 AI预测点 ${index + 1}/${predictedPoints.length}`,
        content: `
          <div style="font-family: system-ui; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #8b5cf6;">AI预测结果</h4>
            <p><strong>位置:</strong> ${point.latitude.toFixed(6)}°N, ${point.longitude.toFixed(6)}°E</p>
            ${point.heading !== undefined ? `<p><strong>预测航向:</strong> ${point.heading.toFixed(1)}°</p>` : ''}
            ${point.speed !== undefined ? `<p><strong>预测速度:</strong> ${point.speed.toFixed(2)} km/h</p>` : ''}
            ${point.estimatedTime ? `<p><strong>预计时间:</strong> ${point.estimatedTime}</p>` : ''}
            <div style="margin: 8px 0; padding: 6px; background: ${confidenceColor}20; border-left: 3px solid ${confidenceColor}; border-radius: 4px;">
              <strong>置信度:</strong> 
              <span style="color: ${confidenceColor}; font-weight: bold;">
                ${(point.confidence * 100).toFixed(1)}% (${confidenceLevel})
              </span>
            </div>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              🤖 基于DeepSeek AI分析生成的预测结果
            </p>
          </div>
        `
      });

      const graphic = new Graphic({
        geometry: pointGeom,
        symbol: symbol,
        attributes: {
          ...point,
          aiPointType: 'predicted',
          aiIndex: index,
          overallConfidence: confidence
        },
        popupTemplate: popupTemplate
      });

      this.layers.aiPredictedPoints.add(graphic);
    });

    // console.log(`🔮 显示了 ${predictedPoints.length} 个AI预测结果点，整体置信度: ${(confidence * 100).toFixed(1)}%`);
  }

  /**
   * 清除 AI 预测相关的所有图层内容
   */
  clearAIPredictionLayers(): void {
    if (this.layers.aiSelectedPoints) {
      this.layers.aiSelectedPoints.removeAll();
    }
    if (this.layers.aiPredictedPoints) {
      this.layers.aiPredictedPoints.removeAll();
    }
    if (this.layers.aiPredictedTrack) {
      this.layers.aiPredictedTrack.removeAll();
    }
    // console.log('🧹 已清除所有AI预测图层内容');
  }

  /**
   * 设置 AI 预测图层的可见性
   * @param visible 是否可见
   */
  setAIPredictionLayersVisible(visible: boolean): void {
    if (this.layers.aiSelectedPoints) {
      this.layers.aiSelectedPoints.visible = visible;
    }
    if (this.layers.aiPredictedPoints) {
      this.layers.aiPredictedPoints.visible = visible;
    }
    if (this.layers.aiPredictedTrack) {
      this.layers.aiPredictedTrack.visible = visible;
    }
    // console.log(`👁️ AI预测图层可见性设置为: ${visible}`);
  }

  /**
   * 缩放到 AI 预测数据范围
   * @param selectedPoints 选取的训练点
   * @param predictedPoints 预测的结果点
   */
  zoomToAIPredictionData(selectedPoints: any[], predictedPoints: any[]): void {
    if (!this.view || !this.view.ready) {
      // console.warn('地图视图未准备好，无法执行缩放');
      return;
    }

    const allPoints = [...selectedPoints, ...predictedPoints];
    if (allPoints.length === 0) {
      // console.warn('没有数据点，无法执行缩放');
      return;
    }

    try {
      const longitudes = allPoints.map(p => p.longitude);
      const latitudes = allPoints.map(p => p.latitude);

      // 检查数据有效性
      if (longitudes.some(lon => isNaN(lon)) || latitudes.some(lat => isNaN(lat))) {
        // console.error('数据点包含无效坐标，无法缩放');
        return;
      }

      // 计算边界，增加适当的边距
      const minLon = Math.min(...longitudes);
      const maxLon = Math.max(...longitudes);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);

      // 动态计算边距，确保有合适的缩放级别
      const lonSpan = maxLon - minLon;
      const latSpan = maxLat - minLat;
      const maxSpan = Math.max(lonSpan, latSpan);
      
      // 边距至少为数据跨度的20%，最小0.01度
      const margin = Math.max(maxSpan * 0.2, 0.01);

      const extent = {
        xmin: minLon - margin,
        ymin: minLat - margin,
        xmax: maxLon + margin,
        ymax: maxLat + margin,
        spatialReference: { wkid: 4326 }
      };

      // console.log('🎯 准备缩放到AI预测数据范围:', {
      //   extent,
      //   pointCount: allPoints.length,
      //   selectedCount: selectedPoints.length,
      //   predictedCount: predictedPoints.length
      // });

      // 使用 goTo 方法进行缩放
      this.view.goTo(extent, { 
        duration: 2000,
        easing: 'ease-in-out'
      }).then(() => {
        // console.log('✅ 成功缩放到AI预测数据范围');
      }).catch((error: any) => {
        // console.error('缩放到AI预测数据范围失败:', error);
        
        // 如果 goTo 失败，尝试使用中心点和缩放级别的方式
        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        // 根据数据跨度估算合适的缩放级别
        let zoom = 10;
        if (maxSpan < 0.01) zoom = 15;
        else if (maxSpan < 0.05) zoom = 13;
        else if (maxSpan < 0.1) zoom = 12;
        else if (maxSpan < 0.5) zoom = 10;
        else zoom = 8;
        
        this.view.goTo({
          center: [centerLon, centerLat],
          zoom: zoom
        }, { duration: 2000 }).then(() => {
          // console.log('✅ 使用备用方法成功缩放到AI预测数据范围');
        }).catch((fallbackError: any) => {
          // console.error('备用缩放方法也失败了:', fallbackError);
        });
      });

    } catch (error) {
      // console.error('缩放到AI预测数据失败:', error);
    }
  }
}
