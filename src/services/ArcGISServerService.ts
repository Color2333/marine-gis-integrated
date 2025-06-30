// src/services/ArcGISServerService.ts
import type { WaveFieldData } from '../types';

export interface ArcGISServerConfig {
  baseUrl: string;
  serviceName: string;
  token?: string;
}

export class ArcGISServerService {
  private config: ArcGISServerConfig;
  private serviceInfo: any = null;

  constructor(config: ArcGISServerConfig) {
    this.config = config;
  }

  // 获取服务信息
  async getServiceInfo(): Promise<any> {
    if (this.serviceInfo) {
      return this.serviceInfo;
    }

    try {
      const url = `${this.config.baseUrl}/arcgis/rest/services/${this.config.serviceName}/MapServer?f=json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`服务信息获取失败: ${response.status}`);
      }

      this.serviceInfo = await response.json();
      return this.serviceInfo;
    } catch (error) {
      // console.error('获取ArcGIS Server服务信息失败:', error);
      throw error;
    }
  }

  // 创建波浪图层配置
  async createWaveLayerConfig(opacity: number = 0.7): Promise<any> {
    const serviceInfo = await this.getServiceInfo();
    const sublayersConfig = [];

    if (serviceInfo?.layers?.length > 1) {
      for (let layer of serviceInfo.layers) {
        sublayersConfig.push({
          id: layer.id,
          visible: false,
          opacity: opacity,
        });
      }
    } else {
      sublayersConfig.push({
        id: 0,
        visible: true,
        opacity: opacity,
      });
    }

    return {
      url: `${this.config.baseUrl}/arcgis/rest/services/${this.config.serviceName}/MapServer`,
      sublayers: sublayersConfig,
      opacity: opacity,
    };
  }

  // 生成Token（如果需要认证）
  async generateToken(username: string, password: string): Promise<string> {
    try {
      const tokenUrl = `${this.config.baseUrl}/arcgis/tokens/generateToken`;
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('client', 'requestip');
      formData.append('f', 'json');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Token生成失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Token生成失败: ${result.error.message}`);
      }

      this.config.token = result.token;
      return result.token;
    } catch (error) {
      // console.error('生成ArcGIS Server Token失败:', error);
      throw error;
    }
  }

  // 查询波浪数据
  async queryWaveData(longitude: number, latitude: number, timeString: string): Promise<any> {
    try {
      const queryUrl = `${this.config.baseUrl}/arcgis/rest/services/${this.config.serviceName}/MapServer/0/query`;
      
      const params = new URLSearchParams({
        f: 'json',
        geometry: `${longitude},${latitude}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        returnGeometry: 'false',
        returnIdsOnly: 'false',
        returnCountOnly: 'false',
        outFields: '*',
        where: `TimeString = '${timeString}'`
      });

      if (this.config.token) {
        params.append('token', this.config.token);
      }

      const response = await fetch(`${queryUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`波浪数据查询失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`波浪数据查询失败: ${result.error.message}`);
      }

      return result;
    } catch (error) {
      // console.error('查询波浪数据失败:', error);
      throw error;
    }
  }

  // 识别地图位置的波浪数据
  async identifyWaveData(longitude: number, latitude: number, mapExtent: any, timeString: string): Promise<any> {
    try {
      const identifyUrl = `${this.config.baseUrl}/arcgis/rest/services/${this.config.serviceName}/MapServer/identify`;
      
      const params = new URLSearchParams({
        f: 'json',
        geometry: `${longitude},${latitude}`,
        geometryType: 'esriGeometryPoint',
        sr: '4326',
        mapExtent: `${mapExtent.xmin},${mapExtent.ymin},${mapExtent.xmax},${mapExtent.ymax}`,
        imageDisplay: '1000,600,96',
        tolerance: '3',
        returnGeometry: 'false',
        layerDefs: `0:TimeString = '${timeString}'`
      });

      if (this.config.token) {
        params.append('token', this.config.token);
      }

      const response = await fetch(`${identifyUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`波浪数据识别失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`波浪数据识别失败: ${result.error.message}`);
      }

      return result;
    } catch (error) {
      // console.error('识别波浪数据失败:', error);
      throw error;
    }
  }
}

// 默认配置
export const defaultArcGISServerConfig: ArcGISServerConfig = {
  baseUrl: 'https://localhost:6443',
  serviceName: 'wave_server',
};
