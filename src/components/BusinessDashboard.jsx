import React, { useState, useEffect, useRef } from 'react';
import {
    fetchBusinessFind10k,
    fetchBusinessKnowledgeMmry,
    fetchBusinessBefore10k,
    fetchBusinessUse10k,
    fetchBusinessUsed10kType
} from '../service/datalayer';
import { Briefcase, Activity, TrendingUp, HelpCircle, DollarSign, Award, Download, Building, ChevronLeft, ChevronRight, FileText, Maximize2, X } from 'lucide-react';
import { Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

const transformForStackedBar = (data, fields) => {
    return (data || []).map(item => {
        const row = { name: item.district_name };
        fields.forEach(f => row[f] = item[f] || 0);
        return row;
    });
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-4 rounded-xl shadow-xl z-50" style={{ borderColor: '#e2e8f0' }}>
                <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2" style={{ borderBottomColor: '#f1f5f9' }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm font-medium flex items-center justify-between gap-4">
                        <span>{entry.name || entry.dataKey}:</span>
                        <span>{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const BusinessDashboard = () => {
    const [find10kData, setFind10kData] = useState([]);
    const [knowledgeData, setKnowledgeData] = useState([]);
    const [before10kData, setBefore10kData] = useState([]);
    const [use10kData, setUse10kData] = useState([]);
    const [used10kTypeData, setUsed10kTypeData] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // View Mode State
    const [viewMode, setViewMode] = useState('district'); // 'district' | 'overview'

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedChart, setSelectedChart] = useState(null);

    const openModal = (chartConfig) => {
        setSelectedChart(chartConfig);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedChart(null);
    };

    const chartRefs = {
        reception: useRef(null),
        awareness: useRef(null),
        preSupport: useRef(null),
        utilization: useRef(null),
        sectoral: useRef(null)
    };

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
                toast.error('Failed to load business KPI data: ' + (err.message || err));
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

    const handlePrint = () => {
        window.print();
    };
    const handleExportExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            const addSheet = (sheetName, subtitle, data, columns) => {
                // Calculate totals for numerical columns
                const totals = columns.map(c => {
                    if (c.key === 'district_name' || c.header.toLowerCase().includes('district')) return 'TOTAL';
                    const sum = data.reduce((acc, item) => {
                        const val = parseFloat(item[c.key]);
                        return acc + (isNaN(val) ? 0 : val);
                    }, 0);
                    return sum;
                });

                const wsData = [
                    [subtitle],
                    columns.map(c => c.header),
                    ...data.map(item => columns.map(c => item[c.key] ?? "0")),
                    totals
                ];

                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // Merge subtitle across columns
                if (!ws['!merges']) ws['!merges'] = [];
                ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });

                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            };

            addSheet(
                "Support Reception",
                "Beneficiaries who confirmed receiving ₹10,000",
                find10kData,
                [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]
            );

            addSheet(
                "Scheme Awareness",
                "Beneficiary knowledge about the MMRY scheme",
                knowledgeData,
                [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]
            );

            addSheet(
                "Pre-Support Categories",
                "Initial business activities before receiving financial support",
                before10kData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'Employee', key: 'Employee' },
                    { header: 'Farm', key: 'Farm' },
                    { header: 'Labour', key: 'Labour' },
                    { header: 'Livestock', key: 'Livestock' },
                    { header: 'Own Business', key: 'Own_Business' },
                    { header: 'Others', key: 'Others' }
                ]
            );

            addSheet(
                "Fund Utilization",
                "How beneficiaries decided to use the received capital",
                use10kData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'Not Invested', key: 'Not_Invested' },
                    { header: 'Old Business', key: 'Spent_in_Old_Business' },
                    { header: 'New Business', key: 'Start_New_Business' }
                ]
            );

            addSheet(
                "Sectoral Focus",
                "Specific sectors where funds was utilized",
                used10kTypeData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'No Business', key: 'No_Business' },
                    { header: 'Farm', key: 'Farm' },
                    { header: 'Livestock', key: 'Livestock' },
                    { header: 'Service Based', key: 'Service_Based' },
                    { header: 'Skill Based', key: 'Skill_Based' },
                    { header: 'Small Business', key: 'Small_Business' }
                ]
            );

            XLSX.writeFile(wb, `mmry_business_report_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel report exported successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export Excel report');
        }
    };

    const handleExportPDFOnlyTables = () => {
        try {
            const doc = new jsPDF();

            const margin = { left: 14, right: 14 };
            let finalY = 20;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text("Business Performance Data Report", margin.left, finalY);
            finalY += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin.left, finalY);
            finalY += 15;

            const addTableSection = (title, subtitle, data, columns) => {
                if (finalY > 250) {
                    doc.addPage();
                    finalY = 20;
                }

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(title, margin.left, finalY);
                finalY += 8;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(subtitle, margin.left, finalY);
                finalY += 10;

                // Calculate totals row
                let tableData = data.map(item => columns.map(c => item[c.key] ?? "0"));

                const totals = columns.map(c => {
                    if (c.key === 'district_name' || (c.header && c.header.toLowerCase().includes('district'))) return 'TOTAL';
                    const sum = data.reduce((acc, item) => {
                        const val = parseFloat(item[c.key]);
                        return acc + (isNaN(val) ? 0 : val);
                    }, 0);
                    return sum;
                });

                tableData.push(totals);

                autoTable(doc, {
                    startY: finalY,
                    head: [columns.map(c => c.header)],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
                    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: margin,
                    didParseCell: function (data) {
                        if (data.row.index === tableData.length - 1 && data.section === 'body') {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [241, 245, 249];
                        }
                    }
                });

                finalY = doc.lastAutoTable.finalY + 20;
            };

            addTableSection(
                "1. Support Reception",
                "Beneficiaries who confirmed receiving Rs 10,000 financial support.",
                find10kData,
                [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]
            );

            addTableSection(
                "2. Scheme Awareness",
                "Beneficiary knowledge and understanding of the MMRY scheme guidelines.",
                knowledgeData,
                [{ header: 'District', key: 'district_name' }, { header: 'Yes', key: 'Yes_Count' }, { header: 'No', key: 'No_Count' }]
            );

            addTableSection(
                "3. Pre-Support Categories",
                "Initial occupations of beneficiaries prior to scheme intervention.",
                before10kData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'Farm', key: 'Farm' },
                    { header: 'Labour', key: 'Labour' },
                    { header: 'Business', key: 'Own_Business' },
                    { header: 'Livestock', key: 'Livestock' }
                ]
            );

            addTableSection(
                "4. Fund Utilization",
                "Strategic allocation of received funds across new and existing ventures.",
                use10kData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'Old Business', key: 'Spent_in_Old_Business' },
                    { header: 'New Business', key: 'Start_New_Business' },
                    { header: 'Not Invested', key: 'Not_Invested' }
                ]
            );

            addTableSection(
                "5. Sectoral Focus",
                "Distribution of micro-enterprise activities enabled by the scheme.",
                used10kTypeData,
                [
                    { header: 'District', key: 'district_name' },
                    { header: 'Farm', key: 'Farm' },
                    { header: 'Livestock', key: 'Livestock' },
                    { header: 'Small Business', key: 'Small_Business' },
                    { header: 'Service Based', key: 'Service_Based' }
                ]
            );

            doc.save(`mmry_business_data_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('PDF report exported successfully!');
        } catch (error) {
            console.error('PDF Export failed:', error);
            toast.error('Failed to export PDF');
        }
    };

    const getAggregatedData = (dataArray, keys) => {
        const total = {};
        keys.forEach(k => total[k] = 0);
        dataArray.forEach(item => {
            keys.forEach(k => {
                total[k] += parseInt(item[k]) || 0;
            });
        });
        return keys.map(k => ({ name: k, value: total[k] }));
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
        
        return percent > 0.05 ? (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[12px] font-bold z-10">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        ) : null;
    };

    const overviewReception = getAggregatedData(find10kData || [], ['Yes_Count', 'No_Count']).map(item => ({...item, name: item.name === 'Yes_Count' ? 'Received (Yes)' : 'Not Received (No)'}));
    const overviewAwareness = getAggregatedData(knowledgeData || [], ['Yes_Count', 'No_Count']).map(item => ({...item, name: item.name === 'Yes_Count' ? 'Aware (Yes)' : 'Unaware (No)'}));
    const overviewPreSupport = getAggregatedData(before10kData || [], ['Employee', 'Farm', 'Labour', 'Livestock', 'Own_Business', 'Others']).map(item => ({...item, name: item.name.replace('_', ' ')}));
    const overviewUtilization = getAggregatedData(use10kData || [], ['Spent_in_Old_Business', 'Start_New_Business', 'Not_Invested']).map(item => {
        let name = item.name;
        if(name === 'Spent_in_Old_Business') name = 'Old Business';
        else if(name === 'Start_New_Business') name = 'New Business';
        else if(name === 'Not_Invested') name = 'Not Invested';
        return { ...item, name };
    });
    const overviewSectoral = getAggregatedData(used10kTypeData || [], ['Farm', 'Livestock', 'Small_Business', 'Service_Based', 'Skill_Based', 'No_Business']).map(item => ({...item, name: item.name.replace('_', ' ')}));

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen transition-colors duration-300">
            {/* Main Dashboard UI - Hidden during print */}
            <div className="no-print">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-4">
                            <Briefcase className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            Business Performance
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 text-lg">Detailed analysis of fund usage and entrepreneurial impact</p>
                    </div>                    <div className="flex flex-nowrap items-center gap-2 lg:gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                            <button
                                onClick={() => setViewMode('overview')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                                    viewMode === 'overview' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                            >
                                Total Overview
                            </button>
                            <button
                                onClick={() => setViewMode('district')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                                    viewMode === 'district' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                            >
                                District Wise
                            </button>
                        </div>
                        <button
                            onClick={handleExportPDFOnlyTables}
                            className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-800 text-white rounded-xl font-black text-xs md:text-sm shadow-md transition-all active:scale-95 group shrink-0 whitespace-nowrap"
                        >
                            <FileText className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                            Export PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-black text-xs md:text-sm shadow-md transition-all active:scale-95 group shrink-0 whitespace-nowrap"
                        >
                            <Download className="w-4 h-4 md:w-5 md:h-5 group-hover:animate-bounce" />
                            Export Excel
                        </button>
                        {/* Print feature temporarily disabled
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-3 px-6 py-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-800 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 dark:shadow-none transition-all active:scale-95 group"
                        >
                            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Print Report
                        </button>
                        */}
                    </div>
                </div>

                {viewMode === 'overview' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10 w-full animate-in fade-in duration-500 delay-100 fill-mode-both">
                        {[
                            { title: 'Beneficiaries who confirmed receiving ₹10,000', icon: <DollarSign className="w-5 h-5 text-emerald-500" />, data: overviewReception, colors: ['#10b981', '#f43f5e'] },
                            { title: 'Beneficiary knowledge about the MMRY scheme', icon: <HelpCircle className="w-5 h-5 text-blue-500" />, data: overviewAwareness, colors: ['#3b82f6', '#94a3b8'] },
                            { title: 'Initial business activities before receiving financial support', icon: <Building className="w-5 h-5 text-amber-500" />, data: overviewPreSupport, colors: COLORS },
                            { title: 'How beneficiaries decided to use the received capital', icon: <Activity className="w-5 h-5 text-purple-500" />, data: overviewUtilization, colors: ['#f59e0b', '#8b5cf6', '#94a3b8'] },
                            { title: 'Specific sectors where funds was utilized', icon: <Award className="w-5 h-5 text-pink-500" />, data: overviewSectoral, colors: [COLORS[1], COLORS[3], COLORS[0], COLORS[4], COLORS[5], COLORS[2]] }
                        ].map((chart, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center hover:border-indigo-100 transition-all duration-300">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-3 uppercase tracking-wider mb-6 w-full text-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">{chart.icon}</div>
                                    <span className="flex-1 text-left">{chart.title}</span>
                                </h3>
                                <div className="h-[280px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chart.data}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={renderCustomizedLabel}
                                                outerRadius={105}
                                                dataKey="value"
                                                stroke="#ffffff"
                                                strokeWidth={3}
                                            >
                                                {chart.data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={chart.colors[index % chart.colors.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                                itemStyle={{ fontWeight: 700, color: '#334155', fontSize: '13px' }}
                                                formatter={(value, name) => [value.toLocaleString(), name]}
                                            />
                                            <Legend 
                                                iconType="circle" 
                                                layout="horizontal" 
                                                verticalAlign="bottom" 
                                                align="center" 
                                                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 600, color: '#64748b' }} 
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">

                    {/* KPI 1: Found 10k Amount */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                        <div 
                            className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl p-2 -m-2"
                            onClick={() => openModal({
                                title: "Support Reception",
                                subtitle: "Beneficiaries who confirmed receiving ₹10,000",
                                data: find10kData,
                                transform: (d) => transformForStackedBar(d, ['Yes_Count', 'No_Count']),
                                bars: [
                                    { key: "Yes_Count", name: "Received (Yes)", fill: "#10b981", stackId: "a" },
                                    { key: "No_Count", name: "Not Received (No)", fill: "#f43f5e", stackId: "a" }
                                ],
                                columns: [
                                    { header: 'District', key: 'district_name' },
                                    { header: 'Yes', key: 'Yes_Count' },
                                    { header: 'No', key: 'No_Count' },
                                    { header: 'Yes %', key: 'Yes_Rate_Percentage' }
                                ]
                            })}
                        >
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-wider">
                                    <DollarSign className="w-5 h-5 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 p-1 rounded-lg" />
                                    Beneficiaries who confirmed receiving ₹10,000
                                    <Maximize2 className="w-4 h-4 text-slate-300 ml-auto opacity-50" />
                                </h3>
                            </div>
                        </div>

                        <div className="h-[250px] w-full mb-4" ref={chartRefs.reception}>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={transformForStackedBar(find10kData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 0, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} hide />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} tickCount={6} allowDecimals={false} />
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
                        <div 
                            className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl p-2 -m-2"
                            onClick={() => openModal({
                                title: "Scheme Awareness",
                                subtitle: "Beneficiary knowledge about the MMRY scheme",
                                data: knowledgeData,
                                transform: (d) => transformForStackedBar(d, ['Yes_Count', 'No_Count']),
                                bars: [
                                    { key: "Yes_Count", name: "Aware (Yes)", fill: "#3b82f6", stackId: "a" },
                                    { key: "No_Count", name: "Unaware (No)", fill: "#94a3b8", stackId: "a" }
                                ],
                                columns: [
                                    { header: 'District', key: 'district_name' },
                                    { header: 'Yes', key: 'Yes_Count' },
                                    { header: 'No', key: 'No_Count' },
                                    { header: 'Yes %', key: 'Yes_Rate_Percentage' }
                                ]
                            })}
                        >
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-wider">
                                    <HelpCircle className="w-5 h-5 text-blue-500 bg-blue-50 dark:bg-blue-900/30 p-1 rounded-lg" />
                                    Beneficiary knowledge about the MMRY scheme
                                    <Maximize2 className="w-4 h-4 text-slate-300 ml-auto opacity-50" />
                                </h3>
                            </div>
                        </div>

                        <div className="h-[250px] w-full mb-4" ref={chartRefs.awareness}>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={transformForStackedBar(knowledgeData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 0, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} hide />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} tickCount={6} allowDecimals={false} />
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
                    <div 
                        className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl p-2 -m-2"
                        onClick={() => openModal({
                            title: "Pre-Support Categories",
                            subtitle: "Initial business activities before receiving financial support",
                            data: before10kData,
                            bars: [
                                { key: "Employee", fill: COLORS[0], stackId: "a" },
                                { key: "Farm", fill: COLORS[1], stackId: "a" },
                                { key: "Labour", fill: COLORS[2], stackId: "a" },
                                { key: "Livestock", fill: COLORS[3], stackId: "a" },
                                { key: "Own_Business", fill: COLORS[4], stackId: "a" },
                                { key: "Others", fill: COLORS[5], stackId: "a" }
                            ],
                            columns: [
                                { header: 'District', key: 'district_name' },
                                { header: 'Farm', key: 'Farm' },
                                { header: 'Labour', key: 'Labour' },
                                { header: 'Business', key: 'Own_Business' },
                                { header: 'Livestock', key: 'Livestock' }
                            ]
                        })}
                    >
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-wider">
                                <Building className="w-5 h-5 text-amber-500 bg-amber-50 dark:bg-amber-900/30 p-1 rounded-lg" />
                                Initial business activities before receiving financial support
                                <Maximize2 className="w-4 h-4 text-slate-300 ml-auto opacity-50" />
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        <div className="h-[300px]" ref={chartRefs.preSupport}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={before10kData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="district_name" hide />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} tickCount={6} allowDecimals={false} />
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
                        <div 
                            className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl p-2 -m-2"
                            onClick={() => openModal({
                                title: "Fund Utilization",
                                subtitle: "How beneficiaries decided to use the received capital",
                                data: use10kData,
                                bars: [
                                    { key: "Spent_in_Old_Business", name: "Old Bussiness", fill: "#f59e0b", stackId: "a" },
                                    { key: "Start_New_Business", name: "New Bussiness", fill: "#8b5cf6", stackId: "a" },
                                    { key: "Not_Invested", name: "Not Invested", fill: "#94a3b8", stackId: "a" }
                                ],
                                columns: [
                                    { header: 'District', key: 'district_name' },
                                    { header: 'Old Bussiness', key: 'Spent_in_Old_Business' },
                                    { header: 'New Business', key: 'Start_New_Business' },
                                    { header: 'Not Invested', key: 'Not_Invested' }
                                ]
                            })}
                        >
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-wider">
                                    <Activity className="w-5 h-5 text-purple-500 bg-purple-50 dark:bg-purple-900/30 p-1 rounded-lg" />
                                    How beneficiaries decided to use the received capital
                                    <Maximize2 className="w-4 h-4 text-slate-300 ml-auto opacity-50" />
                                </h3>
                            </div>
                        </div>

                        <div className="h-[250px] w-full mb-4" ref={chartRefs.utilization}>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={use10kData} margin={{ top: 20, right: 0, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="district_name" hide />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} tickCount={6} allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }} />
                                    <Bar dataKey="Spent_in_Old_Business" name="Old Bussiness" stackId="a" fill="#f59e0b" />
                                    <Bar dataKey="Start_New_Business" name="New Bussiness" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="Not_Invested" name="Not Invested" stackId="a" fill="#94a3b8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <PaginatedTable
                            data={use10kData}
                            columns={[
                                { header: 'District', key: 'district_name' },
                                { header: 'Old Bussiness', key: 'Spent_in_Old_Business' },
                                { header: 'New Business', key: 'Start_New_Business' },
                                { header: 'Not Invested', key: 'Not_Invested' }
                            ]}
                            title="Utilization Type"
                        />
                    </div>

                    {/* KPI 5: New Business Type */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 p-8 flex flex-col h-full hover:border-indigo-100 transition-all duration-300">
                        <div 
                            className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-700 pb-6 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-2xl p-2 -m-2"
                            onClick={() => openModal({
                                title: "Sectoral Focus",
                                subtitle: "Specific sectors where funds was utilized",
                                data: used10kTypeData,
                                bars: [
                                    { key: "Farm", fill: COLORS[1], stackId: "a" },
                                    { key: "Livestock", fill: COLORS[3], stackId: "a" },
                                    { key: "Small_Business", fill: COLORS[0], stackId: "a" },
                                    { key: "Service_Based", fill: COLORS[4], stackId: "a" },
                                    { key: "Skill_Based", fill: COLORS[5], stackId: "a" },
                                    { key: "No_Business", fill: COLORS[2], stackId: "a" }
                                ],
                                columns: [
                                    { header: 'District', key: 'district_name' },
                                    { header: 'Farm', key: 'Farm' },
                                    { header: 'Livestock', key: 'Livestock' },
                                    { header: 'Small Business', key: 'Small_Business' },
                                    { header: 'Service Based', key: 'Service_Based' },
                                    { header: 'Skill Based', key: 'Skill_Based' },
                                    { header: 'No Business', key: 'No_Business' }
                                ]
                            })}
                        >
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-3 uppercase tracking-wider">
                                    <Award className="w-5 h-5 text-pink-500 bg-pink-50 dark:bg-pink-900/30 p-1 rounded-lg" />
                                    Specific sectors where funds was utilized
                                    <Maximize2 className="w-4 h-4 text-slate-300 ml-auto opacity-50" />
                                </h3>
                            </div>
                        </div>

                        <div className="h-[250px] w-full mb-4" ref={chartRefs.sectoral}>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={used10kTypeData} margin={{ top: 20, right: 0, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="district_name" hide />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} tickCount={6} allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }} />
                                    <Bar dataKey="Farm" fill={COLORS[1]} stackId="a" />
                                    <Bar dataKey="Livestock" fill={COLORS[3]} stackId="a" />
                                    <Bar dataKey="Small_Business" fill={COLORS[0]} stackId="a" />
                                    <Bar dataKey="Service_Based" fill={COLORS[4]} stackId="a" />
                                    <Bar dataKey="Skill_Based" fill={COLORS[5]} stackId="a" />
                                    <Bar dataKey="No_Business" fill={COLORS[2]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <PaginatedTable
                            data={used10kTypeData}
                            columns={[
                                { header: 'District', key: 'district_name' },
                                { header: 'Farm', key: 'Farm' },
                                { header: 'Livestock', key: 'Livestock' },
                                { header: 'Small Business', key: 'Small_Business' },
                                { header: 'Service Based', key: 'Service_Based' },
                                { header: 'Skill Based', key: 'Skill_Based' },
                                { header: 'No Business', key: 'No_Business' }
                            ]}
                            title="Sectoral Distribution"
                        />
                    </div>
                </div>
            </div>
            )}
            </div>

            {/* Print Only Report Section - Temporarily Hidden */}
            {false && (
            <div className="print-only p-8 bg-white min-h-screen">
                <div className="print-page mb-12 border-b pb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-2">Business Performance Report</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Beneficiary Dashboard Analysis • {new Date().toLocaleDateString()}</p>
                </div>

                <div className="print-page page-break mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">1. Support Reception</h2>
                    <p className="text-slate-500 mb-6 font-medium">Beneficiaries who confirmed receiving ₹10,000 financial support.</p>
                    {/* Charts commented out for now
                    <div className="w-full flex justify-center mb-8">
                        <BarChart width={740} height={400} data={transformForStackedBar(find10kData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                            <Bar dataKey="Yes_Count" name="Received (Yes)" stackId="a" fill="#10b981" isAnimationActive={false} />
                            <Bar dataKey="No_Count" name="Not Received (No)" stackId="a" fill="#f43f5e" isAnimationActive={false} />
                        </BarChart>
                    </div>
                    */}
                    <table className="w-full border-collapse border border-slate-200 text-xs text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="border border-slate-200 p-3 text-slate-600 font-bold uppercase tracking-wider">District</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Yes</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">No</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Yes %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {find10kData.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                    <td className="border border-slate-200 p-3 text-slate-700 font-medium">{item.district_name}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Yes_Count}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.No_Count}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-900 font-bold">{item.Yes_Rate_Percentage}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="print-page page-break mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">2. Scheme Awareness</h2>
                    <p className="text-slate-500 mb-6 font-medium">Beneficiary knowledge and understanding of the MMRY scheme guidelines.</p>
                    {/* Charts commented out for now
                    <div className="w-full flex justify-center mb-8">
                        <BarChart width={740} height={400} data={transformForStackedBar(knowledgeData, ['Yes_Count', 'No_Count'])} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                            <Bar dataKey="Yes_Count" name="Aware (Yes)" stackId="a" fill="#3b82f6" isAnimationActive={false} />
                            <Bar dataKey="No_Count" name="Unaware (No)" stackId="a" fill="#94a3b8" isAnimationActive={false} />
                        </BarChart>
                    </div>
                    */}
                    <table className="w-full border-collapse border border-slate-200 text-xs text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="border border-slate-200 p-3 text-slate-600 font-bold uppercase tracking-wider">District</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Yes</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">No</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Yes %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {knowledgeData.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                    <td className="border border-slate-200 p-3 text-slate-700 font-medium">{item.district_name}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Yes_Count}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.No_Count}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-900 font-bold">{item.Yes_Rate_Percentage}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="print-page page-break mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">3. Pre-Support Categories</h2>
                    <p className="text-slate-500 mb-6 font-medium">Initial occupations of beneficiaries prior to scheme intervention.</p>
                    {/* Charts commented out for now
                    <div className="w-full flex justify-center mb-8">
                        <BarChart width={740} height={400} data={before10kData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="district_name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                            <Bar dataKey="Farm" stackId="a" fill={COLORS[0]} isAnimationActive={false} />
                            <Bar dataKey="Labour" stackId="a" fill={COLORS[1]} isAnimationActive={false} />
                            <Bar dataKey="Own_Business" name="Business" stackId="a" fill={COLORS[2]} isAnimationActive={false} />
                            <Bar dataKey="Livestock" stackId="a" fill={COLORS[3]} isAnimationActive={false} />
                            <Bar dataKey="Others" stackId="a" fill={COLORS[4]} isAnimationActive={false} />
                        </BarChart>
                    </div>
                    */}
                    <table className="w-full border-collapse border border-slate-200 text-xs text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="border border-slate-200 p-3 text-slate-600 font-bold uppercase tracking-wider">District</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Farm</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Labour</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Business</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Livestock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {before10kData.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                    <td className="border border-slate-200 p-3 text-slate-700 font-medium">{item.district_name}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Farm}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Labour}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Own_Business}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Livestock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="print-page page-break mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">4. Fund Utilization</h2>
                    <p className="text-slate-500 mb-6 font-medium">Strategic allocation of received funds across new and existing ventures.</p>
                    {/* Charts commented out for now
                    <div className="w-full flex justify-center mb-8">
                        <BarChart width={740} height={400} data={use10kData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="district_name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                            <Bar dataKey="Spent_in_Old_Business" name="Old Bussiness" stackId="a" fill="#f59e0b" isAnimationActive={false} />
                            <Bar dataKey="Start_New_Business" name="New Bussiness" stackId="a" fill="#8b5cf6" isAnimationActive={false} />
                            <Bar dataKey="Not_Invested" name="Not Invested" stackId="a" fill="#94a3b8" isAnimationActive={false} />
                        </BarChart>
                    </div>
                    */}
                    <table className="w-full border-collapse border border-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="border border-slate-200 p-3 text-slate-600 font-bold uppercase tracking-wider text-left">District</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Old Business</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">New Business</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Not Invested</th>
                            </tr>
                        </thead>
                        <tbody>
                            {use10kData.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                    <td className="border border-slate-200 p-3 text-slate-700 font-medium">{item.district_name}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Spent_in_Old_Business}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Start_New_Business}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Not_Invested}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="print-page">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">5. Sectoral Focus</h2>
                    <p className="text-slate-500 mb-6 font-medium">Distribution of micro-enterprise activities enabled by the scheme.</p>
                    {/* Charts commented out for now
                    <div className="w-full flex justify-center mb-8">
                        <BarChart width={740} height={400} data={used10kTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="district_name" angle={-45} textAnchor="end" height={60} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }}/>
                            <Bar dataKey="Farm" fill={COLORS[0]} stackId="a" isAnimationActive={false} />
                            <Bar dataKey="Livestock" fill={COLORS[1]} stackId="a" isAnimationActive={false} />
                            <Bar dataKey="Small_Business" fill={COLORS[2]} stackId="a" isAnimationActive={false} />
                            <Bar dataKey="Service_Based" fill={COLORS[3]} stackId="a" isAnimationActive={false} />
                            <Bar dataKey="Skill_Based" fill={COLORS[4]} stackId="a" isAnimationActive={false} />
                        </BarChart>
                    </div>
                    */}
                    <table className="w-full border-collapse border border-slate-200 text-xs text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="border border-slate-200 p-3 text-slate-600 font-bold uppercase tracking-wider">District</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Farm</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Livestock</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Small Business</th>
                                <th className="border border-slate-200 p-3 text-right text-slate-600 font-bold uppercase tracking-wider">Service Based</th>
                            </tr>
                        </thead>
                        <tbody>
                            {used10kTypeData.map((item, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}>
                                    <td className="border border-slate-200 p-3 text-slate-700 font-medium">{item.district_name}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Farm}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Livestock}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Small_Business}</td>
                                    <td className="border border-slate-200 p-3 text-right text-slate-700">{item.Service_Based}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
            <ChartDetailModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                config={selectedChart}
            />

            <ReactTooltip id="business-tooltip" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', padding: '12px', zIndex: 1000 }} />
        </div>
    );
};

// Modal Component for Expanded View
const ChartDetailModal = ({ isOpen, onClose, config }) => {
    // We use a local state to delay chart rendering until the modal is fully mounted and sized.
    // This fixed the "width(-1) and height(-1)" warning from Recharts.
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsRendered(true), 150);
            return () => clearTimeout(timer);
        } else {
            setIsRendered(false);
        }
    }, [isOpen]);

    if (!isOpen || !config || !config.data || !config.columns) return null;

    const chartData = config.transform ? config.transform(config.data) : config.data;
    const sortingKey = config.columns[1]?.key || config.columns[0]?.key;

    // Create a safe sorted copy for the table
    const sortedData = [...config.data].sort((a, b) => {
        const valA = Number(a[sortingKey]) || 0;
        const valB = Number(b[sortingKey]) || 0;
        return valB - valA;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                
                {/* Header - More Compact */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white backdrop-blur-xl shrink-0">
                    <div>
                        <h2 className="text-xl font-black tracking-tight">{config.title}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{config.subtitle}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-90 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable but compact */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20">
                    
                    {/* Compact Chart */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[250px]" style={{ minWidth: 0 }}>
                        {!isRendered ? (
                            <div className="flex flex-col items-center justify-center min-h-[250px] gap-3 text-slate-400">
                                <div className="w-6 h-6 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-bold animate-pulse uppercase tracking-[0.2em] opacity-60">Loading Chart...</p>
                            </div>
                        ) : (
                            <div className="h-[250px] w-full animate-in fade-in duration-700" style={{ minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey={config.dataKey || (chartData[0]?.name ? "name" : "district_name")} hide />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={45} tickCount={6} allowDecimals={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.8 }} />
                                        <Legend verticalAlign="top" align="right" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                                        {config.bars && config.bars.map((bar, idx) => (
                                            <Bar 
                                                key={idx}
                                                dataKey={bar.key} 
                                                name={bar.name || bar.key} 
                                                stackId={bar.stackId} 
                                                fill={bar.fill} 
                                                radius={[4, 4, 0, 0]}
                                                barSize={20}
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Compact Data Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Full Dataset Breakdown</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.data.length} Districts</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                                            {config.columns.map((col, idx) => (
                                                <th key={idx} className={`px-4 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] ${idx > 0 ? 'text-right' : ''}`}>
                                                    {col.header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {sortedData.map((item, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors group">
                                                {config.columns.map((col, colIdx) => (
                                                    <td key={colIdx} className={`px-4 py-1.5 text-xs ${colIdx === 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400 font-bold text-right'}`}>
                                                        {item[col.key] && col.key === 'district_name' ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors"></span>
                                                                {item[col.key]}
                                                            </div>
                                                        ) : (
                                                            (item[col.key] || 0).toLocaleString()
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {/* TOTAL Row */}
                                        {sortedData.length > 0 && (
                                            <tr className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group border-t-2 border-slate-300 dark:border-slate-600">
                                                {config.columns.map((col, colIdx) => {
                                                    const isLabel = colIdx === 0 || col.key === 'district_name';
                                                    let value = 'TOTAL';
                                                    if (!isLabel) {
                                                        const sum = sortedData.reduce((acc, item) => {
                                                            const val = parseFloat(item[col.key]);
                                                            return acc + (isNaN(val) ? 0 : val);
                                                        }, 0);
                                                        value = sum.toLocaleString();
                                                    }
                                                    return (
                                                        <td key={`total-${colIdx}`} className={`px-4 py-3 text-sm font-black whitespace-nowrap ${colIdx === 0 ? 'text-left text-slate-900 dark:text-slate-100' : 'text-right text-indigo-700 dark:text-indigo-400'}`}>
                                                            {isLabel ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                                    TOTAL
                                                                </div>
                                                            ) : value}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer - Shrinkable */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black text-xs hover:translate-y-[-1px] transition-all active:scale-95 shadow-lg"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusinessDashboard;
