import React, { useState, useEffect } from 'react';
import { fetchAchievementByDateRange } from '../service/datalayer';
import { Calendar, Activity, ChevronRight, ChevronLeft, Download, Filter } from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

const getFormattedDate = (date) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getQuickDates = (range) => {
    const today = new Date();
    const fdate = new Date();

    switch (range) {
        case 'today':
            break;
        case 'current-week':
            const day = fdate.getDay();
            const diff = fdate.getDate() - day + (day === 0 ? -6 : 1);
            fdate.setDate(diff);
            break;
        case 'last-two-weeks':
            fdate.setDate(fdate.getDate() - 13); // 13 back + today = 14 days
            break;
        case 'one-month':
            fdate.setDate(fdate.getDate() - 30); // 30 back + today = 31 days
            break;
        default:
            break;
    }

    return {
        fdate: getFormattedDate(fdate),
        tdate: getFormattedDate(today)
    };
};

const DateWiseDashboard = () => {
    const [data, setData] = useState([]);
    const [dateWiseData, setDateWiseData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('today');
    const [fdate, setFdate] = useState(getQuickDates('today').fdate);
    const [tdate, setTdate] = useState(getQuickDates('today').tdate);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchAchievementByDateRange(fdate, tdate);

                const aggregated = result.reduce((acc, curr) => {
                    const district = curr.district_name || 'N/A';
                    if (!acc[district]) {
                        acc[district] = { ...curr };
                    } else {
                        acc[district].total_achieved = (acc[district].total_achieved || 0) + (curr.total_achieved || 0);
                        acc[district].total_target = (acc[district].total_target || 0) + (curr.total_target || 0);
                    }
                    return acc;
                }, {});

                setData(Object.values(aggregated));

                // Date-wise aggregation
                const dateAggregatedObj = {};
                result.forEach(curr => {
                    if (!curr.achievement_date) return;
                    const d = new Date(curr.achievement_date);
                    if (isNaN(d.getTime())) return;
                    const dateKey = d.toISOString().split('T')[0];
                    if (!dateAggregatedObj[dateKey]) {
                        dateAggregatedObj[dateKey] = {
                            date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                            timestamp: d.getTime(),
                            total_achieved: 0
                        };
                    }
                    dateAggregatedObj[dateKey].total_achieved += (curr.total_achieved || 0);
                });

                const sortedDateData = Object.values(dateAggregatedObj).sort((a, b) => a.timestamp - b.timestamp);
                setDateWiseData(sortedDateData);
            } catch (err) {
                setError(err.message || 'Error loading date-wise KPI data');
            } finally {
                setLoading(false);
            }
        };

        if (fdate && tdate) {
            loadData();
        }
    }, [fdate, tdate]);

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        if (filter !== 'custom') {
            const { fdate: newFdate, tdate: newTdate } = getQuickDates(filter);
            setFdate(newFdate);
            setTdate(newTdate);
        }
    };

    const exportToCSV = () => {
        if (!data || data.length === 0) return;

        const headers = ['District Name', 'Total Achieved'];
        const csvRows = data.map(item => [
            item.district_name || 'N/A',
            item.total_achieved || 0
        ]);

        csvRows.push([
            'TOTAL',
            totalOverallAchieved || 0
        ]);

        const csvContent = [
            `Report:, Datewise Achievement`,
            `Date Range:, ${fdate} to ${tdate}`,
            ``,
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Datewise_KPI_Report_${fdate}_to_${tdate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-xl font-semibold text-slate-500 animate-pulse">Loading Date-wise Data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-lg font-medium text-rose-500 bg-rose-50 px-6 py-4 rounded-xl border border-rose-100">
                    {error}
                </div>
            </div>
        );
    }
    const totalOverallAchieved = data.reduce((sum, item) => sum + (item.total_achieved || 0), 0);
    const totalOverallTarget = data.reduce((sum, item) => sum + (item.total_target || 0), 0);
    const totalAchievementRate = totalOverallTarget > 0 ? ((totalOverallAchieved / totalOverallTarget) * 100).toFixed(2) : 0;
    const totalDays = dateWiseData.length || 1;
    const avgEntry = totalDays > 0 ? Math.round(totalOverallAchieved / totalDays) : 0;


    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen transition-colors">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Date-wise Achievement
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Detailed performance tracking by specific dates</p>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 max-w-full w-full md:w-auto mt-4 md:mt-0">
                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'current-week', label: 'Current Week' },
                        { id: 'last-two-weeks', label: 'Last Two Weeks' },
                        { id: 'one-month', label: 'One Month' }
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => handleFilterChange(filter.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap shrink-0 ${activeFilter === filter.id
                                ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}

                    <button
                        onClick={exportToCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
                    >
                        <Download className="w-4 h-4 shrink-0" />
                        Export
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                {/* Total Achievement Card */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-l-2xl" />
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-5 p-6 pl-8">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 rounded-xl shadow-md shadow-indigo-200/50 dark:shadow-none shrink-0">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Achievement</p>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">{totalOverallAchieved.toLocaleString()}</h2>
                        </div>
                    </div>
                </div>

                {/* Total Days Card */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-l-2xl" />
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-5 p-6 pl-8">
                        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 p-3.5 rounded-xl shadow-md shadow-emerald-200/50 dark:shadow-none shrink-0">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Days</p>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">{totalDays}</h2>
                        </div>
                    </div>
                </div>

                {/* Average Entry Card */}
                <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-l-2xl" />
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-5 p-6 pl-8">
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3.5 rounded-xl shadow-md shadow-amber-200/50 dark:shadow-none shrink-0">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Avg Entry / Day</p>
                            <h2 className="text-3xl font-black text-amber-500 dark:text-amber-400 leading-none">{avgEntry.toLocaleString()}</h2>
                        </div>
                    </div>
                </div>

            </div>

            {/* Trend Chart Section */}
            {dateWiseData.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600"></span>
                            Daily Achievement Trend
                        </h3>
                        {avgEntry > 0 && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-full">
                                <span className="inline-block w-5 border-t-2 border-dashed border-amber-500"></span>
                                Avg / Day: {avgEntry.toLocaleString()}
                            </div>
                        )}
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dateWiseData} margin={{ top: 20, right: 40, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={45}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px 14px', fontSize: 13 }}
                                    cursor={{ stroke: '#c7d2fe', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total_achieved"
                                    name="Total Achieved"
                                    stroke="#4f46e5"
                                    strokeWidth={2.5}
                                    dot={{ fill: '#ffffff', strokeWidth: 2, r: 4, stroke: '#4f46e5' }}
                                    activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                                />
                                {avgEntry > 0 && (
                                    <ReferenceLine
                                        y={avgEntry}
                                        stroke="#f59e0b"
                                        strokeWidth={1.5}
                                        strokeDasharray="7 4"
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Chart Section */}
            {data.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600"></span>
                            District vs Total Achieved
                        </h3>
                        {avgEntry > 0 && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-full">
                                <span className="inline-block w-5 border-t-2 border-dashed border-amber-500"></span>
                                Avg / Day: {avgEntry.toLocaleString()}
                            </div>
                        )}
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 20, right: 40, left: 10, bottom: 80 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="district_name"
                                    angle={-60}
                                    textAnchor="end"
                                    height={100}
                                    interval={0}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500, dy: 18 }}
                                    tickFormatter={(value) => value ? (value.length > 15 ? value.substring(0, 15) + '...' : value) : ''}
                                />
                                <YAxis
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={45}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '10px 14px', fontSize: 13 }}
                                    cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                                />
                                <Bar
                                    dataKey="total_achieved"
                                    name="Total Achieved"
                                    fill="url(#barGradient)"
                                    radius={[5, 5, 0, 0]}
                                    barSize={36}
                                />
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                {avgEntry > 0 && (
                                    <ReferenceLine
                                        y={avgEntry}
                                        stroke="#f59e0b"
                                        strokeWidth={1.5}
                                        strokeDasharray="7 4"
                                    />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-slate-800">District Records</h3>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        {data.length} Districts Logged
                    </span>
                </div>

                <div className="overflow-x-auto min-h-[300px] no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/90 backdrop-blur z-10 w-1/2">
                                    District
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 bg-slate-50/90 backdrop-blur z-10 text-right w-1/2">
                                    Total Achieved
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Calendar className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm">No district data available for the selected dates.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {data.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-indigo-50/30 transition-colors group"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 flex items-center gap-3">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors"></span>
                                                {row.district_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-indigo-600">
                                                {row.total_achieved ? row.total_achieved.toLocaleString() : 0}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total Row */}
                                    <tr className="bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-900 border-t-2 border-slate-300 flex items-center gap-3">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                            TOTAL
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-black text-indigo-700 border-t-2 border-slate-300">
                                            {totalOverallAchieved ? totalOverallAchieved.toLocaleString() : 0}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ReactTooltip id="datewise-tooltip" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', padding: '12px', zIndex: 1000 }} />
        </div>
    );
};

export default DateWiseDashboard;
