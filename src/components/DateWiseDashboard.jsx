import React, { useState, useEffect } from 'react';
import { fetchDatewiseKpi } from '../api';
import { Calendar, Activity, ChevronRight, ChevronLeft, Download } from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

const DateWiseDashboard = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getYesterday());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchDatewiseKpi(selectedDate);
                setData(result || []);
            } catch (err) {
                setError(err.message || 'Error loading date-wise KPI data');
            } finally {
                setLoading(false);
            }
        };

        if (selectedDate) {
            loadData();
            setCurrentPage(1); // Reset page on date change
        }
    }, [selectedDate]);

    // Pagination Calculation
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);



    const exportToCSV = () => {
        if (!data || data.length === 0) return;

        const headers = ['District Name', 'Total Achieved'];
        const csvRows = data.map(item => [
            item.district_name || 'N/A',
            item.total_achieved || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Datewise_KPI_Report_${selectedDate || 'All'}.csv`);
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


    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen transition-colors">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        Date-wise Achievement
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Detailed performance tracking by specific dates</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-300 ml-2">Select Date:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={getYesterday()}
                            className="bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-5">
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
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-12 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Calendar className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm">No district data available for the selected date.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((row, idx) => (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between mt-auto">
                        <span className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(startIndex + itemsPerPage, data.length)}</span> of <span className="font-semibold text-slate-700">{data.length}</span> entries
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-slate-700 px-3 py-1 bg-slate-50 rounded-md border border-slate-100">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-500 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ReactTooltip id="datewise-tooltip" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', padding: '12px', zIndex: 1000 }} />
        </div>
    );
};

export default DateWiseDashboard;
