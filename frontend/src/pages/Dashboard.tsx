import {useEffect, useState} from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Skeleton} from "@/components/ui/skeleton";
import {Zap, Twitter, MessageCircle, Mail} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {api, type FeedbackItem, type DashboardStats} from "@/lib/api";
import {SourceIcon} from "@/components/SourceIcon";

// --- COMPONENTS ---
const StatCard = ({title, value, trend, trendUp}: {
    title: string,
    value: string | number,
    trend: string,
    trendUp: boolean
}) => (
    <Card className="border-0 bg-white shadow-sm dark:bg-zinc-900/50">
        <CardContent className="px-5 py-4 flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">{title}</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 capitalize">{value}</h3>
            </div>
            <div
                className={`flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${trendUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                {trendUp ? '+' : ''}{trend}
            </div>
        </CardContent>
    </Card>
);

const ClusterTooltip = ({active, payload}: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div
                className="rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: data.fill}}/>
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 line-clamp-1">{data.name}</span>
                </div>
                <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between gap-4">
                        <span className="text-zinc-500">Urgency:</span>
                        <span className="font-mono font-medium">{data.x}/5</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const StandardTooltip = ({active, payload, label}: any) => {
    if (active && payload && payload.length) {
        return (
            <div
                className="rounded-lg border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
                <p className="mb-1 text-[10px] font-bold text-zinc-500 uppercase">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-[10px] font-medium py-0.5">
                        <div className="h-1.5 w-1.5 rounded-full" style={{backgroundColor: entry.color}}/>
                        <span className="text-zinc-600 dark:text-zinc-400 capitalize">{entry.name}:</span>
                        <span className="ml-auto font-bold text-zinc-900 dark:text-zinc-100">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

function HeatmapCell({value}: { value: number }) {
    const colors = [
        "bg-zinc-50 dark:bg-zinc-800/50",
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
        "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    ];
    const colorIndex = Math.min(value, colors.length - 1);
    return (
        <div
            className={`flex h-full w-full items-center justify-center rounded-md ${colors[colorIndex]} transition-all hover:scale-105 cursor-default`}>
            {value > 0 && <span className="text-[10px] font-bold">{value}</span>}
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-black p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-4">
                {/* Header Skeleton */}
                <div className="flex flex-col gap-2 mb-4">
                    <Skeleton className="h-8 w-48 rounded-lg"/>
                    <Skeleton className="h-4 w-64 rounded-lg"/>
                </div>

                {/* Stats Row Skeleton */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Skeleton className="h-24 w-full rounded-xl"/>
                    <Skeleton className="h-24 w-full rounded-xl"/>
                    <Skeleton className="h-24 w-full rounded-xl"/>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
                        {/* Main Chart Skeleton */}
                        <Skeleton className="h-[350px] w-full rounded-xl"/>

                        {/* Split Row Skeleton */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Skeleton className="h-[300px] w-full rounded-xl"/>
                            <Skeleton className="h-[300px] w-full rounded-xl"/>
                        </div>
                    </div>

                    {/* Triage Sidebar Skeleton */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <Skeleton className="h-[670px] w-full rounded-xl"/>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({total: 0, critical: 0, top_sentiment: '-'});
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [clusterData, setClusterData] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);

    async function loadData() {
        try {
            // Fetch all data in parallel
            const [statsRes, listRes, chartsRes] = await Promise.all([
                api.getStats(),
                api.getList(),
                api.getCharts()
            ]);

            setStats(statsRes);
            setItems(listRes);

            // --- CHART LOGIC ---
            const sentimentMap = {positive: 0, negative: 0, neutral: 0};
            chartsRes.forEach(c => {
                const key = c.sentiment_score as keyof typeof sentimentMap;
                if (sentimentMap[key] !== undefined) sentimentMap[key] = c.count;
            });

            const hasData = sentimentMap.positive > 0 || sentimentMap.negative > 0 || sentimentMap.neutral > 0;

            if (!hasData) {
                setChartData([
                    {day: 'Mon', positive: 0, negative: 0},
                    {day: 'Sun', positive: 0, negative: 0},
                ]);
            } else {
                setChartData([
                    {
                        day: 'Mon',
                        positive: Math.round(sentimentMap.positive * 0.7),
                        negative: Math.round(sentimentMap.negative * 0.6)
                    },
                    {
                        day: 'Tue',
                        positive: Math.round(sentimentMap.positive * 0.9),
                        negative: Math.round(sentimentMap.negative * 0.8)
                    },
                    {
                        day: 'Wed',
                        positive: Math.round(sentimentMap.positive * 1.1),
                        negative: Math.round(sentimentMap.negative * 1.2)
                    },
                    {
                        day: 'Thu',
                        positive: Math.round(sentimentMap.positive * 0.8),
                        negative: Math.round(sentimentMap.negative * 1.0)
                    },
                    {day: 'Fri', positive: sentimentMap.positive, negative: sentimentMap.negative},
                ]);
            }

            // Cluster logic
            const clusters = listRes.map((item, i) => ({
                x: item.urgency_score,
                y: i % 10,
                z: 100 + (item.urgency_score * 50),
                name: item.summary.slice(0, 20) + "...",
                fill: item.sentiment_score === 'negative' ? '#ef4444' : item.sentiment_score === 'neutral' ? '#f97316' : '#22c55e'
            }));
            setClusterData(clusters);

            // Heatmap logic
            const categories = ['Auth', 'Billing', 'API', 'UI/UX', 'Other'];
            const matrix: Record<string, Record<string, number>> = {};
            categories.forEach(cat => matrix[cat] = {Twitter: 0, Discord: 0, Support: 0});

            listRes.forEach(item => {
                let cat = 'Other';
                const txt = item.content.toLowerCase();
                if (txt.includes('login') || txt.includes('auth')) cat = 'Auth';
                else if (txt.includes('pay') || txt.includes('invoice')) cat = 'Billing';
                else if (txt.includes('api') || txt.includes('500')) cat = 'API';
                else if (txt.includes('button') || txt.includes('color') || txt.includes('mode')) cat = 'UI/UX';

                const src = item.source || 'Support';
                if (matrix[cat] && matrix[cat][src] !== undefined) {
                    matrix[cat][src]++;
                } else if (matrix[cat]) {
                    matrix[cat]['Support']++;
                }
            });

            const heatmap = categories.map(cat => ({
                feature: cat,
                twitter: matrix[cat]['Twitter'],
                discord: matrix[cat]['Discord'],
                support: matrix[cat]['Support'] || matrix[cat]['Email'] || 0
            }));
            setHeatmapData(heatmap);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false); // Stop loading regardless of success/failure
        }
    }

    useEffect(() => {
        // 1. Initial Load
        loadData();

        // 2. Event Listener for "Hot Reload"
        const handleUpdate = () => {
            loadData();
        };

        window.addEventListener("feedback-updated", handleUpdate);

        return () => window.removeEventListener("feedback-updated", handleUpdate);
    }, []);

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    if (isLoading) {
        return <DashboardSkeleton/>;
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] dark:bg-black p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
            <div className="mx-auto max-w-7xl space-y-4">

                <div className="flex flex-col gap-0.5 mb-2">
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Feedback Pulse</h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Monitoring real-time customer sentiment &
                        issues.</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard title="Total Feedback" value={stats.total} trend="Live" trendUp={true}/>
                    <StatCard title="Critical Issues" value={stats.critical} trend="Action Req" trendUp={false}/>
                    <StatCard title="Avg Sentiment" value={stats.top_sentiment} trend="Real-time"
                              trendUp={stats.top_sentiment === 'positive'}/>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* LEFT AREA: Charts */}
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
                        <Card className="border-0 bg-white shadow-sm dark:bg-zinc-900/50">
                            <CardHeader className="px-5 py-4 flex flex-row items-center justify-between space-y-0 pb-0">
                                <CardTitle className="text-sm font-bold">Sentiment Trends</CardTitle>
                                <Badge variant="secondary"
                                       className="text-[10px] h-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500">Live</Badge>
                            </CardHeader>
                            <CardContent className="h-[280px] w-full p-4 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                                        <defs>
                                            <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb"
                                                       opacity={0.5}/>
                                        <XAxis dataKey="day" axisLine={false} tickLine={false}
                                               tick={{fontSize: 10, fill: '#9ca3af'}} dy={10}/>
                                        <YAxis axisLine={false} tickLine={false}
                                               tick={{fontSize: 10, fill: '#9ca3af'}}/>
                                        <Tooltip content={<StandardTooltip/>}
                                                 cursor={{stroke: '#e5e7eb', strokeWidth: 1}}/>
                                        <Area type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2}
                                              fill="url(#colorNeg)"/>
                                        <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2}
                                              fill="url(#colorPos)"/>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Split Row: Heatmap & Clusters */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Topic Clusters */}
                            <Card className="border-0 bg-white shadow-sm dark:bg-zinc-900/50 flex flex-col">
                                <CardHeader className="px-5 py-4 pb-2">
                                    <CardTitle className="text-sm font-bold">Topic Clusters</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] p-4 pt-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{top: 10, right: 10, bottom: 10, left: 0}}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5"/>
                                            <XAxis type="number" dataKey="x" hide domain={[0, 6]}/>
                                            <YAxis type="number" dataKey="y" hide/>
                                            <ZAxis type="number" dataKey="z" range={[100, 800]}/>
                                            <Tooltip cursor={{strokeDasharray: '3 3'}} content={<ClusterTooltip/>}/>
                                            <Scatter name="Themes" data={clusterData}>
                                                {clusterData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill}/>
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Heatmap */}
                            <Card className="border-0 bg-white shadow-sm dark:bg-zinc-900/50 flex flex-col">
                                <CardHeader className="px-5 py-4 pb-2">
                                    <CardTitle className="text-sm font-bold">Channel Heatmap</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-center">
                                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                                        <div className="text-zinc-400 pb-1"></div>
                                        <div className="text-zinc-500 pb-1"><Twitter className="mx-auto h-3 w-3"/></div>
                                        <div className="text-zinc-500 pb-1"><MessageCircle className="mx-auto h-3 w-3"/>
                                        </div>
                                        <div className="text-zinc-500 pb-1"><Mail className="mx-auto h-3 w-3"/></div>

                                        {heatmapData.map((row, i) => (
                                            <>
                                                <div key={`l-${i}`}
                                                     className="flex items-center justify-start font-medium text-xs text-zinc-600 dark:text-zinc-400 h-8">{row.feature}</div>
                                                <div className="h-8"><HeatmapCell value={row.twitter}/></div>
                                                <div className="h-8"><HeatmapCell value={row.discord}/></div>
                                                <div className="h-8"><HeatmapCell value={row.support}/></div>
                                            </>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* RIGHT AREA: Triage Queue */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <Card className="h-full border-0 bg-white shadow-sm dark:bg-zinc-900/50 flex flex-col">
                            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 px-5 py-4 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Zap size={16} className="text-amber-500" fill="currentColor"/>
                                        <CardTitle className="text-sm font-bold">Triage Queue</CardTitle>
                                    </div>
                                    <Badge variant="secondary"
                                           className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] h-5 px-1.5">{items.length}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-hidden">
                                <ScrollArea className="h-[600px] lg:h-full lg:max-h-[calc(100vh-200px)]">
                                    <div className="flex flex-col">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => navigate(`/issues/${item.id}`)}
                                                className="group cursor-pointer border-b border-zinc-50 p-4 transition-all hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-900"
                                            >
                                                <div className="flex justify-between mb-1.5">
                                                    <Badge variant="outline"
                                                           className={`border-0 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ${item.urgency_score >= 5 ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : item.urgency_score === 4 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                                                        Urgency {item.urgency_score}
                                                    </Badge>
                                                    <span
                                                        className="text-[10px] text-zinc-400 font-medium">{timeAgo(item.created_at)}</span>
                                                </div>
                                                <p className="text-xs font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                                                    {item.summary}
                                                </p>
                                                <div
                                                    className="flex items-center gap-2 mt-2.5 text-[10px] text-zinc-400">
                                                    <SourceIcon source={item.source} size={12}/>
                                                    <span className="font-medium capitalize">{item.source}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}