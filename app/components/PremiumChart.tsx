'use client';

import React from 'react';

export interface DailyStat {
    date: string;
    impressions: number;
    actions: number;
    engagement: number;
}

interface PremiumChartProps {
    data: DailyStat[];
    metric: 'impressions' | 'actions' | 'engagement';
}

export function PremiumChart({ data, metric }: PremiumChartProps) {
    if (data.length === 0) return (
        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase tracking-widest bg-white/5 rounded-3xl border border-dashed border-white/10">
            No data yet
        </div>
    );

    const width = 1000;
    const height = 300;
    const padding = 40;

    const values = data.map(d => (d as any)[metric]);
    const maxVal = Math.max(...values, 10);
    const minVal = 0;

    const getX = (index: number) => (index / (data.length - 1)) * (width - padding * 2) + padding;
    const getY = (val: number) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);

    let d = '';
    data.forEach((point, i) => {
        const x = getX(i);
        const y = getY((point as any)[metric]);
        if (i === 0) {
            d += `M ${x} ${y}`;
        } else {
            const prevX = getX(i - 1);
            const prevY = getY((data[i - 1] as any)[metric]);
            const cp1x = prevX + (x - prevX) / 2;
            const cp2x = prevX + (x - prevX) / 2;
            d += ` C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
        }
    });

    const areaD = `${d} L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
    const metricColor = metric === 'impressions' ? '#3b82f6' : metric === 'actions' ? '#ec4899' : '#a855f7';

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-2xl">
            <defs>
                <linearGradient id={`areaGradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={metricColor} stopOpacity="0" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                <line
                    key={p}
                    x1={padding}
                    y1={getY(maxVal * p)}
                    x2={width - padding}
                    y2={getY(maxVal * p)}
                    stroke="white"
                    strokeOpacity="0.05"
                    strokeDasharray="4 8"
                />
            ))}

            <path
                d={areaD}
                fill={`url(#areaGradient-${metric})`}
                className="transition-all duration-1000"
            />

            <path
                d={d}
                fill="none"
                stroke={metricColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="transition-all duration-1000"
                style={{ filter: `drop-shadow(0 0 8px ${metricColor}44)` }}
            />

            {data.map((d, i) => {
                const x = getX(i);
                const y = getY((d as any)[metric]);
                const showLabel = i % Math.ceil(data.length / 7) === 0;
                
                return (
                    <g key={i} className="group/dot">
                        <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill={metricColor}
                            className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                        />
                        <circle
                            cx={x}
                            cy={y}
                            r="12"
                            fill={metricColor}
                            fillOpacity="0.1"
                            className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                        />
                        {showLabel && (
                            <text
                                x={x}
                                y={height - 10}
                                fill="currentColor"
                                className="text-zinc-600 font-mono text-[10px]"
                                textAnchor="middle"
                            >
                                {d.date.split('-').slice(1).join('/')}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
