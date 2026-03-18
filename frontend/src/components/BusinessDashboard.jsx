import React, { useState, useEffect } from 'react';
import {
    fetchBusinessFind10k,
    fetchBusinessKnowledgeMmry,
    fetchBusinessBefore10k,
    fetchBusinessUse10k,
    fetchBusinessUsed10kType
} from '../api';
import { Briefcase, Activity, TrendingUp, HelpCircle, DollarSign, Award, Download, Building, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const PaginatedTable = ({ data, columns, title }) => {
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const currentItems = data.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="flex flex-col flex-1 mt-6 border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
            </div>
            <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full text-[11px] min-w-[400px]">
                    <thead className="bg-slate-100/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className={`px-4 py-2 text-slate-500 dark:text-slate-400 font-bold uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {currentItems.map((item, i) => (
                            <tr key={i} className="hover:bg-white dark:hover:bg-slate-700/30 transition-colors">
                                {columns.map((col, j) => (
                                    <td key={j} className={`px-4 py-2 text-slate-700 dark:text-slate-200 font-medium ${j === 0 ? 'text-left' : 'text-right'}`}>{item[col.key]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                    <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Page {page} / {totalPages || 1}</span>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

const BusinessDashboard = () => {
    const [find10kData, setFind10kData] = useState([]);
    const [knowledgeData, setKnowledgeData] = useState([]);
    const [before10kData, setBefore10kData] = useState([]);
    const [use10kData, setUse10kData] = useState([]);
    const [used10kTypeData, setUsed10kTypeData] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                const [d1, d2, d3, d4, d5] = await Promise.all([
                    fetchBusinessFind10k(),
                    fetchBusinessKnowledgeMmry(),
                    fetchBusinessBefore10k(),
                    fetchBusinessUse10k(),
                    fetchBusinessUsed10kType()
                ]);

                setFind10kData(d1 || []);
                setKnowledgeData(d2 || []);
                setBefore10kData(d3 || []);
                setUse10kData(d4 || []);
                setUsed10kTypeData(d5 || []);
            } catch (err) {
                setError('Failed to load business KPI data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Loading Comprehensive Business Insights...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-lg font-medium text-rose-500 bg-rose-50 px-6 py-4 rounded-xl border border-rose-100 flex items-center gap-3">
                    {error}
                </div>
            </div>
        );
    }

    const transformForStackedBar = (data, fields) => {
        return data.map(item => {
            const row = { name: item.district_name };
            fields.forEach(f => row[f] = item[f] || 0);
            return row;
        });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-xl shadow-xl z-50">
                    <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium flex items-center justify-between gap-4">
                            <span>{entry.name}:</span>
                            <span>{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const handleExportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        const addSection = (title, data, columns) => {
            csvContent += `\n${title.toUpperCase()}\n`;
            csvContent += columns.map(c => c.header).join(",") + "\n";
            data.forEach(item => {
                csvContent += columns.map(c => item[c.key]?.toString().replace(/,/g, "") || "0").join(",") + "\n";
            });
        };


        addSection("Reception Status", find10kData, [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]);
        addSection("Awareness Levels", knowledgeData, [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]);
        addSection("Pre-Support Categories", before10kData, [
            { header: 'District', key: 'district_name' },
            { header: 'Employee', key: 'Employee' },
            { header: 'Farm', key: 'Farm' },
            { header: 'Labour', key: 'Labour' },
            { header: 'Livestock', key: 'Livestock' },
            { header: 'Own Business', key: 'Own_Business' },
            { header: 'Others', key: 'Others' }
        ]);
        addSection("Fund Utilization", use10kData, [
            { header: 'District', key: 'district_name' },
            { header: 'Not Invested', key: 'Not_Invested' },
            { header: 'Old Business', key: 'Spent_in_Old_Business' },
            { header: 'New Business', key: 'Start_New_Business' }
        ]);
        addSection("Sectoral Focus", used10kTypeData, [
            { header: 'District', key: 'district_name' },
            { header: 'No Business', key: 'No_Business' },
            { header: 'Farm', key: 'Farm' },
            { header: 'Livestock', key: 'Livestock' },
            { header: 'Service Based', key: 'Service_Based' },
            { header: 'Skill Based', key: 'Skill_Based' },
            { header: 'Small Business', key: 'Small_Business' }
        ]);

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `mmry_business_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen transition-colors duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-4">
                        <Briefcase className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        Business Performance
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 text-lg">Detailed analysis of fund usage and entrepreneurial impact</p>
                </div>

                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 group"
                >
                    <Download className="w-5 h-5 group-hover:animate-bounce" />
                    Export Report (CSV)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">

                {/* KPI 1: Found 10k Amount */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <DollarSign className="w-6 h-6 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-lg" />
                                Support Reception
                            </h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Beneficiaries who confirmed receiving ₹10,000</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={transformForStackedBar(find10kData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 0, left: -25, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }} />
                                <Bar dataKey="Yes_Count" name="Received (Yes)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} barSize={24} />
                                <Bar dataKey="No_Count" name="Not Received (No)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <PaginatedTable
                        data={find10kData}
                        columns={[
                            { header: 'District', key: 'district_name' },
                            { header: 'Yes', key: 'Yes_Count' },
                            { header: 'No', key: 'No_Count' },
                            { header: 'Yes %', key: 'Yes_Rate_Percentage' }
                        ]}
                        title="Reception Status"
                    />
                </div>

                {/* KPI 2: Knowledge about MMRY */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <HelpCircle className="w-6 h-6 text-blue-500 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg" />
                                Scheme Awareness
                            </h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Beneficiary knowledge about the MMRY scheme</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={transformForStackedBar(knowledgeData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 0, left: -25, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }} />
                                <Bar dataKey="Yes_Count" name="Aware (Yes)" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={24} />
                                <Bar dataKey="No_Count" name="Unaware (No)" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <PaginatedTable
                        data={knowledgeData}
                        columns={[
                            { header: 'District', key: 'district_name' },
                            { header: 'Yes', key: 'Yes_Count' },
                            { header: 'No', key: 'No_Count' },
                            { header: 'Yes %', key: 'Yes_Rate_Percentage' }
                        ]}
                        title="Awareness Levels"
                    />
                </div>
            </div>

            {/* KPI 3: Business Before 10k */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 mb-10 hover:border-indigo-100 transition-all duration-300">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                            <Building className="w-6 h-6 text-amber-500 bg-amber-50 dark:bg-amber-900/30 p-1.5 rounded-lg" />
                            Pre-Support Categories
                        </h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Initial business activities before receiving financial support</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={before10kData} margin={{ top: 20, right: 10, left: -25, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="district_name" hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }} />
                                <Bar dataKey="Employee" stackId="a" fill={COLORS[0]} />
                                <Bar dataKey="Farm" stackId="a" fill={COLORS[1]} />
                                <Bar dataKey="Labour" stackId="a" fill={COLORS[2]} />
                                <Bar dataKey="Livestock" stackId="a" fill={COLORS[3]} />
                                <Bar dataKey="Own_Business" stackId="a" fill={COLORS[4]} />
                                <Bar dataKey="Others" stackId="a" fill={COLORS[5]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center">
                        <PaginatedTable
                            data={before10kData}
                            columns={[
                                { header: 'District', key: 'district_name' },
                                { header: 'Farm', key: 'Farm' },
                                { header: 'Labour', key: 'Labour' },
                                { header: 'Business', key: 'Own_Business' },
                                { header: 'Livestock', key: 'Livestock' }
                            ]}
                            title="Pre-Support Breakdown"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* KPI 4: Use of 10k Amount */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <Activity className="w-6 h-6 text-purple-500 bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-lg" />
                                Fund Utilization
                            </h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">How beneficiaries decided to use the received capital</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={use10kData} margin={{ top: 20, right: 0, left: -25, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="district_name" hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }} />
                                <Bar dataKey="Spent_in_Old_Business" name="Old Biz" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="Start_New_Business" name="New Biz" stackId="a" fill="#8b5cf6" />
                                <Bar dataKey="Not_Invested" name="Not Invested" stackId="a" fill="#94a3b8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <PaginatedTable
                        data={use10kData}
                        columns={[
                            { header: 'District', key: 'district_name' },
                            { header: 'Old Biz', key: 'Spent_in_Old_Business' },
                            { header: 'New Biz', key: 'Start_New_Business' },
                            { header: 'None', key: 'Not_Invested' }
                        ]}
                        title="Utilization Type"
                    />
                </div>

                {/* KPI 5: New Business Type */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <Award className="w-6 h-6 text-pink-500 bg-pink-50 dark:bg-pink-900/30 p-1.5 rounded-lg" />
                                Sectoral Focus
                            </h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-1">Specific sectors where funds was utilized</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={used10kTypeData} margin={{ top: 20, right: 0, left: -25, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="district_name" hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }} />
                                <Bar dataKey="Farm" fill={COLORS[1]} stackId="a" />
                                <Bar dataKey="Livestock" fill={COLORS[3]} stackId="a" />
                                <Bar dataKey="Small_Business" fill={COLORS[0]} stackId="a" />
                                <Bar dataKey="Service_Based" fill={COLORS[4]} stackId="a" />
                                <Bar dataKey="Skill_Based" fill={COLORS[5]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <PaginatedTable
                        data={used10kTypeData}
                        columns={[
                            { header: 'District', key: 'district_name' },
                            { header: 'Farm', key: 'Farm' },
                            { header: 'Livestock', key: 'Livestock' },
                            { header: 'Small Biz', key: 'Small_Business' },
                            { header: 'Service', key: 'Service_Based' }
                        ]}
                        title="Sectoral Distribution"
                    />
                </div>
            </div>
        </div>
    );
};

export default BusinessDashboard;
