// src/components/common/DataChart.tsx
import React, { useEffect, useRef } from "react";
import type { GliderData, TyphoonData } from "../../types";

interface DataChartProps {
  data: GliderData[] | TyphoonData[];
  type: "temperature" | "windSpeed" | "pressure" | "trajectory";
  width?: number;
  height?: number;
  className?: string;
}

const DataChart: React.FC<DataChartProps> = ({
  data,
  type,
  width = 400,
  height = 200,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置canvas尺寸
    canvas.width = width;
    canvas.height = height;

    // 清空canvas
    ctx.clearRect(0, 0, width, height);

    // 绘制背景
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    // 绘制边框
    ctx.strokeStyle = "#e9ecef";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    drawChart(ctx, data, type, width, height);
  }, [data, type, width, height]);

  const drawChart = (
    ctx: CanvasRenderingContext2D,
    data: any[],
    type: string,
    width: number,
    height: number
  ) => {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    let values: number[] = [];
    let label = "";
    let color = "#3b82f6";
    let unit = "";

    // 根据类型提取数据
    switch (type) {
      case "temperature":
        values = data.map((d) => d.airTemp || 0).filter((v) => !isNaN(v));
        label = "气温";
        color = "#ef4444";
        unit = "°C";
        break;
      case "windSpeed":
        values = data.map((d) => d.windSpeed || 0).filter((v) => !isNaN(v));
        label = "风速";
        color = "#06b6d4";
        unit = "m/s";
        break;
      case "pressure":
        values = data.map((d) => d.pressure || 0).filter((v) => !isNaN(v));
        label = "气压";
        color = "#8b5cf6";
        unit = "MPa";
        break;
      default:
        return;
    }

    if (values.length === 0) return;

    // 计算数据范围
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;

    // 绘制坐标轴
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;

    // X轴
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // 绘制刻度和标签
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    // Y轴刻度
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const y = height - padding - (i / yTicks) * chartHeight;
      const value = minValue + (i / yTicks) * range;

      // 刻度线
      ctx.beginPath();
      ctx.moveTo(padding - 5, y);
      ctx.lineTo(padding, y);
      ctx.stroke();

      // 标签
      ctx.textAlign = "right";
      ctx.fillText(value.toFixed(1), padding - 8, y + 4);
    }

    // X轴刻度
    const xTicks = Math.min(5, values.length - 1);
    for (let i = 0; i <= xTicks; i++) {
      const x = padding + (i / xTicks) * chartWidth;
      const index = Math.floor((i / xTicks) * (values.length - 1));

      // 刻度线
      ctx.beginPath();
      ctx.moveTo(x, height - padding);
      ctx.lineTo(x, height - padding + 5);
      ctx.stroke();

      // 标签
      ctx.textAlign = "center";
      ctx.fillText(index.toString(), x, height - padding + 18);
    }

    // 绘制数据线
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = height - padding - ((value - minValue) / range) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 绘制数据点
    ctx.fillStyle = color;
    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * chartWidth;
      const y = height - padding - ((value - minValue) / range) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // 绘制标题
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${label} (${unit})`, width / 2, 20);

    // 绘制统计信息
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`最小值: ${minValue.toFixed(1)}${unit}`, 10, height - 10);
    ctx.fillText(`最大值: ${maxValue.toFixed(1)}${unit}`, 120, height - 10);
    ctx.fillText(`平均值: ${avg.toFixed(1)}${unit}`, 230, height - 10);
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
};

export default DataChart;
