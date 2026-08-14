import React, { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

/**
 * TrendChart — 基于 Chart.js 的网格状平滑趋势图（LocalHub 深色玻璃拟态版）
 * - tension 曲线平滑 + 渐变填充
 * - 网格背景（细线）+ 横轴日期刻度 + 纵轴数值刻度
 * - 柔和圆点（带光晕）
 */
const GRID = 'rgba(255,255,255,0.055)';
const TICK = 'rgba(255,255,255,0.34)';

export default function TrendChart({ data, labels, color = '#22C3D6', height = 140, unit = '' }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(0.6, color + '1A');
    grad.addColorStop(1, color + '00');

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || data.map((_, i) => i + 1),
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: grad,
            fill: true,
            tension: 0.42,
            borderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#121214',
            pointBorderColor: color,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: color,
            pointShadowColor: color + '66',
            pointShadowBlur: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18,18,20,0.96)',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            titleColor: 'rgba(255,255,255,0.55)',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 10,
            displayColors: false,
            callbacks: {
              label: (c) => `${c.parsed.y}${unit}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: true, color: GRID, drawTicks: false, lineWidth: 1 },
            border: { display: false },
            ticks: {
              color: TICK,
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 7,
              padding: 6,
            },
          },
          y: {
            display: true,
            grid: { display: true, color: GRID, drawTicks: false, lineWidth: 1 },
            border: { display: false },
            beginAtZero: true,
            ticks: {
              color: TICK,
              font: { size: 9 },
              maxTicksLimit: 5,
              padding: 4,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, color, height, labels]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
