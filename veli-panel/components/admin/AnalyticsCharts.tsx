'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, LabelList } from 'recharts';

interface AnalyticsChartsProps {
    weeklyData: { name: string; value: number }[];
    monthlyData: { name: string; value: number }[];
    revenueTrend: { date: string; amount: number }[];
}

const COLORS = {
    primary: '#6366f1',   // Indigo 500
    secondary: '#8b5cf6', // Violet 500
    success: '#10b981',   // Emerald 500
    warning: '#f59e0b',   // Amber 500
    dark: '#1e1b4b',      // Indigo 950
    grid: '#f1f5f9',      // Slate 100
    text: '#64748b'       // Slate 500
};

const WEEKLY_GRADIENT = [
    '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#c7d2fe', '#ddd6fe', '#e2e8f0', '#e2e8f0'
];

const MONTHLY_GRADIENT = [
    '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ddd6fe', '#e9d5ff', '#e2e8f0', '#e2e8f0'
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur-sm">
                <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
                <p className="text-lg font-bold">
                    {typeof payload[0].value === 'number'
                        ? payload[0].value.toLocaleString('tr-TR')
                        : payload[0].value}
                    <span className="text-sm font-normal text-slate-400 ml-1">adet</span>
                </p>
            </div>
        );
    }
    return null;
};

const RevenueTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur-sm">
                <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
                <p className="text-lg font-bold">
                    ₺{typeof payload[0].value === 'number'
                        ? payload[0].value.toLocaleString('tr-TR')
                        : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
        <text
            x={x + width + 8}
            y={y + height / 2}
            fill="#475569"
            fontSize={13}
            fontWeight={600}
            dominantBaseline="middle"
        >
            {value} adet
        </text>
    );
};

export default function AnalyticsCharts({ weeklyData, monthlyData, revenueTrend }: AnalyticsChartsProps) {
    return (
        <div className="space-y-6">
            {/* Top Products Grid - NOW ON TOP */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Weekly Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Haftalık En Çok Satanlar</h3>
                            <p className="text-xs text-slate-400">Bu haftanın popüler ürünleri</p>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} layout="vertical" margin={{ top: 0, right: 70, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: COLORS.text, fontWeight: 500 }}
                                    width={100}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                                    {weeklyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={WEEKLY_GRADIENT[index] || '#e2e8f0'} />
                                    ))}
                                    <LabelList dataKey="value" content={renderCustomBarLabel} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Aylık En Çok Satanlar</h3>
                            <p className="text-xs text-slate-400">Bu ayın popüler ürünleri</p>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} layout="vertical" margin={{ top: 0, right: 70, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: COLORS.text, fontWeight: 500 }}
                                    width={100}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.04)' }} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                                    {monthlyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={MONTHLY_GRADIENT[index] || '#e2e8f0'} />
                                    ))}
                                    <LabelList dataKey="value" content={renderCustomBarLabel} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Area Chart - NOW ON BOTTOM */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Gelir Trendi</h3>
                            <p className="text-xs text-slate-400">Son 7 günlük satış performansı</p>
                        </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-semibold">
                        Canlı Veri
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: COLORS.text, fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: COLORS.text, fontSize: 12 }}
                                tickFormatter={(value) => `₺${value}`}
                            />
                            <Tooltip content={<RevenueTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke={COLORS.success}
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
