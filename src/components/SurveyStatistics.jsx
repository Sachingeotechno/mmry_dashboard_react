import React, { useState, useEffect } from 'react';
import { fetchSurveyStatistics } from '../service/datalayer';
import { Download, ArrowLeft, ChevronRight, Home, Database, MapPin } from 'lucide-react';

const SurveyStatistics = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View state: null means district view, otherwise holds the district name
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState(0);

    const loadData = async (districtId) => {
        setLoading(true);
        const result = await fetchSurveyStatistics(districtId);
        setData(result);
        setLoading(false);
    };

    useEffect(() => {
        loadData(selectedDistrictId);
    }, [selectedDistrictId]);

    const handleRowClick = (item) => {
        // Only drill down if we are on the district view
        if (!selectedDistrict) {
            setSelectedDistrict(item.Name);
            setSelectedDistrictId(item.district_id);
        }
    };

    const handleBackClick = () => {
        setSelectedDistrict(null);
        setSelectedDistrictId(0);
    };

    const downloadCSV = () => {
        if (!data || data.length === 0) return;

        const isDistrictView = !selectedDistrict;
        
        const headers = [
            isDistrictView ? 'District Name' : 'Block Name',
            'Total SHG',
            'Total Mapped SHG',
            'Total Beneficiary',
            'Total CM',
            'Total Mapped CM',
            'Total Mapped Beneficiary',
            'Survey Completed Beneficiary'
        ];

        const rows = data.map(d => [
            `"${d.Name}"`,
            d.Total_SHG || 0,
            d.Total_Mapped_SHG || 0,
            d.Total_Beneficiary || 0,
            d.Total_CM || 0,
            d.Total_Mapped_CM || 0,
            d.Total_Mapped_Beneficiary || 0,
            d.Survey_Completed_Beneficiary || 0
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = isDistrictView 
            ? 'bihar_survey_statistics_districts.csv' 
            : `${selectedDistrict.replace(/\s+/g, '_').toLowerCase()}_survey_statistics_blocks.csv`;
            
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isDistrictView = !selectedDistrict;
    const title = isDistrictView ? 'District-wise Survey Statistics' : `Block-wise Survey Statistics in ${selectedDistrict}`;

    return (
        <div className="p-4 max-w-7xl mx-auto min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-900/50 pb-12 transition-colors duration-300">
            <header className="mb-6 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Survey Statistics
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed breakdown of SHGs, Beneficiaries, and CMs</p>
                </div>
            </header>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col flex-1 min-h-[500px] overflow-hidden transition-all duration-300">
                
                {/* Table Header / Toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-3">
                        {!isDistrictView && (
                            <button
                                onClick={handleBackClick}
                                className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
                                title="Back to Districts"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {isDistrictView ? <MapPin className="w-4 h-4 text-indigo-500" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
                            {title}
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Breadcrumbs */}
                        <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400 mr-2 font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                            <span 
                                className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 ${isDistrictView ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''}`}
                                onClick={handleBackClick}
                            >
                                <Home className="w-3.5 h-3.5" /> Bihar
                            </span>
                            {!isDistrictView && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 mx-1" />
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[150px]">
                                        {selectedDistrict}
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

                {/* Table Content */}
                <div className="flex-1 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 shadow-sm transition-colors">
                            <tr>
                                <th className="px-5 py-3.5 text-left font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]">
                                    {isDistrictView ? 'District Name' : 'Block Name'}
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
                                            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Loading statistics data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20">
                                        <Database className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                        <p className="font-medium text-base">No data available</p>
                                        <p className="text-sm mt-1">There are no statistics to display for this view.</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, idx) => (
                                    <tr 
                                        key={idx} 
                                        className={`group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors ${isDistrictView ? 'cursor-pointer' : ''}`}
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20 sticky left-0 z-10 shadow-[1px_0_0_0_rgba(241,245,249,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,0.5)] transition-colors flex items-center justify-between min-w-[180px]">
                                            <span>{item.Name}</span>
                                            {isDistrictView && <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        </td>
                                        
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-medium text-xs">
                                                {(item.Total_SHG || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{(item.Total_Mapped_SHG || 0).toLocaleString()}</td>
                                        
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded font-medium text-xs">
                                                {(item.Total_CM || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{(item.Total_Mapped_CM || 0).toLocaleString()}</td>
                                        
                                        <td className="px-5 py-3 text-right">
                                            <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded font-medium text-xs">
                                                {(item.Total_Beneficiary || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{(item.Total_Mapped_Beneficiary || 0).toLocaleString()}</td>
                                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-right font-medium">{(item.Survey_Completed_Beneficiary || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default SurveyStatistics;
