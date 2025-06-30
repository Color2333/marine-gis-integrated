// src/services/TimelineService.ts
import type { GliderData, TyphoonData, WaveFieldData } from '../types';

export interface TimelineFrame {
  index: number;
  timestamp: Date;
  waveField?: WaveFieldData;
  typhoon?: TyphoonData;
  gliderPoints: GliderData[];
}

export class TimelineService {
  private frames: TimelineFrame[] = [];
  private gliderData: GliderData[] = [];
  private typhoonData: TyphoonData[] = [];
  private waveFieldData: WaveFieldData[] = [];

  /**
   * 设置数据并生成时间轴帧
   */
  setData(
    gliderData: GliderData[],
    typhoonData: TyphoonData[],
    waveFieldData: WaveFieldData[]
  ): void {
    this.gliderData = gliderData;
    this.typhoonData = typhoonData;
    this.waveFieldData = waveFieldData;
    
    this.generateFrames();
  }

  /**
   * 生成时间轴帧
   * 以波场数据的时间为主轴，同步台风和滑翔器数据
   */
  private generateFrames(): void {
    this.frames = [];

    // 以波场数据的时间为基准
    this.waveFieldData.forEach((waveField, index) => {
      const frameTime = waveField.timestamp;
      
      // 查找最接近这个时间的台风数据
      const typhoonPoint = this.findClosestTyphoonData(frameTime);
      
      // 查找这个时间范围内的滑翔器数据
      const gliderPoints = this.findGliderDataInTimeRange(frameTime);

      this.frames.push({
        index,
        timestamp: frameTime,
        waveField,
        typhoon: typhoonPoint,
        gliderPoints
      });
    });

    // console.log(`生成了 ${this.frames.length} 个时间帧`);
  }

  /**
   * 查找最接近指定时间的台风数据
   */
  private findClosestTyphoonData(targetTime: Date): TyphoonData | undefined {
    if (this.typhoonData.length === 0) return undefined;

    let closest = this.typhoonData[0];
    let minDiff = Math.abs(targetTime.getTime() - closest.timestamp.getTime());

    for (const typhoon of this.typhoonData) {
      const diff = Math.abs(targetTime.getTime() - typhoon.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = typhoon;
      }
    }

    // 如果时间差超过2小时，认为没有匹配的数据
    const maxDiff = 2 * 60 * 60 * 1000; // 2小时
    return minDiff <= maxDiff ? closest : undefined;
  }

  /**
   * 查找指定时间范围内的滑翔器数据
   */
  private findGliderDataInTimeRange(
    targetTime: Date,
    rangeMinutes: number = 30
  ): GliderData[] {
    const rangeMs = rangeMinutes * 60 * 1000;
    const startTime = new Date(targetTime.getTime() - rangeMs);
    const endTime = new Date(targetTime.getTime() + rangeMs);

    return this.gliderData.filter(glider => {
      const gliderTime = glider.timestamp.getTime();
      return gliderTime >= startTime.getTime() && gliderTime <= endTime.getTime();
    });
  }

  /**
   * 获取指定帧的数据
   */
  getFrame(index: number): TimelineFrame | undefined {
    return this.frames[index];
  }

  /**
   * 获取总帧数
   */
  getTotalFrames(): number {
    return this.frames.length;
  }

  /**
   * 获取所有帧
   */
  getAllFrames(): TimelineFrame[] {
    return this.frames;
  }

  /**
   * 根据时间查找最接近的帧
   */
  findFrameByTime(targetTime: Date): TimelineFrame | undefined {
    if (this.frames.length === 0) return undefined;

    let closest = this.frames[0];
    let minDiff = Math.abs(targetTime.getTime() - closest.timestamp.getTime());

    for (const frame of this.frames) {
      const diff = Math.abs(targetTime.getTime() - frame.timestamp.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = frame;
      }
    }

    return closest;
  }

  /**
   * 获取时间范围
   */
  getTimeRange(): { start: Date; end: Date } | null {
    if (this.frames.length === 0) return null;

    const start = this.frames[0].timestamp;
    const end = this.frames[this.frames.length - 1].timestamp;

    return { start, end };
  }

  /**
   * 获取帧的时间间隔（毫秒）
   */
  getFrameInterval(): number {
    if (this.frames.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < this.frames.length; i++) {
      const interval = this.frames[i].timestamp.getTime() - this.frames[i - 1].timestamp.getTime();
      intervals.push(interval);
    }

    // 返回平均间隔
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * 检查数据的时间重叠情况
   */
  analyzeDataOverlap(): {
    gliderRange: { start: Date; end: Date } | null;
    typhoonRange: { start: Date; end: Date } | null;
    waveFieldRange: { start: Date; end: Date } | null;
    overlapRange: { start: Date; end: Date } | null;
  } {
    const getRange = (data: { timestamp: Date }[]) => {
      if (data.length === 0) return null;
      const times = data.map(item => item.timestamp.getTime()).sort();
      return {
        start: new Date(times[0]),
        end: new Date(times[times.length - 1])
      };
    };

    const gliderRange = getRange(this.gliderData);
    const typhoonRange = getRange(this.typhoonData);
    const waveFieldRange = getRange(this.waveFieldData);

    // 计算重叠时间范围
    let overlapRange: { start: Date; end: Date } | null = null;
    
    const ranges = [gliderRange, typhoonRange, waveFieldRange].filter(Boolean);
    if (ranges.length > 1) {
      const overlapStart = Math.max(...ranges.map(r => r!.start.getTime()));
      const overlapEnd = Math.min(...ranges.map(r => r!.end.getTime()));
      
      if (overlapStart <= overlapEnd) {
        overlapRange = {
          start: new Date(overlapStart),
          end: new Date(overlapEnd)
        };
      }
    }

    return {
      gliderRange,
      typhoonRange,
      waveFieldRange,
      overlapRange
    };
  }
}
