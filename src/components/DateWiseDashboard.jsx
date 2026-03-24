import React, { useState, useEffect } from 'react';
import { fetchAchievementByDateRange } from '../service/datalayer';
import { Calendar, Activity, ChevronRight, ChevronLeft, Download, Filter } from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const getFormattedDate = (date) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getQuickDates = (range) => {
    const today = new Date();
    const fdate = new Date();
    
    switch(range) {
        case 'today':
            break;
        case 'current-week':
            const day = fdate.getDay();
            const diff = fdate.getDate() - day + (day === 0 ? -6 : 1);
            fdate.setDate(diff);
            break;
        case 'last-two-weeks':
            fdate.setDate(fdate.getDate() - 14);
            break;
        case 'one-month':
            fdate.setMonth(fdate.getMonth() - 1);
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
                <div className="flex flex-col items-end gap-3 max-w-2xl">
                    <div className="flex flex-wrap justify-end gap-2">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'current-week', label: 'Current Week' },
                            { id: 'last-two-weeks', label: 'Last Two Weeks' },
                            { id: 'one-month', label: 'One Month' },
                            { id: 'custom', label: 'Custom' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => handleFilterChange(filter.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                                    activeFilter === filter.id 
                                        ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none' 
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 mt-1">
                        {activeFilter === 'custom' && (
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 ml-2">From:</label>
                                <input
                                    type="date"
                                    value={fdate}
                                    onChange={(e) => setFdate(e.target.value)}
                                    max={getFormattedDate(new Date())}
                                    className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <label className="text-sm font-bold text-slate-600 dark:text-slate-300 ml-2">To:</label>
                                <input
                                    type="date"
                                    value={tdate}
                                    onChange={(e) => setTdate(e.target.value)}
                                    max={getFormattedDate(new Date())}
                                    className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        )}
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-5 py-2-[10px] bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95 h-full"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-5 hover:shadow-md transition-shadow">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl">
                        <Activity className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Achievement</p>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalOverallAchieved.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            {data.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        District vs Total Achieved
                    </h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="district_name"
                                    angle={-60}
                                    textAnchor="end"
                                    height={100}
                                    interval={0}
                                    tick={{ fill: '#64748b', fontSize: 10, dy: 18 }}
                                    tickFormatter={(value) => value ? (value.length > 15 ? value.substring(0, 15) + '...' : value) : ''}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar
                                    dataKey="total_achieved"
                                    name="Total Achieved"
                                    fill="#4f46e5"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                />
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
