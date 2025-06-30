// src/services/MapManager.ts
import type { GliderData, TyphoonData } from '../types';

// 声明全局的require函数类型
declare global {
  interface Window {
    require: (
      deps: string[], 
      callback: (...modules: any[]) => void, 
      errback?: (error: any) => void
    ) => void;
  }
}

// ArcGIS模块类型声明
interface ArcGISModules {
  Map: any;
  MapView: any;
  GraphicsLayer: any;
  Graphic: any;
  Point: any;
  Polyline: any;
  Circle: any;
  SimpleMarkerSymbol: any;
  SimpleLineSymbol: any;
  SimpleFillSymbol: any;
  PopupTemplate: any;
  ScaleBar: any;
  Locate: any;
  Home: any;
  Zoom: any;
  Basemap: any;
  TileLayer: any;
  MapImageLayer: any;
}

export class MapManager {
  private modules: ArcGISModules | null = null;
  private map: any = null;
  private view: any = null;
  private layers: {
    gliderTrack: any;
    gliderPoints: any;
    gliderCurrent: any;
    waveField: any;
    typhoonTrack: any;
    typhoonCenter: any;
    measure: any;
  } = {
    gliderTrack: null,
    gliderPoints: null,
    gliderCurrent: null,
    waveField: null,
    typhoonTrack: null,
    typhoonCenter: null,
    measure: null,
  };

  private isInitialized = false;
  private container: HTMLDivElement | null = null;

  // 初始化地图
  async initialize(container: HTMLDivElement): Promise<void> {
    try {
      this.container = container;
      
      // 加载ArcGIS模块
      await this.loadArcGISModules();
      
      // 创建地图和视图
      this.createMap();
      this.createView();
      this.createLayers();
      this.setupEventHandlers();
      
      await this.view.when();
      this.isInitialized = true;
      
      // console.log('地图初始化成功');
    } catch (error) {
      // console.error('地图初始化失败:', error);
      throw error;
    }
  }

  // 加载ArcGIS模块
  private async loadArcGISModules(): Promise<void> {
    if (window.require) {
      // 如果全局require可用，使用CDN版本
      return new Promise((resolve, reject) => {
        window.require([
          'esri/Map',
          'esri/views/MapView',
          'esri/layers/GraphicsLayer',
          'esri/Graphic',
          'esri/geometry/Point',
          'esri/geometry/Polyline',
          'esri/geometry/Circle',
          'esri/symbols/SimpleMarkerSymbol',
          'esri/symbols/SimpleLineSymbol',
          'esri/symbols/SimpleFillSymbol',
          'esri/PopupTemplate',
          'esri/widgets/ScaleBar',
          'esri/widgets/Locate',
          'esri/widgets/Home',
          'esri/widgets/Zoom',
          'esri/Basemap',
          'esri/layers/TileLayer',
          'esri/layers/MapImageLayer'
        ], (
          Map: any,
          MapView: any,
          GraphicsLayer: any,
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
          Basemap: any,
          TileLayer: any,
          MapImageLayer: any
        ) => {
          this.modules = {
            Map,
            MapView,
            GraphicsLayer,
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
            Basemap,
            TileLayer,
            MapImageLayer,
          };
          resolve();
        }, reject);
      });
    } else {
      // 如果使用npm包
      try {
        const [
          Map, MapView, GraphicsLayer, Graphic, Point, Polyline, Circle,
          SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol,
          PopupTemplate, ScaleBar, Locate, Home, Zoom, Basemap, TileLayer, MapImageLayer
        ] = await Promise.all([
          import('@arcgis/core/Map'),
          import('@arcgis/core/views/MapView'),
          import('@arcgis/core/layers/GraphicsLayer'),
          import('@arcgis/core/Graphic'),
          import('@arcgis/core/geometry/Point'),
          import('@arcgis/core/geometry/Polyline'),
          import('@arcgis/core/geometry/Circle'),
          import('@arcgis/core/symbols/SimpleMarkerSymbol'),
          import('@arcgis/core/symbols/SimpleLineSymbol'),
          import('@arcgis/core/symbols/SimpleFillSymbol'),
          import('@arcgis/core/PopupTemplate'),
          import('@arcgis/core/widgets/ScaleBar'),
          import('@arcgis/core/widgets/Locate'),
          import('@arcgis/core/widgets/Home'),
          import('@arcgis/core/widgets/Zoom'),
          import('@arcgis/core/Basemap'),
          import('@arcgis/core/layers/TileLayer'),
          import('@arcgis/core/layers/MapImageLayer')
        ]);

        this.modules = {
          Map: Map.default || Map,
          MapView: MapView.default || MapView,
          GraphicsLayer: GraphicsLayer.default || GraphicsLayer,
          Graphic: Graphic.default || Graphic,
          Point: Point.default || Point,
          Polyline: Polyline.default || Polyline,
          Circle: Circle.default || Circle,
          SimpleMarkerSymbol: SimpleMarkerSymbol.default || SimpleMarkerSymbol,
          SimpleLineSymbol: SimpleLineSymbol.default || SimpleLineSymbol,
          SimpleFillSymbol: SimpleFillSymbol.default || SimpleFillSymbol,
          PopupTemplate: PopupTemplate.default || PopupTemplate,
          ScaleBar: ScaleBar.default || ScaleBar,
          Locate: Locate.default || Locate,
          Home: Home.default || Home,
          Zoom: Zoom.default || Zoom,
          Basemap: Basemap.default || Basemap,
          TileLayer: TileLayer.default || TileLayer,
          MapImageLayer: MapImageLayer.default || MapImageLayer,
        };
      } catch (error) {
        // console.error('使用npm包加载ArcGIS模块失败:', error);
        throw error;
      }
    }
  }

  // 创建地图
  private createMap(): void {
    if (!this.modules) throw new Error('ArcGIS模块未加载');

    const { Map, Basemap, TileLayer } = this.modules;

    // 创建海洋底图
    const oceanBasemap = new Basemap({
      baseLayers: [
        new TileLayer({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer'
        })
      ]
    });

    this.map = new Map({
      basemap: oceanBasemap
    });
  }

  // 创建视图
  private createView(): void {
    if (!this.modules || !this.map || !this.container) {
      throw new Error('地图或容器未初始化');
    }

    const { MapView, ScaleBar, Locate, Home, Zoom } = this.modules;

    this.view = new MapView({
      container: this.container,
      map: this.map,
      center: [126.32, 28.24],
      zoom: 7,
      constraints: {
        minZoom: 3,
        maxZoom: 18
      }
    });

    // 添加工具部件
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
  }

  // 创建图层
  private createLayers(): void {
    if (!this.modules) throw new Error('ArcGIS模块未加载');

    const { GraphicsLayer } = this.modules;

    // 创建各种图层
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

    this.layers.measure = new GraphicsLayer({
      id: 'measure',
      title: '测量图层'
    });

    // 添加图层到地图
    this.map.addMany([
      this.layers.gliderTrack,
      this.layers.gliderPoints,
      this.layers.gliderCurrent,
      this.layers.typhoonTrack,
      this.layers.typhoonCenter,
      this.layers.measure
    ]);
  }

  // 设置事件处理器
  private setupEventHandlers(): void {
    if (!this.view) return;

    // 地图点击事件
    this.view.on('click', (event: any) => {
      // 触发自定义事件
      this.container?.dispatchEvent(new CustomEvent('mapClick', {
        detail: {
          mapPoint: event.mapPoint,
          screenPoint: event.screenPoint
        }
      }));
    });

    // 鼠标移动事件
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

  // 添加滑翔器数据
  addGliderData(data: GliderData[]): void {
    if (!this.isInitialized || !this.modules || data.length === 0) return;

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

  // 添加台风数据
  addTyphoonData(data: TyphoonData[]): void {
    if (!this.isInitialized || !this.modules || data.length === 0) return;

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

  // 更新当前位置（用于动画）
  updateCurrentPosition(data: GliderData | TyphoonData, type: 'glider' | 'typhoon'): void {
    if (!this.isInitialized || !this.modules) return;

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
      }, { duration: 1000 });

    } else if (type === 'typhoon') {
      this.layers.typhoonCenter.removeAll();

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

      // 风圈
      if (typhoonData.windRadius) {
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
          symbol: circleSymbol
        });

        this.layers.typhoonCenter.add(circleGraphic);
      }
    }
  }

  // 切换底图
  changeBasemap(basemapId: string): void {
    if (!this.map || !this.modules) return;

    try {
      const basemapMap: Record<string, string> = {
        'oceans': 'gray-vector', // 改为更稳定的底图
        'satellite': 'satellite',
        'topo': 'topo-vector',
        'streets': 'streets-vector',
        'gray': 'gray-vector'
      };

      const targetBasemap = basemapMap[basemapId] || 'gray-vector';
      
      // 异步加载底图以避免阻塞
      setTimeout(() => {
        if (this.map) {
          this.map.basemap = targetBasemap;
        }
      }, 100);
      
    } catch (error) {
      // console.warn('切换底图失败:', error);
      // 使用备用底图
      if (this.map) {
        this.map.basemap = 'gray-vector';
      }
    }
  }

  // 设置图层可见性
  setLayerVisible(layerId: string, visible: boolean): void {
    const layer = this.layers[layerId as keyof typeof this.layers];
    if (layer) {
      layer.visible = visible;
    }
  }

  // 设置图层透明度
  setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers[layerId as keyof typeof this.layers];
    if (layer) {
      layer.opacity = opacity;
    }
  }

  // 缩放到数据范围
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

      // 添加延迟和错误处理
      setTimeout(() => {
        if (this.view && this.view.ready) {
          this.view.goTo(extent, { duration: 2000 }).catch((error: any) => {
            // console.warn('缩放到数据范围失败:', error);
          });
        }
      }, 500);
    } catch (error) {
      // console.warn('计算数据范围失败:', error);
    }
  }

  // 截图
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

  // 清理资源
  destroy(): void {
    try {
      // 清理定时器
      if (this.view) {
        this.view.destroy();
        this.view = null;
      }
      
      // 清理图层
      Object.keys(this.layers).forEach(key => {
        const layer = this.layers[key as keyof typeof this.layers];
        if (layer) {
          try {
            layer.destroy();
          } catch (error) {
            // console.warn(`清理图层 ${key} 时出错:`, error);
          }
        }
        this.layers[key as keyof typeof this.layers] = null;
      });
      
      this.map = null;
      this.modules = null;
      this.isInitialized = false;
    } catch (error) {
      // console.warn('清理地图资源时出错:', error);
    }
  }

  // Getters
  get mapView() {
    return this.view;
  }

  get mapInstance() {
    return this.map;
  }

  get initialized() {
    return this.isInitialized;
  }
}