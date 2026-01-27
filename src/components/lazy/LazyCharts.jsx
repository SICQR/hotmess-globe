import React, { Suspense, lazy } from 'react';
import { Skeleton } from '../ui/Skeleton';

// Lazy load recharts components
const RechartsModule = lazy(() => import('recharts').then(module => ({
  default: {
    BarChart: module.BarChart,
    Bar: module.Bar,
    LineChart: module.LineChart,
    Line: module.Line,
    PieChart: module.PieChart,
    Pie: module.Pie,
    Cell: module.Cell,
    XAxis: module.XAxis,
    YAxis: module.YAxis,
    CartesianGrid: module.CartesianGrid,
    Tooltip: module.Tooltip,
    Legend: module.Legend,
    ResponsiveContainer: module.ResponsiveContainer,
    AreaChart: module.AreaChart,
    Area: module.Area,
  }
})));

// Chart skeleton component
const ChartSkeleton = ({ height = 300 }) => (
  <div className="w-full animate-pulse" style={{ height }}>
    <div className="flex items-end justify-between h-full gap-2 px-4 pb-8">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-800 rounded-t"
          style={{
            width: '12%',
            height: `${30 + Math.random() * 60}%`,
          }}
        />
      ))}
    </div>
    <div className="flex justify-between px-4 mt-2">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <span key={day} className="text-xs text-zinc-600">{day}</span>
      ))}
    </div>
  </div>
);

// Export a wrapper component that provides lazy-loaded charts
export const LazyChartProvider = ({ children, fallback }) => (
  <Suspense fallback={fallback || <ChartSkeleton />}>
    {children}
  </Suspense>
);

// Wrapper for individual chart types with built-in suspense
export const withLazyChart = (ChartComponent, props) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
    <ChartComponent {...props} />
  </Suspense>
);

// Pre-built lazy chart components
export const LazyBarChartWrapper = ({ children, ...props }) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
    {children}
  </Suspense>
);

export const LazyLineChartWrapper = ({ children, ...props }) => (
  <Suspense fallback={<ChartSkeleton height={props.height || 300} />}>
    {children}
  </Suspense>
);

export { ChartSkeleton };
