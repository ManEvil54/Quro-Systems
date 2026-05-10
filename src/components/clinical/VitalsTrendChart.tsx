// ============================================================
// Quro — Vitals Trend Chart
// Premium, SVG-based longitudinal data visualization
// ============================================================
'use client';

import React, { useMemo } from 'react';
import { Activity, Thermometer, Droplets, Heart, Wind } from 'lucide-react';
import { VitalSign } from '@/lib/firebase/types';
import { format } from 'date-fns';

interface VitalsTrendChartProps {
  vitals: VitalSign[];
}

const VitalsTrendChart: React.FC<VitalsTrendChartProps> = ({ vitals }) => {
  // Sort vitals by time ascending for the chart
  const sortedVitals = useMemo(() => {
    return [...vitals].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    ).slice(-15); // Show last 15 points
  }, [vitals]);

  if (sortedVitals.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <Activity className="text-slate-300 mb-4 animate-pulse" size={48} />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Insufficient Data for Trends</p>
        <p className="text-slate-300 text-[10px] mt-1">Record at least 2 vitals to generate a baseline</p>
      </div>
    );
  }

  // Chart Dimensions
  const width = 800;
  const height = 200;
  const padding = 40;

  // Helper to normalize values
  const getPoints = (getValue: (v: VitalSign) => number | undefined, minVal: number, maxVal: number) => {
    return sortedVitals.map((v, i) => {
      const val = getValue(v);
      if (val === undefined) return null;
      
      const x = padding + (i / (sortedVitals.length - 1)) * (width - 2 * padding);
      const normalizedY = ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);
      const y = height - padding - normalizedY;
      return { x, y, val };
    }).filter(p => p !== null) as { x: number; y: number; val: number }[];
  };

  // Define Vital Streams
  const streams = [
    { 
      name: 'Pulse', 
      color: '#ef4444', 
      icon: <Heart size={14} />, 
      points: getPoints(v => v.pulse, 40, 140),
      suffix: 'bpm'
    },
    { 
      name: 'Systolic', 
      color: '#06b6d4', 
      icon: <Activity size={14} />, 
      points: getPoints(v => v.systolic, 80, 200),
      suffix: 'mmHg'
    },
    { 
      name: 'Diastolic', 
      color: '#3b82f6', 
      icon: <Activity size={14} />, 
      points: getPoints(v => v.diastolic, 40, 120),
      suffix: 'mmHg'
    },
    { 
      name: 'Temp', 
      color: '#f59e0b', 
      icon: <Thermometer size={14} />, 
      points: getPoints(v => v.temperature, 95, 105),
      suffix: '°F'
    },
    { 
      name: 'SpO2', 
      color: '#10b981', 
      icon: <Wind size={14} />, 
      points: getPoints(v => v.o2sat, 85, 100),
      suffix: '%'
    }
  ];

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-quro-charcoal uppercase tracking-tight flex items-center gap-3">
            <div className="p-2 bg-quro-50 rounded-xl">
              <Activity className="text-quro-teal" size={18} />
            </div>
            Longitudinal Vitals Trend
          </h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 ml-12">
            Last {sortedVitals.length} recorded readings — Normalized Baseline
          </p>
        </div>
        
        <div className="flex gap-2">
          {streams.map(s => (
            <div key={s.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-64 w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid Lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line 
              key={i}
              x1={padding}
              y1={padding + (i * (height - 2 * padding)) / 4}
              x2={width - padding}
              y2={padding + (i * (height - 2 * padding)) / 4}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Lines */}
          {streams.map(stream => {
            const d = stream.points.length > 0 
              ? `M ${stream.points.map(p => `${p.x},${p.y}`).join(' L ')}` 
              : '';
            
            return (
              <g key={stream.name}>
                <path 
                  d={d} 
                  fill="none" 
                  stroke={stream.color} 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 4px 6px ${stream.color}33)` }}
                />
                {stream.points.map((p, idx) => (
                  <circle 
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="white"
                    stroke={stream.color}
                    strokeWidth="2"
                    className="hover:r-6 cursor-pointer transition-all"
                  />
                ))}
              </g>
            );
          })}

          {/* Time Labels */}
          {sortedVitals.map((v, i) => {
            const x = padding + (i / (sortedVitals.length - 1)) * (width - 2 * padding);
            return (
              <text 
                key={i}
                x={x}
                y={height - 5}
                fontSize="8"
                fontWeight="900"
                fill="#cbd5e1"
                textAnchor="middle"
                className="uppercase tracking-widest"
              >
                {format(new Date(v.recorded_at), 'HH:mm')}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        {streams.map(s => {
          const latest = s.points[s.points.length - 1]?.val;
          const prev = s.points[s.points.length - 2]?.val;
          const trend = latest && prev ? latest - prev : 0;
          
          return (
            <div key={s.name} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-2 text-slate-400 group-hover:text-quro-charcoal transition-colors">
                <div style={{ color: s.color }}>{s.icon}</div>
                <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-quro-charcoal">{latest || '--'}</span>
                <span className="text-[10px] font-bold text-slate-400">{s.suffix}</span>
              </div>
              {trend !== 0 && (
                <div className={`mt-1 text-[10px] font-black ${trend > 0 ? 'text-rose-500' : 'text-teal-500'}`}>
                  {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} change
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VitalsTrendChart;
