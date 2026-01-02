'use client';

import { useEffect, useRef } from 'react';

export default function ContentStatsChart({ labels = [], values = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const Chart = typeof window !== 'undefined' ? window.Chart : null;
    if (!Chart || !canvasRef.current) return;

    // destroy previous instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Count',
            data: values,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [labels, values]);

  return (
    <div style={{ height: 320 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
