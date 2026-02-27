import { useEffect, useState, useMemo } from 'react';
import { fetchOverallKpi, fetchDistrictKpi, fetchBlockKpi, fetchPanchayatKpi } from '../api';
import { Activity, Target, Trophy, MapPin, Grid, Download, ChevronRight, ArrowLeft, Home, X } from 'lucide-react';
import { geoPath, geoMercator } from 'd3-geo';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
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
    const [loadingDrillDown, setLoadingDrillDown] = useState(false);

    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState(null);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [selectedBlockId, setSelectedBlockId] = useState(null);

    const [selectedDistrictGeo, setSelectedDistrictGeo] = useState(null);

    // Separate state for the map modal to decouple map clicks from main table drill-down path
    const [modalDistrict, setModalDistrict] = useState(null);
    const [modalDistrictId, setModalDistrictId] = useState(null);
    const [modalBlock, setModalBlock] = useState(null);
    const [modalBlockId, setModalBlockId] = useState(null);

    const [mainPage, setMainPage] = useState(1);
    const [modalPage, setModalPage] = useState(1);
    const itemsPerPage = 10;

    const geoUrl = "/bihar.geojson";

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [overallRes, districtRes] = await Promise.all([
                fetchOverallKpi(),
                fetchDistrictKpi()
            ]);
            setOverall(overallRes);
            setDistrictData(districtRes);
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

    // Fetch blocks on demand
    useEffect(() => {
        const distId = selectedDistrictId || modalDistrictId;
        if (distId) {
            const loadBlocks = async () => {
                setLoadingDrillDown(true);
                const res = await fetchBlockKpi(distId);
                setBlockData(res);
                setLoadingDrillDown(false);
            };
            loadBlocks();
        } else {
            setBlockData([]);
        }
    }, [selectedDistrictId, modalDistrictId]);

    // Fetch panchayats on demand
    useEffect(() => {
        const distId = selectedDistrictId || modalDistrictId;
        const blkId = selectedBlockId || modalBlockId;
        if (blkId) {
            const loadPanchayats = async () => {
                setLoadingDrillDown(true);
                const res = await fetchPanchayatKpi(distId, blkId);
                setPanchayatData(res);
                setLoadingDrillDown(false);
            };
            loadPanchayats();
        } else {
            setPanchayatData([]);
        }
    }, [selectedBlockId, modalBlockId, selectedDistrictId, modalDistrictId]);

    const selectedBlockData = useMemo(() => blockData, [blockData]);
    const selectedPanchayatData = useMemo(() => panchayatData, [panchayatData]);

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
        if (!selectedDistrict) {
            setSelectedDistrictId(null);
            setSelectedBlock(null);
            setSelectedBlockId(null);
        }
    }, [selectedDistrict]);

    useEffect(() => {
        if (!selectedBlock) {
            setSelectedBlockId(null);
        }
    }, [selectedBlock]);

    useEffect(() => {
        if (!modalDistrict) {
            setModalDistrictId(null);
            setModalBlock(null);
            setModalBlockId(null);
        }
    }, [modalDistrict]);

    useEffect(() => {
        if (!modalBlock) {
            setModalBlockId(null);
        }
    }, [modalBlock]);

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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col flex-1 min-h-0 overflow-hidden mt-4 transition-all">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-2">
                        {viewMode !== 'district' && (
                            <button
                                onClick={() => {
                                    setMainPage(1);
                                    if (viewMode === 'panchayat') {
                                        setSelectedBlock(null);
                                        setSelectedBlockId(null);
                                    } else {
                                        setSelectedDistrict(null);
                                        setSelectedDistrictId(null);
                                        setSelectedBlock(null);
                                        setSelectedBlockId(null);
                                    }
                                }}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors mr-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Breadcrumbs */}
                        <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400 mr-4 font-medium">
                            <span
                                className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 ${viewMode === 'district' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                                onClick={() => { setMainPage(1); setSelectedDistrict(null); setSelectedDistrictId(null); setSelectedBlock(null); setSelectedBlockId(null); }}
                            >
                                <Home className="w-3.5 h-3.5" /> Bihar
                            </span>
                            {selectedDistrict && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                                    <span
                                        className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${viewMode === 'block' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                                        onClick={() => { setMainPage(1); setSelectedBlock(null); setSelectedBlockId(null); }}
                                    >
                                        {selectedDistrict}
                                    </span>
                                </>
                            )}
                            {selectedBlock && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                                    <span className="text-indigo-600 dark:text-indigo-400">{selectedBlock}</span>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => downloadCSV(viewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm min-w-[700px]">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[0]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[1]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[2]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[3]}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700 transition-colors">
                            {loadingDrillDown ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-indigo-500 dark:text-indigo-400 font-medium">Loading data...</td></tr>
                            ) : viewData.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">No data available for this view.</td></tr>
                            ) : (
                                currentData.map((item, idx) => {
                                    const name = viewMode === 'district' ? item.district_name : viewMode === 'block' ? item.block_name : item.panchayat_name;
                                    const targeted = item.total_targeted || 0;
                                    const achieved = item.total_achieved || 0;
                                    const rate = targeted > 0 ? ((achieved / targeted) * 100).toFixed(1) : 0;

                                    return (
                                        <tr
                                            key={idx}
                                            className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer`}
                                            onClick={() => {
                                                if (viewMode === 'district') {
                                                    setMainPage(1);
                                                    setSelectedDistrict(item.district_name);
                                                    setSelectedDistrictId(item.district_id);
                                                } else if (viewMode === 'block') {
                                                    setMainPage(1);
                                                    setSelectedBlock(item.block_name);
                                                    setSelectedBlockId(item.block_id);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                                <span>{name}</span>
                                                {viewMode !== 'panchayat' && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100" />}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-right">{targeted.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-right">{achieved.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rate >= 60 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : rate >= 30 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
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
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10 transition-colors">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> entries
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setMainPage(prev => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage === 1}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeCurrentPage === 1 ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setMainPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage === totalPages}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeCurrentPage === totalPages ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col flex-1 h-full min-h-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-2">
                        {viewMode === 'panchayat' && (
                            <button
                                onClick={() => {
                                    setModalPage(1);
                                    setModalBlock(null);
                                }}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors mr-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => downloadCSV(viewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Download CSV
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm transition-colors">
                            <tr>
                                <th className="px-6 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[0]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[1]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[2]}</th>
                                <th className="px-6 py-3 text-right font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cols[3]}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loadingDrillDown ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-indigo-500 dark:text-indigo-400 font-medium">Loading data...</td></tr>
                            ) : viewData.length === 0 ? (
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
                                                    setModalBlock(row.block_name);
                                                    setModalBlockId(row.block_id);
                                                    setModalPage(1);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                {name}
                                                {viewMode === 'block' && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100" />}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-right">{targeted.toLocaleString()}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 text-right">{achieved.toLocaleString()}</td>
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
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-10 transition-colors">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> entries
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setModalPage(prev => Math.max(1, prev - 1))}
                                disabled={safeModalPage === 1}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeModalPage === 1 ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-100 dark:border-slate-800' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setModalPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeModalPage === totalPages}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${safeModalPage === totalPages ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-100 dark:border-slate-800' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'}`}
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
        <div className="p-4 max-w-7xl mx-auto min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-900/50 pb-12 transition-colors duration-300">
            <header className="mb-4 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Beneficiary Survey Dash</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time overview of targets and achievements</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col gap-2 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded-lg"><MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Total Districts</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate" title={overall.Total_Districts}>{overall.Total_Districts || 0}</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col gap-2 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2">
                        <div className="bg-cyan-50 dark:bg-cyan-900/20 p-1.5 rounded-lg"><Grid className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Total Blocks</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate" title={overall.Total_Blocks}>{overall.Total_Blocks || 0}</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col gap-2 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg"><Target className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Total Targeted</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate" title={overall.Total_Targeted?.toLocaleString()}>{overall.Total_Targeted ? overall.Total_Targeted.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col gap-2 hover:shadow-md transition-all">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-1.5 rounded-lg"><Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Total Achieved</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate" title={overall.Total_Achieved?.toLocaleString()}>{overall.Total_Achieved ? overall.Total_Achieved.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
                    <div className="flex items-center gap-2 relative z-10 mb-1">
                        <div className="bg-violet-50 dark:bg-violet-900/20 p-1.5 rounded-lg"><Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">Achievement Rate</p>
                    </div>
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight relative z-10 truncate" title={`${achievementRate}%`}>{achievementRate}%</h2>
                    <div className="absolute bottom-0 left-0 h-1 bg-violet-500 transition-all duration-1000 ease-out" style={{ width: `${achievementRate}%` }} />
                </div>
            </div>

            {/* Container for Map and Table */}
            <div className="flex-1 mt-6 flex flex-col items-center gap-6">
                {/* Visualizations / Map - taking up full width of window */}
                <div className="flex w-full flex-col shrink-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-2.5 flex flex-col flex-1 min-h-[400px] md:min-h-[500px] lg:min-h-[600px] transition-all">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center mb-1 shrink-0 px-1">
                            Geographical View
                        </h3>
                        <div className="relative flex-1 w-full border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center p-4 transition-all" data-tooltip-id="map-tooltip">
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
                                        {({ geographies }) => (
                                            <>
                                                {geographies.map((geo) => {
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
                                                                setModalDistrictId(currentDist ? currentDist.district_id : null);
                                                                setModalBlock(null);
                                                                setModalBlockId(null);
                                                                setModalPage(1);
                                                            }}
                                                            style={{
                                                                default: { outline: "none", transition: "all 0.2s" },
                                                                hover: { fill: "#10b981", outline: "none", cursor: "pointer" },
                                                                pressed: { fill: "#059669", outline: "none" },
                                                            }}
                                                        />
                                                    );
                                                })}
                                                {geographies.map((geo) => {
                                                    const dName = geo.properties.Dist_Name || geo.properties.name || "";
                                                    const projection = geoMercator()
                                                        .scale(7500)
                                                        .center([85.7, 25.9])
                                                        .translate([400, 250]);

                                                    const centroid = geoPath().projection(projection).centroid(geo);

                                                    if (!centroid || isNaN(centroid[0])) return null;

                                                    return (
                                                        <Marker key={`label-${geo.rsmKey}`} coordinates={projection.invert(centroid)}>
                                                            <text
                                                                textAnchor="middle"
                                                                y={2}
                                                                style={{
                                                                    fontFamily: "Inter, system-ui",
                                                                    fontSize: "6px",
                                                                    fontWeight: "700",
                                                                    fill: "#0f172a",
                                                                    pointerEvents: "none",
                                                                    textShadow: "0.5px 0.5px 0px rgba(255,255,255,0.8), -0.5px -0.5px 0px rgba(255,255,255,0.8), 0.5px -0.5px 0px rgba(255,255,255,0.8), -0.5px 0.5px 0px rgba(255,255,255,0.8)"
                                                                }}
                                                            >
                                                                {dName}
                                                            </text>
                                                        </Marker>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </Geographies>
                                </ComposableMap>

                                {/* Map Legend Overlay */}
                                <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-sm border border-slate-200 dark:border-slate-700 p-3 rounded-lg z-10 w-40 transition-all">
                                    <h4 className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-700 pb-1.5">Achievement Scale</h4>
                                    <div className="space-y-1.5">
                                        {[
                                            { color: "#1e3a8a", label: "Highest" },
                                            { color: "#3b82f6", label: "Moderate" },
                                            { color: "#93c5fd", label: "Lower" },
                                            { color: "#dbeafe", label: "Lowest" },
                                            { color: "#cbd5e1", label: "No Data" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center text-[10px] font-medium text-slate-600 dark:text-slate-400">
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 lg:p-8 backdrop-blur-sm shadow-2xl transition-all duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0 transition-colors">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        {modalDistrict.toUpperCase()} Focus
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Performance details within this district</p>
                                </div>
                                <button
                                    onClick={() => { setModalDistrict(null); setModalDistrictId(null); setModalBlock(null); setModalBlockId(null); setModalPage(1); }}
                                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors group"
                                >
                                    <X className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-100" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                                {/* District Map Focus inside Modal */}
                                <div className="w-full lg:w-1/3 p-4 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">District Summary</h3>

                                    {(() => {
                                        const mData = districtData.find(d => normalizeDistrictName(d.district_name) === normalizeDistrictName(modalDistrict)) || { total_targeted: 0, total_achieved: 0 };
                                        const mTargeted = mData.total_targeted || 0;
                                        const mAchieved = mData.total_achieved || 0;
                                        const mRate = mTargeted > 0 ? ((mAchieved / mTargeted) * 100).toFixed(1) : 0;
                                        return (
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Target</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{mTargeted.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Achieved</p>
                                                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{mAchieved.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm text-center">
                                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Rate</p>
                                                    <p className={`text-sm font-bold ${mRate >= 60 ? 'text-emerald-600' : mRate >= 30 ? 'text-amber-500' : 'text-rose-500'}`}>{mRate}%</p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative min-h-[250px] overflow-hidden flex items-center justify-center p-2 transition-colors">
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
