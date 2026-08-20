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
 * TrendChart — 商务风趋势图
 * - 清晰横/纵坐标 + 浅色网格线 + 平滑曲线 + 渐变淡填
 * - 商务简洁：浅灰边框、细网格、主题色曲线
 */
export default function TrendChart({ data, labels, color = '#F97316', height = 140, unit = '', fill = false }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const h = fill ? (el.parentElement?.clientHeight || height) : height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');

    const gray = 'rgba(20,24,33,.08)';

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
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: color,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: color,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(18,18,20,0.96)',
            titleColor: 'rgba(255,255,255,0.6)',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: (c) => `${c.parsed.y}${unit}` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: true, color: gray, width: 1 },
            ticks: { color: '#8a8f98', font: { size: 10.5 }, maxTicksLimit: 10 },
          },
          y: {
            beginAtZero: true,
            grid: { display: true, color: gray, width: 1 },
            border: { display: false },
            ticks: {
              color: '#8a8f98',
              font: { size: 10.5 },
              maxTicksLimit: 5,
              padding: 6,
              callback: (v) => `${v}${unit}`,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data, color, height]);

  return (
    <div style={{ height: fill ? '100%' : height, width: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}