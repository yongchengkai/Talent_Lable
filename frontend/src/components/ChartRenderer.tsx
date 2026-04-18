import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'funnel';
  title?: string;
  data: Array<Record<string, any>>;
  xField?: string;
  yField?: string;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#f97316', '#6366f1'];

function buildOption(chart: ChartData): Record<string, any> {
  const { type, title, data } = chart;

  const base: Record<string, any> = {
    title: title ? { text: title, textStyle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600 }, left: 'center', top: 8 } : undefined,
    tooltip: { trigger: type === 'pie' ? 'item' : 'axis', backgroundColor: 'rgba(15,15,30,0.9)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#e2e8f0' } },
    color: COLORS,
    grid: { left: 48, right: 24, top: title ? 48 : 24, bottom: 32 },
  };

  if (type === 'pie') {
    return {
      ...base,
      series: [{
        type: 'pie', radius: ['40%', '70%'], center: ['50%', '55%'],
        data: data.map(d => ({ name: d.name, value: d.value })),
        label: { color: '#e2e8f0', fontSize: 12 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      }],
    };
  }

  if (type === 'funnel') {
    return {
      ...base,
      series: [{
        type: 'funnel', left: '10%', width: '80%', top: title ? 48 : 24, bottom: 24,
        data: data.map(d => ({ name: d.name, value: d.value })),
        label: { color: '#e2e8f0' },
      }],
    };
  }

  if (type === 'radar') {
    const indicator = data.map(d => ({ name: d.name, max: d.max || Math.max(...data.map(i => i.value)) * 1.2 }));
    return {
      ...base,
      radar: { indicator, axisName: { color: '#e2e8f0' }, splitArea: { areaStyle: { color: 'transparent' } }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
      series: [{ type: 'radar', data: [{ value: data.map(d => d.value) }], areaStyle: { opacity: 0.2 } }],
    };
  }

  // bar / line / scatter
  const xField = chart.xField || 'name';
  const yField = chart.yField || 'value';
  const categories = data.map(d => d[xField]);
  const values = data.map(d => d[yField]);

  return {
    ...base,
    xAxis: { type: 'category', data: categories, axisLabel: { color: '#94a3b8', fontSize: 11 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
    yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    series: [{
      type, data: values,
      ...(type === 'bar' ? { barWidth: '50%', itemStyle: { borderRadius: [4, 4, 0, 0] } } : {}),
      ...(type === 'line' ? { smooth: true, areaStyle: { opacity: 0.15 } } : {}),
    }],
  };
}

const ChartRenderer: React.FC<{ code: string; isDark?: boolean }> = ({ code, isDark = true }) => {
  const option = useMemo(() => {
    try {
      const chart: ChartData = JSON.parse(code);
      if (!chart.type || !chart.data) return null;
      return buildOption(chart);
    } catch {
      return null;
    }
  }, [code]);

  if (!option) {
    return <pre style={{ padding: 10, fontSize: 12, color: '#ef4444' }}>图表数据解析失败</pre>;
  }

  return (
    <div style={{ margin: '8px 0', borderRadius: 8, overflow: 'hidden', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
      <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'svg' }} />
    </div>
  );
};

export default ChartRenderer;
