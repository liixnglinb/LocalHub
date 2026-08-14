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
 * TrendChart — 平滑曲线趋势图（还原自 release10 安装包）
 * - 隐藏坐标轴与网格，仅保留平滑曲线 + 渐变填充 + 柔和圆点
 */
export default function TrendChart({ data, labels, color = '#22C3D6', height = 96, unit = '' }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const grad = el.getContext('2d').createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(0.6, color + '1A');
    grad.addColorStop(1, color + '00');

    chartRef.current = new Chart(el, {
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
            pointRadius: 3,
            pointHoverRadius: 5,
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
          x: { display: false, grid: { display: false }, border: { display: false } },
          y: { display: false, grid: { display: false }, border: { display: false } },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data, color, height]);

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
