import React, { useState, useEffect, useCallback } from 'react';
import { fetchSurveyStatistics, fetchSurveyByPanchayat, fetchSurveyByCM } from '../service/datalayer';
import { Download, ArrowLeft, ChevronRight, Home, Database, MapPin, X, Users, BarChart2 } from 'lucide-react';

// ─── CM Detail Modal ──────────────────────────────────────────────────────────
const CMModal = ({ panchayatName, cmData, loading, onClose }) => {
    const total_shg        = cmData.reduce((s, r) => s + (r.total_shg        || 0), 0);
    const total_beneficiary= cmData.reduce((s, r) => s + (r.total_beneficiary|| 0), 0);
    const survey_completed = cmData.reduce((s, r) => s + (r.survey_completed || 0), 0);

    const downloadCMCSV = () => {
        if (!cmData || cmData.length === 0) return;
        const headers = ['#', 'CM Name', 'Total SHG', 'Total Benf.', 'Survey Completed'];
        const rows = cmData.map((cm, idx) => [
            idx + 1,
            `"${cm.cm_name || ''}"`,
            cm.total_shg || 0,
            cm.total_beneficiary || 0,
            cm.survey_completed || 0,
        ]);
        const totalRow = ['"TOTAL"', '""', total_shg, total_beneficiary, survey_completed];
        const csv  = [headers.join(','), ...rows.map(r => r.join(',')), totalRow.join(',')].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${panchayatName.replace(/\s+/g, '_').toLowerCase()}_cm_survey.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-900/20 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                CM-wise Survey — {panchayatName}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Community Mobiliser breakdown for selected panchayat
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={downloadCMCSV}
                            disabled={loading || cmData.length === 0}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm border ${
                                loading || cmData.length === 0
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 cursor-not-allowed'
                                : 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50'
                            }`}
                            title="Export CM data as CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">Loading CM data…</span>
                        </div>
                    ) : cmData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
                            <BarChart2 className="w-8 h-8" />
                            <p className="font-medium">No CM data available</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/80">
                                <tr>
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">#</th>
                                    <th className="px-5 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">CM Name</th>
                                    <th className="px-5 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total SHG</th>
                                    <th className="px-5 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total Benf.</th>
                                    <th className="px-5 py-3 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Survey Completed</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
                                {cmData.map((cm, idx) => (
                                    <tr key={cm.cm_id ?? idx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 transition-colors">
                                        <td className="px-5 py-3 text-slate-400 dark:text-slate-500 font-medium">{idx + 1}</td>
                                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{cm.cm_name}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium text-xs">
                                                {(cm.total_shg || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-medium text-xs">
                                                {(cm.total_beneficiary || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded font-medium text-xs">
                                                {(cm.survey_completed || 0).toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {/* Total row */}
                                <tr className="bg-slate-100 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-600">
                                    <td className="px-5 py-3" />
                                    <td className="px-5 py-3 font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />TOTAL
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <span className="bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold text-xs">{total_shg.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold text-xs">{total_beneficiary.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded font-bold text-xs">{survey_completed.toLocaleString()}</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── View levels: 'district' | 'block' | 'panchayat' ─────────────────────────
const SurveyStatistics = () => {
    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);

    // Drill-down state
    const [view,              setView]              = useState('district'); // 'district' | 'block' | 'panchayat'
    const [selectedDistrict,  setSelectedDistrict]  = useState(null);   // { id, name }
    const [selectedBlock,     setSelectedBlock]     = useState(null);   // { id, name }

    // CM Modal state
    const [cmModal,    setCmModal]    = useState(false);
    const [cmData,     setCmData]     = useState([]);
    const [cmLoading,  setCmLoading]  = useState(false);
    const [cmPanchayat, setCmPanchayat] = useState('');

    // ── Load table data based on current view ─────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        setData([]);
        try {
            if (view === 'district') {
                const result = await fetchSurveyStatistics(0);
                setData(result);
            } else if (view === 'block') {
                // Reuse existing district-level survey stats which returns blocks when districtId given
                const result = await fetchSurveyStatistics(selectedDistrict.id);
                setData(result);
            } else if (view === 'panchayat') {
                const result = await fetchSurveyByPanchayat(selectedDistrict.id, selectedBlock.id);
                setData(result);
            }
        } finally {
            setLoading(false);
        }
    }, [view, selectedDistrict, selectedBlock]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Click handlers ────────────────────────────────────────────────────────
    const handleDistrictClick = (item) => {
        setSelectedDistrict({ id: item.district_id, name: item.Name });
        setView('block');
    };

    const handleBlockClick = (item) => {
        setSelectedBlock({ id: item.block_id, name: item.Name });
        setView('panchayat');
    };

    const handlePanchayatClick = async (item) => {
        const pName = item.panchayat_name || `Panchayat #${item.panchayat_id}`;
        setCmPanchayat(pName);
        setCmModal(true);
        setCmLoading(true);
        setCmData([]);
        try {
            const result = await fetchSurveyByCM(selectedDistrict.id, selectedBlock.id, item.panchayat_id);
            setCmData(result);
        } finally {
            setCmLoading(false);
        }
    };

    const handleBack = () => {
        if (view === 'panchayat') {
            setView('block');
            setSelectedBlock(null);
        } else if (view === 'block') {
            setView('district');
            setSelectedDistrict(null);
        }
    };

    const handleHome = () => {
        setView('district');
        setSelectedDistrict(null);
        setSelectedBlock(null);
    };

    // ── CSV Download ──────────────────────────────────────────────────────────
    const downloadCSV = () => {
        if (!data || data.length === 0) return;

        let headers, rows, totalRow;

        if (view === 'panchayat') {
            headers = ['Panchayat Name', 'Total SHG', 'Mapped SHG', 'Total CM', 'Mapped CM', 'Total Benf.', 'Mapped Benf.', 'Survey Completed'];
            rows = data.map(d => [
                `"${d.panchayat_name || d.panchayat_id || ''}"`,
                d.total_shg || 0,
                d.mapped_shg || 0,
                d.total_cm || 0,
                d.total_mapped_cm || 0,
                d.total_beneficiary || 0,
                d.total_mapped_beneficiary || 0,
                d.survey_completed || 0,
            ]);
            totalRow = [
                '"TOTAL"',
                data.reduce((s, d) => s + (d.total_shg || 0), 0),
                data.reduce((s, d) => s + (d.mapped_shg || 0), 0),
                data.reduce((s, d) => s + (d.total_cm || 0), 0),
                data.reduce((s, d) => s + (d.total_mapped_cm || 0), 0),
                data.reduce((s, d) => s + (d.total_beneficiary || 0), 0),
                data.reduce((s, d) => s + (d.total_mapped_beneficiary || 0), 0),
                data.reduce((s, d) => s + (d.survey_completed || 0), 0),
            ];
        } else {
            headers = [view === 'district' ? 'District Name' : 'Block Name', 'Total SHG', 'Mapped SHG', 'Total CM', 'Mapped CM', 'Total Benf.', 'Mapped Benf.', 'Survey Completed'];
            rows = data.map(d => [
                `"${d.Name}"`,
                d.Total_SHG || 0,
                d.Total_Mapped_SHG || 0,
                d.Total_CM || 0,
                d.Total_Mapped_CM || 0,
                d.Total_Beneficiary || 0,
                d.Total_Mapped_Beneficiary || 0,
                d.Survey_Completed_Beneficiary || 0,
            ]);
            totalRow = [
                '"TOTAL"',
                data.reduce((s, d) => s + (d.Total_SHG || 0), 0),
                data.reduce((s, d) => s + (d.Total_Mapped_SHG || 0), 0),
                data.reduce((s, d) => s + (d.Total_CM || 0), 0),
                data.reduce((s, d) => s + (d.Total_Mapped_CM || 0), 0),
                data.reduce((s, d) => s + (d.Total_Beneficiary || 0), 0),
                data.reduce((s, d) => s + (d.Total_Mapped_Beneficiary || 0), 0),
                data.reduce((s, d) => s + (d.Survey_Completed_Beneficiary || 0), 0),
            ];
        }

        const csv = [headers.join(','), ...rows.map(r => r.join(',')), totalRow.join(',')].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const name = view === 'panchayat'
            ? `${selectedBlock?.name?.replace(/\s+/g,'_').toLowerCase()}_panchayat_survey.csv`
            : view === 'block'
            ? `${selectedDistrict?.name?.replace(/\s+/g,'_').toLowerCase()}_block_survey.csv`
            : 'bihar_district_survey_statistics.csv';
        a.href       = url;
        a.download   = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Derived table helpers ─────────────────────────────────────────────────
    const isPanchayatView = view === 'panchayat';
    const isDistrictView  = view === 'district';

    // Normalise row shape so one table renderer handles all three views
    const normalise = (item) => isPanchayatView
        ? {
            label:         item.panchayat_name || `Panchayat ${item.panchayat_id}`,
            total_shg:     item.total_shg            || 0,
            mapped_shg:    item.mapped_shg            || 0,
            total_cm:      item.total_cm              || 0,
            mapped_cm:     item.total_mapped_cm       || 0,
            total_benf:    item.total_beneficiary     || 0,
            mapped_benf:   item.total_mapped_beneficiary || 0,
            survey:        item.survey_completed      || 0,
            raw:           item,
        }
        : {
            label:         item.Name,
            total_shg:     item.Total_SHG            || 0,
            mapped_shg:    item.Total_Mapped_SHG      || 0,
            total_cm:      item.Total_CM              || 0,
            mapped_cm:     item.Total_Mapped_CM       || 0,
            total_benf:    item.Total_Beneficiary     || 0,
            mapped_benf:   item.Total_Mapped_Beneficiary || 0,
            survey:        item.Survey_Completed_Beneficiary || 0,
            raw:           item,
        };

    const rows       = data.map(normalise);
    const totals     = rows.reduce(
        (acc, r) => ({
            shg:    acc.shg    + r.total_shg,
            mshg:   acc.mshg   + r.mapped_shg,
            cm:     acc.cm     + r.total_cm,
            mcm:    acc.mcm    + r.mapped_cm,
            benf:   acc.benf   + r.total_benf,
            mbenf:  acc.mbenf  + r.mapped_benf,
            survey: acc.survey + r.survey,
        }),
        { shg:0, mshg:0, cm:0, mcm:0, benf:0, mbenf:0, survey:0 }
    );

    const colLabel = isDistrictView ? 'District Name' : view === 'block' ? 'Block Name' : 'Panchayat';

    const handleRowClick = (r) => {
        if (isDistrictView)      handleDistrictClick(r.raw);
        else if (view === 'block') handleBlockClick(r.raw);
        else                     handlePanchayatClick(r.raw);
    };

    const pageTitle = isDistrictView
        ? 'District-wise Survey Statistics'
        : view === 'block'
        ? `Block-wise Survey — ${selectedDistrict?.name}`
        : `Panchayat-wise Survey — ${selectedBlock?.name}`;

    return (
        <>
        <div className="p-4 max-w-7xl mx-auto min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-900/50 pb-12 transition-colors duration-300">
            <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Survey Statistics
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Detailed breakdown of SHGs, Beneficiaries, and CMs
                    </p>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col flex-1 min-h-[500px] overflow-hidden transition-all duration-300">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-3">
                        {!isDistrictView && (
                            <button
                                onClick={handleBack}
                                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                                title="Go Back"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <MapPin className={`w-4 h-4 ${isDistrictView ? 'text-indigo-500' : view === 'block' ? 'text-emerald-500' : 'text-amber-500'}`} />
                            {pageTitle}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Breadcrumbs */}
                        <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400 mr-2 font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm gap-1">
                            <span
                                className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                                onClick={handleHome}
                            >
                                <Home className="w-3.5 h-3.5" /> Bihar
                            </span>
                            {selectedDistrict && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    <span
                                        className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[120px] ${view === 'block' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}`}
                                        onClick={() => { setView('block'); setSelectedBlock(null); }}
                                    >
                                        {selectedDistrict.name}
                                    </span>
                                </>
                            )}
                            {selectedBlock && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[120px]">
                                        {selectedBlock.name}
                                    </span>
                                </>
                            )}
                        </div>

                        <button
                            onClick={downloadCSV}
                            disabled={loading || data.length === 0}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm border ${
                                loading || data.length === 0
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50'
                            }`}
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Panchayat-view hint */}
                {isPanchayatView && !loading && data.length > 0 && (
                    <div className="px-5 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        Click on a panchayat row to view CM-wise survey breakdown.
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm transition-colors">
                            <tr>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]">
                                    {colLabel}
                                </th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total SHG</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Mapped SHG</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total CM</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Mapped CM</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total Benf.</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Mapped Benf.</th>
                                <th className="px-5 py-3.5 text-right font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Survey Completed</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50 transition-colors">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Loading statistics data…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
                                        <Database className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                        <p className="font-medium text-base">No data available</p>
                                        <p className="text-sm mt-1">There are no statistics to display for this view.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr
                                        key={idx}
                                        className="group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
                                        onClick={() => handleRowClick(r)}
                                    >
                                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20 sticky left-0 z-10 shadow-[1px_0_0_0_rgba(241,245,249,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,0.5)] transition-colors flex items-center justify-between min-w-[180px]">
                                            <span>{r.label}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-medium text-xs">
                                                {r.total_shg.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{r.mapped_shg.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded font-medium text-xs">
                                                {r.total_cm.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{r.mapped_cm.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded font-medium text-xs">
                                                {r.total_benf.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{r.mapped_benf.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{r.survey.toLocaleString()}</td>
                                    </tr>
                                ))
                            )}

                            {/* TOTAL row */}
                            {!loading && rows.length > 0 && (
                                <tr className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-t-2 border-slate-300 dark:border-slate-600">
                                    <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800/80 shadow-[1px_0_0_0_rgba(241,245,249,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,0.5)]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />TOTAL
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <span className="bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 px-2 py-1 rounded font-bold text-xs">{totals.shg.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-800 dark:text-slate-200 text-right font-black">{totals.mshg.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-right">
                                        <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded font-bold text-xs">{totals.cm.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-800 dark:text-slate-200 text-right font-black">{totals.mcm.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-right">
                                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-1 rounded font-bold text-xs">{totals.benf.toLocaleString()}</span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-800 dark:text-slate-200 text-right font-black">{totals.mbenf.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-indigo-700 dark:text-indigo-400 text-right font-black">{totals.survey.toLocaleString()}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* CM Detail Modal */}
        {cmModal && (
            <CMModal
                panchayatName={cmPanchayat}
                cmData={cmData}
                loading={cmLoading}
                onClose={() => { setCmModal(false); setCmData([]); }}
            />
        )}
        </>
    );
};

export default SurveyStatistics;
