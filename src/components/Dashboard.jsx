import { useEffect, useState, useMemo } from 'react';
import { fetchOverallKpi, fetchDistrictKpi, fetchBlockKpi, fetchPanchayatKpi } from '../api';
import { Activity, Target, Trophy, MapPin, Grid, Download, ChevronRight, ArrowLeft, Home, X } from 'lucide-react';
import { geoPath, geoMercator } from 'd3-geo';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { scaleQuantile } from 'd3-scale';
import districtBounds from '../district_bounds.json';

const normalizeDistrictName = (name) => {
    if (!name) return "";
    let n = name.trim().toLowerCase();
    if (n === 'purba champaran') return 'purbi champaran';
    if (n === 'kaimur (bhabua)') return 'kaimur alias bhabua';
    return n;
};

const Dashboard = () => {
    const [overall, setOverall] = useState({ Total_Targeted: 0, Total_Achieved: 0, Total_Districts: 0, Total_Blocks: 0 });
    const [districtData, setDistrictData] = useState([]);
    const [blockData, setBlockData] = useState([]);
    const [panchayatData, setPanchayatData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [selectedDistrictGeo, setSelectedDistrictGeo] = useState(null);

    // Separate state for the map modal to decouple map clicks from main table drill-down path
    const [modalDistrict, setModalDistrict] = useState(null);
    const [modalBlock, setModalBlock] = useState(null);

    const [mainPage, setMainPage] = useState(1);
    const [modalPage, setModalPage] = useState(1);
    const itemsPerPage = 10;

    const geoUrl = "/bihar.geojson";

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [overallRes, districtRes, blockRes, panchayatRes] = await Promise.all([
                fetchOverallKpi(),
                fetchDistrictKpi(),
                fetchBlockKpi(),
                fetchPanchayatKpi()
            ]);
            setOverall(overallRes);
            setDistrictData(districtRes);
            setBlockData(blockRes);
            setPanchayatData(panchayatRes);
            setLoading(false);
        };
        loadData();
    }, []);

    const colorScale = useMemo(() => {
        if (!districtData || districtData.length === 0) return () => "#e2e8f0";
        const values = districtData.map(d => d.total_achieved);
        if (Math.max(...values) === 0) return () => "#e2e8f0";

        return scaleQuantile()
            .domain(values)
            .range([
                "#dbeafe",
                "#bfdbfe",
                "#93c5fd",
                "#60a5fa",
                "#3b82f6",
                "#2563eb",
                "#1d4ed8",
                "#1e40af",
                "#1e3a8a"
            ]);
    }, [districtData]);

    const achievementRate = useMemo(() => {
        return overall.Total_Targeted > 0
            ? ((overall.Total_Achieved / overall.Total_Targeted) * 100).toFixed(1)
            : 0;
    }, [overall]);

    const selectedBlockData = useMemo(() => {
        if (!selectedDistrict || !blockData) return [];
        return blockData.filter(b => normalizeDistrictName(b.district_name) === normalizeDistrictName(selectedDistrict));
    }, [selectedDistrict, blockData]);

    const selectedPanchayatData = useMemo(() => {
        if (!selectedBlock || !panchayatData) return [];
        return panchayatData.filter(p =>
            normalizeDistrictName(p.district_name) === normalizeDistrictName(selectedDistrict) &&
            p.block_name.trim().toLowerCase() === selectedBlock.trim().toLowerCase()
        );
    }, [selectedBlock, selectedDistrict, panchayatData]);

    const downloadCSV = (type) => {
        let headers = [];
        let rows = [];
        let filename = '';

        if (type === 'district') {
            headers = ['District Name', 'Targeted', 'Achieved', 'Achievement Rate (%)'];
            rows = districtData.map(d => [
                `"${d.district_name}"`,
                d.total_targeted,
                d.total_achieved,
                d.total_targeted > 0 ? ((d.total_achieved / d.total_targeted) * 100).toFixed(1) : 0
            ]);
            filename = 'bihar_district_performance.csv';
        } else if (type === 'block') {
            headers = ['District Name', 'Block Name', 'Targeted', 'Achieved', 'Achievement Rate (%)'];
            rows = selectedBlockData.map(d => [
                `"${d.district_name}"`,
                `"${d.block_name}"`,
                d.total_targeted,
                d.total_achieved,
                d.total_targeted > 0 ? ((d.total_achieved / d.total_targeted) * 100).toFixed(1) : 0
            ]);
            filename = `${selectedDistrict.replace(/\s+/g, '_').toLowerCase()}_block_performance.csv`;
        } else if (type === 'panchayat') {
            headers = ['District Name', 'Block Name', 'Panchayat Name', 'Targeted', 'Achieved', 'Achievement Rate (%)'];
            rows = selectedPanchayatData.map(d => [
                `"${d.district_name}"`,
                `"${d.block_name}"`,
                `"${d.panchayat_name}"`,
                d.total_targeted,
                d.total_achieved,
                d.total_targeted > 0 ? ((d.total_achieved / d.total_targeted) * 100).toFixed(1) : 0
            ]);
            filename = `${selectedBlock.replace(/\s+/g, '_').toLowerCase()}_panchayat_performance.csv`;
        }

        if (rows.length === 0) return;

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!selectedDistrict && selectedBlock) setSelectedBlock(null);
    }, [selectedDistrict, selectedBlock]);

    useEffect(() => {
        if (!modalDistrict && modalBlock) setModalBlock(null);
    }, [modalDistrict, modalBlock]);

    const renderMainTable = () => {
        let viewMode = 'district';
        let viewData = districtData;
        let title = 'District-wise Performance';
        let cols = ['District Name', 'Targeted', 'Achieved', 'Rate'];

        if (selectedBlock) {
            viewMode = 'panchayat';
            viewData = selectedPanchayatData;
            title = `Panchayat Performance in ${selectedBlock} (${selectedDistrict})`;
            cols = ['Panchayat Name', 'Targeted', 'Achieved', 'Rate'];
        } else if (selectedDistrict) {
            viewMode = 'block';
            viewData = selectedBlockData;
            title = `Block Performance in ${selectedDistrict}`;
            cols = ['Block Name', 'Targeted', 'Achieved', 'Rate'];
        }

        const totalItems = viewData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        const safeCurrentPage = Math.min(mainPage, totalPages);
        const startIndex = Math.max(0, (safeCurrentPage - 1) * itemsPerPage);
        const endIndex = startIndex + itemsPerPage;

        const currentData = viewData.slice(startIndex, endIndex);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0 overflow-hidden mt-4">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        {viewMode !== 'district' && (
                            <button
                                onClick={() => {
                                    setMainPage(1);
                                    if (viewMode === 'panchayat') {
                                        setSelectedBlock(null);
                                    } else {
                                        setSelectedDistrict(null);
                                        setSelectedBlock(null);
                                    }
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors mr-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Breadcrumbs */}
                        <div className="hidden md:flex items-center text-sm text-slate-500 mr-4 font-medium">
                            <span
                                className={`cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-1 ${viewMode === 'district' ? 'text-indigo-600' : ''}`}
                                onClick={() => { setMainPage(1); setSelectedDistrict(null); setSelectedBlock(null); }}
                            >
                                <Home className="w-3.5 h-3.5" /> Bihar
                            </span>
                            {selectedDistrict && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                                    <span
                                        className={`cursor-pointer hover:text-indigo-600 transition-colors ${viewMode === 'block' ? 'text-indigo-600' : ''}`}
                                        onClick={() => { setMainPage(1); setSelectedBlock(null); }}
                                    >
                                        {selectedDistrict}
                                    </span>
                                </>
                            )}
                            {selectedBlock && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                                    <span className="text-indigo-600">{selectedBlock}</span>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => downloadCSV(viewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">{cols[0]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[1]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[2]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[3]}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {viewData.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500 italic">No data available</td>
                                </tr>
                            ) : (
                                currentData.map((row, idx) => {
                                    const targeted = row.total_targeted || 0;
                                    const achieved = row.total_achieved || 0;
                                    const rate = targeted > 0 ? ((achieved / targeted) * 100).toFixed(1) : 0;
                                    const name = viewMode === 'district' ? row.district_name :
                                        viewMode === 'block' ? row.block_name : row.panchayat_name;

                                    return (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-slate-50 transition-colors ${viewMode !== 'panchayat' ? 'cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (viewMode !== 'panchayat') setMainPage(1);
                                                if (viewMode === 'district') {
                                                    setSelectedDistrict(name);
                                                    setSelectedBlock(null);
                                                } else if (viewMode === 'block') {
                                                    setSelectedBlock(name);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800 flex items-center gap-2">
                                                {name}
                                                {viewMode !== 'panchayat' && <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100" />}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 text-right">{targeted.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 text-right">{achieved.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rate >= 60 ? 'bg-emerald-100 text-emerald-700' : rate >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalItems > itemsPerPage && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white sticky bottom-0 z-10">
                        <span className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> entries
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setMainPage(prev => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage === 1}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeCurrentPage === 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setMainPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage === totalPages}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeCurrentPage === totalPages ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderModalTable = () => {
        let viewMode = 'block';

        // Use modal specific variables for map drill downs
        let viewData = blockData.filter(b => normalizeDistrictName(b.district_name) === normalizeDistrictName(modalDistrict));
        let title = `Block Performance in ${modalDistrict}`;
        let cols = ['Block Name', 'Targeted', 'Achieved', 'Rate'];

        if (modalBlock) {
            viewMode = 'panchayat';
            viewData = panchayatData.filter(p =>
                normalizeDistrictName(p.district_name) === normalizeDistrictName(modalDistrict) &&
                p.block_name.trim().toLowerCase() === modalBlock.trim().toLowerCase()
            );
            title = `Panchayat Performance in ${modalBlock} (${modalDistrict})`;
            cols = ['Panchayat Name', 'Targeted', 'Achieved', 'Rate'];
        }

        const totalItems = viewData.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        const safeModalPage = Math.min(modalPage, totalPages);
        const startIndex = Math.max(0, (safeModalPage - 1) * itemsPerPage);
        const endIndex = startIndex + itemsPerPage;

        const currentData = viewData.slice(startIndex, endIndex);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 h-full min-h-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        {viewMode === 'panchayat' && (
                            <button
                                onClick={() => {
                                    setModalPage(1);
                                    setModalBlock(null);
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors mr-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => downloadCSV(viewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider">{cols[0]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[1]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[2]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider">{cols[3]}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {viewData.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500 italic">No data available</td>
                                </tr>
                            ) : (
                                currentData.map((row, idx) => {
                                    const targeted = row.total_targeted || 0;
                                    const achieved = row.total_achieved || 0;
                                    const rate = targeted > 0 ? ((achieved / targeted) * 100).toFixed(1) : 0;
                                    const name = viewMode === 'block' ? row.block_name : row.panchayat_name;

                                    return (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-slate-50 transition-colors ${viewMode === 'block' ? 'cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (viewMode === 'block') {
                                                    setModalBlock(name);
                                                    setModalPage(1);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800 flex items-center gap-2">
                                                {name}
                                                {viewMode === 'block' && <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100" />}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 text-right">{targeted.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 text-right">{achieved.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rate >= 60 ? 'bg-emerald-100 text-emerald-700' : rate >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalItems > itemsPerPage && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white sticky bottom-0 z-10">
                        <span className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> entries
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setModalPage(prev => Math.max(1, prev - 1))}
                                disabled={safeModalPage === 1}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeModalPage === 1 ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setModalPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeModalPage === totalPages}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeModalPage === totalPages ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 max-w-7xl mx-auto min-h-screen flex flex-col bg-slate-50/50 pb-12">
            <header className="mb-4 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Beneficiary Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Real-time overview of targets and achievements</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-50 p-1.5 rounded-lg"><MapPin className="w-4 h-4 text-orange-600" /></div>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">Total Districts</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Districts}>{overall.Total_Districts || 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-50 p-1.5 rounded-lg"><Grid className="w-4 h-4 text-cyan-600" /></div>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">Total Blocks</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Blocks}>{overall.Total_Blocks || 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-1.5 rounded-lg"><Target className="w-4 h-4 text-blue-600" /></div>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">Total Targeted</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Targeted?.toLocaleString()}>{overall.Total_Targeted ? overall.Total_Targeted.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-1.5 rounded-lg"><Trophy className="w-4 h-4 text-emerald-600" /></div>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">Total Achieved</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Achieved?.toLocaleString()}>{overall.Total_Achieved ? overall.Total_Achieved.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-center gap-2 relative z-10 mb-1">
                        <div className="bg-violet-50 p-1.5 rounded-lg"><Activity className="w-4 h-4 text-violet-600" /></div>
                        <p className="text-xs font-medium text-slate-500 line-clamp-1">Achievement Rate</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 tracking-tight relative z-10 truncate" title={`${achievementRate}%`}>{achievementRate}%</h2>
                    <div className="absolute bottom-0 left-0 h-1 bg-violet-500 transition-all duration-1000 ease-out" style={{ width: `${achievementRate}%` }} />
                </div>
            </div>

            {/* Container for Map and Table */}
            <div className="flex-1 mt-6 flex flex-col items-center gap-6">
                {/* Visualizations / Map - taking up full width of window */}
                <div className="flex w-full flex-col shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 flex flex-col flex-1 min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center mb-1 shrink-0 px-1">
                            Geographical View
                        </h3>
                        <div className="relative flex-1 w-full border border-slate-100 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-4" data-tooltip-id="map-tooltip">
                            <div className="w-full max-w-4xl h-full flex items-center justify-center">
                                <ComposableMap
                                    projection="geoMercator"
                                    width={800}
                                    height={500}
                                    projectionConfig={{
                                        scale: 7500,
                                        center: [85.7, 25.9]
                                    }}
                                    className="w-full h-full object-contain"
                                >
                                    <Geographies geography={geoUrl}>
                                        {({ geographies }) =>
                                            geographies.map((geo) => {
                                                const dName = geo.properties.Dist_Name || geo.properties.name || "";
                                                const currentDist = districtData.find(d => normalizeDistrictName(d.district_name) === normalizeDistrictName(dName));
                                                const achieved = currentDist ? currentDist.total_achieved : 0;
                                                const targeted = currentDist ? currentDist.total_targeted : 0;

                                                let tooltipHtml = `
                                                    <div class="text-sm">
                                                        <div class="font-bold text-base mb-1 border-b border-white/20 pb-1">${dName.toUpperCase() || 'UNKNOWN'}</div>
                                                        <div>Targeted: <span class="font-semibold">${targeted.toLocaleString()}</span></div>
                                                        <div>Achieved: <span class="font-semibold">${achieved.toLocaleString()}</span></div>
                                                        <div>Rate: <span class="font-semibold">${targeted > 0 ? ((achieved / targeted) * 100).toFixed(1) : 0}%</span></div>
                                                    </div>
                                                `;

                                                const isSelected = selectedDistrict && normalizeDistrictName(selectedDistrict) === normalizeDistrictName(dName);

                                                return (
                                                    <Geography
                                                        key={geo.rsmKey}
                                                        geography={geo}
                                                        data-tooltip-id="my-tooltip"
                                                        data-tooltip-html={tooltipHtml}
                                                        fill={currentDist ? colorScale(achieved) : "#cbd5e1"}
                                                        stroke={isSelected ? "#10b981" : "#ffffff"}
                                                        strokeWidth={isSelected ? 2 : 0.5}
                                                        onClick={() => {
                                                            setModalDistrict(dName);
                                                            setModalBlock(null);
                                                            setModalPage(1);
                                                        }}
                                                        style={{
                                                            default: { outline: "none", transition: "all 0.2s" },
                                                            hover: { fill: "#10b981", outline: "none", cursor: "pointer" },
                                                            pressed: { fill: "#059669", outline: "none" },
                                                        }}
                                                    />
                                                );
                                            })
                                        }
                                    </Geographies>
                                </ComposableMap>

                                {/* Map Legend Overlay */}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-sm border border-slate-200 p-3 rounded-lg z-10 w-40">
                                    <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1.5">Achievement Scale</h4>
                                    <div className="space-y-1.5">
                                        {[
                                            { color: "#1e3a8a", label: "Highest" },
                                            { color: "#3b82f6", label: "Moderate" },
                                            { color: "#93c5fd", label: "Lower" },
                                            { color: "#dbeafe", label: "Lowest" },
                                            { color: "#cbd5e1", label: "No Data" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center text-[10px] font-medium text-slate-600">
                                                <div className="w-3 h-3 rounded-[2px] mr-2 shadow-inner border border-black/5" style={{ backgroundColor: item.color }}></div>
                                                {item.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Data - taking up full width below map */}
                <div className="flex-1 w-full flex flex-col shrink-0 min-h-[400px]">
                    {renderMainTable()}
                </div>
            </div>

            {/* Modal for Drill-Down (Block/Panchayat) */}
            {
                modalDistrict && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 lg:p-8 backdrop-blur-sm shadow-2xl">
                        <div className="bg-white w-full max-w-5xl h-full max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-indigo-600" />
                                        {modalDistrict.toUpperCase()} Focus
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Performance details within this district</p>
                                </div>
                                <button
                                    onClick={() => { setModalDistrict(null); setModalBlock(null); setModalPage(1); }}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors group"
                                >
                                    <X className="w-5 h-5 text-slate-500 group-hover:text-slate-800" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50/50">
                                {/* District Map Focus inside Modal */}
                                <div className="w-full lg:w-1/3 p-4 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">District Selection</h3>

                                    {(() => {
                                        const mData = districtData.find(d => normalizeDistrictName(d.district_name) === normalizeDistrictName(modalDistrict)) || { total_targeted: 0, total_achieved: 0 };
                                        const mTargeted = mData.total_targeted || 0;
                                        const mAchieved = mData.total_achieved || 0;
                                        const mRate = mTargeted > 0 ? ((mAchieved / mTargeted) * 100).toFixed(1) : 0;
                                        return (
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase">Target</p>
                                                    <p className="text-sm font-bold text-slate-800">{mTargeted.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase">Achieved</p>
                                                    <p className="text-sm font-bold text-indigo-600">{mAchieved.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm text-center">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase">Rate</p>
                                                    <p className={`text-sm font-bold ${mRate >= 60 ? 'text-emerald-600' : mRate >= 30 ? 'text-amber-500' : 'text-rose-500'}`}>{mRate}%</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 relative min-h-[250px] overflow-hidden flex items-center justify-center p-2">
                                        {(() => {
                                            const bounds = districtBounds[modalDistrict ? normalizeDistrictName(modalDistrict) : ""] || { scale: 9000, center: [85.7, 25.9] };

                                            // Reduce the scale slightly so the district boundaries don't hit the very edges of the container
                                            const adjustedScale = bounds.scale * 0.85;

                                            return (
                                                <ComposableMap
                                                    projection="geoMercator"
                                                    width={400}
                                                    height={400}
                                                    projectionConfig={{
                                                        scale: adjustedScale,
                                                        center: bounds.center
                                                    }}
                                                    className="w-full h-full object-contain"
                                                >
                                                    <Geographies geography={geoUrl}>
                                                        {({ geographies }) =>
                                                            geographies.map((geo) => {
                                                                const dName = geo.properties.Dist_Name || geo.properties.name || "";
                                                                const isSelected = normalizeDistrictName(modalDistrict) === normalizeDistrictName(dName);

                                                                if (!isSelected) return null;

                                                                return (
                                                                    <Geography
                                                                        key={geo.rsmKey}
                                                                        geography={geo}
                                                                        fill="#10b981"
                                                                        stroke="#047857"
                                                                        strokeWidth={1.5}
                                                                        style={{
                                                                            default: { outline: "none" },
                                                                            hover: { outline: "none" },
                                                                            pressed: { outline: "none" },
                                                                        }}
                                                                    />
                                                                );
                                                            })
                                                        }
                                                    </Geographies>
                                                </ComposableMap>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Data Table inside Modal */}
                                <div className="flex-1 p-4 flex flex-col min-h-[300px]">
                                    {renderModalTable()}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <ReactTooltip id="my-tooltip" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', padding: '12px', zIndex: 1000 }} />
        </div >
    );
};

export default Dashboard;
