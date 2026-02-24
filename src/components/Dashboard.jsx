import { useEffect, useState, useMemo } from 'react';
import { fetchOverallKpi, fetchDistrictKpi, fetchBlockKpi } from '../api';
import { Activity, Target, Trophy, MapPin, Grid, X, Download } from 'lucide-react';
import { geoPath, geoMercator } from 'd3-geo';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { scaleQuantile } from 'd3-scale';

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
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedDistrictGeo, setSelectedDistrictGeo] = useState(null);

    // Map geojson
    const geoUrl = "/bihar.geojson";

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [overallRes, districtRes, blockRes] = await Promise.all([
                fetchOverallKpi(),
                fetchDistrictKpi(),
                fetchBlockKpi()
            ]);
            setOverall(overallRes);
            setDistrictData(districtRes);
            setBlockData(blockRes);
            setLoading(false);
        };
        loadData();
    }, []);

    // Create a color scale for the map based on achievement
    const colorScale = useMemo(() => {
        if (!districtData || districtData.length === 0) return () => "#e2e8f0";
        // Calculate percentages or use raw achievements. Here we use total_achieved for simplicity.
        const values = districtData.map(d => d.total_achieved);
        if (Math.max(...values) === 0) return () => "#e2e8f0";

        return scaleQuantile()
            .domain(values)
            .range([
                "#dbeafe", // lighter blue
                "#bfdbfe",
                "#93c5fd",
                "#60a5fa",
                "#3b82f6",
                "#2563eb",
                "#1d4ed8",
                "#1e40af",
                "#1e3a8a"  // darker blue
            ]);
    }, [districtData]);

    const achievementRate = useMemo(() => {
        return overall.Total_Targeted > 0
            ? ((overall.Total_Achieved / overall.Total_Targeted) * 100).toFixed(1)
            : 0;
    }, [overall]);

    // Filter block data for the selected district
    const selectedBlockData = useMemo(() => {
        if (!selectedDistrict || !blockData) return [];
        return blockData.filter(b => normalizeDistrictName(b.district_name) === normalizeDistrictName(selectedDistrict));
    }, [selectedDistrict, blockData]);

    const downloadCSV = () => {
        if (!selectedBlockData || selectedBlockData.length === 0) return;

        const headers = ['District Name', 'Block Name', 'Targeted', 'Achieved', 'Achievement Rate (%)'];
        const rows = selectedBlockData.map(block => {
            const rate = block.total_targeted > 0 ? ((block.total_achieved / block.total_targeted) * 100).toFixed(1) : 0;
            return [
                `"${block.district_name}"`,
                `"${block.block_name}"`,
                block.total_targeted,
                block.total_achieved,
                rate
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedDistrict.replace(/\s+/g, '_').toLowerCase()}_block_performance.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadDistrictCSV = () => {
        if (!districtData || districtData.length === 0) return;

        const headers = ['District Name', 'Targeted', 'Achieved', 'Achievement Rate (%)'];
        const rows = districtData.map(dist => {
            const rate = dist.total_targeted > 0 ? ((dist.total_achieved / dist.total_targeted) * 100).toFixed(1) : 0;
            return [
                `"${dist.district_name}"`,
                dist.total_targeted,
                dist.total_achieved,
                rate
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bihar_district_performance.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-xl font-semibold text-slate-500 animate-pulse">Loading Dashboard...</div>
            </div>
        );
    }

    const renderMiniMap = () => {
        if (!selectedDistrictGeo) return null;

        const width = 300;
        const height = 300;
        // fitSize automatically calculates the bounding box and scales/translates perfectly
        const projection = geoMercator().fitSize([width, height], selectedDistrictGeo);
        const pathGenerator = geoPath().projection(projection);
        const d = pathGenerator(selectedDistrictGeo);

        const currentDist = districtData.find(dist =>
            normalizeDistrictName(dist.district_name) === normalizeDistrictName(selectedDistrict)
        );
        const achieved = currentDist ? currentDist.total_achieved : 0;
        const fill = currentDist ? colorScale(achieved) : "#cbd5e1";

        return (
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="drop-shadow-md">
                <path d={d} fill={fill} stroke="#ffffff" strokeWidth={1.5} className="transition-all duration-500 hover:brightness-110" />
            </svg>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Beneficiary Dashboard</h1>
                <p className="text-slate-500 mt-2">Real-time overview of targets and achievements</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-50 p-2 rounded-lg"><MapPin className="w-5 h-5 text-orange-600" /></div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1">Total Districts</p>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Districts}>{overall.Total_Districts || 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-50 p-2 rounded-lg"><Grid className="w-5 h-5 text-cyan-600" /></div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1">Total Blocks</p>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Blocks}>{overall.Total_Blocks || 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1">Total Targeted</p>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Targeted?.toLocaleString()}>{overall.Total_Targeted ? overall.Total_Targeted.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-2 rounded-lg"><Trophy className="w-5 h-5 text-emerald-600" /></div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1">Total Achieved</p>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight truncate" title={overall.Total_Achieved?.toLocaleString()}>{overall.Total_Achieved ? overall.Total_Achieved.toLocaleString() : 0}</h2>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10 mb-2">
                        <div className="bg-violet-50 p-2 rounded-lg"><Activity className="w-5 h-5 text-violet-600" /></div>
                        <p className="text-sm font-medium text-slate-500 line-clamp-1">Achievement Rate</p>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight relative z-10 truncate" title={`${achievementRate}%`}>{achievementRate}%</h2>
                    <div className="absolute bottom-0 left-0 h-1 bg-violet-500 transition-all duration-1000 ease-out" style={{ width: `${achievementRate}%` }} />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-8 mt-8">
                {/* District Map */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                            District-wise Performance (Bihar)
                        </h3>
                        <button
                            onClick={downloadDistrictCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold transition-colors"
                            title="Download district data as CSV"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>
                    <div className="relative w-full h-[600px] md:h-[700px] border border-slate-100 rounded-lg overflow-hidden bg-slate-50" data-tooltip-id="map-tooltip">
                        <ComposableMap
                            projection="geoMercator"
                            projectionConfig={{
                                scale: 6500,
                                center: [85.6, 25.8]
                            }}
                            className="w-full h-full"
                            style={{ width: "100%", height: "100%" }}
                        >
                            <Geographies geography={geoUrl}>
                                {({ geographies }) =>
                                    geographies.map((geo) => {
                                        const dName = geo.properties.Dist_Name || geo.properties.name || "";
                                        // Find district data ignoring case and some spaces
                                        const currentDist = districtData.find(d =>
                                            normalizeDistrictName(d.district_name) === normalizeDistrictName(dName)
                                        );

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

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                data-tooltip-id="my-tooltip"
                                                data-tooltip-html={tooltipHtml}
                                                fill={currentDist ? colorScale(achieved) : "#cbd5e1"}
                                                stroke="#ffffff"
                                                strokeWidth={0.5}
                                                onClick={() => {
                                                    setSelectedDistrict(dName);
                                                    setSelectedDistrictGeo(geo);
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
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur shadow-sm border border-slate-200 p-4 rounded-lg z-10 w-48">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">Achievement Scale</h4>
                            <div className="space-y-2">
                                {[
                                    { color: "#1e3a8a", label: "Highest" },
                                    { color: "#3b82f6", label: "Moderate" },
                                    { color: "#93c5fd", label: "Lower" },
                                    { color: "#dbeafe", label: "Lowest" },
                                    { color: "#cbd5e1", label: "No Data" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center text-xs font-medium text-slate-600">
                                        <div className="w-4 h-4 rounded-sm mr-3 shadow-inner border border-black/5" style={{ backgroundColor: item.color }}></div>
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            {/* Modal for District Block-wise Performance */}
            {selectedDistrict && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDistrict(null)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-800">{selectedDistrict.toUpperCase()} - Block-wise Performance</h2>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={downloadCSV}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold transition-colors"
                                    title="Download data as CSV"
                                >
                                    <Download className="w-4 h-4" />
                                    Download CSV
                                </button>
                                <button onClick={() => setSelectedDistrict(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                            {/* Mini Map Column */}
                            <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-6 flex flex-col items-center justify-center">
                                <div className="w-full max-w-[300px] aspect-square">
                                    {renderMiniMap()}
                                </div>
                                {(() => {
                                    const currentDist = districtData.find(d => normalizeDistrictName(d.district_name) === normalizeDistrictName(selectedDistrict));
                                    if (!currentDist) return null;
                                    const rate = currentDist.total_targeted > 0 ? ((currentDist.total_achieved / currentDist.total_targeted) * 100).toFixed(1) : 0;
                                    return (
                                        <div className="mt-8 text-center w-full">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <p className="text-xs text-slate-500 font-medium">Targeted</p>
                                                    <p className="font-bold text-slate-800 text-lg">{currentDist.total_targeted.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <p className="text-xs text-slate-500 font-medium">Achieved</p>
                                                    <p className="font-bold text-slate-800 text-lg">{currentDist.total_achieved.toLocaleString()}</p>
                                                </div>
                                                <div className="col-span-2 bg-violet-50 p-3 rounded-xl border border-violet-100 shadow-sm">
                                                    <p className="text-xs text-violet-600 font-medium">Achievement Rate</p>
                                                    <p className="font-bold text-violet-900 text-xl">{rate}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Data Table Column */}
                            <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-white">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Grid className="w-5 h-5 text-slate-400" />
                                    Block Details ({selectedBlockData.length})
                                </h3>
                                {selectedBlockData.length > 0 ? (
                                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Block Name</th>
                                                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Targeted</th>
                                                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Achieved</th>
                                                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {selectedBlockData.map((block, idx) => {
                                                    const rate = block.total_targeted > 0 ? ((block.total_achieved / block.total_targeted) * 100).toFixed(1) : 0;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{block.block_name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{block.total_targeted.toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{block.total_achieved.toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rate > 50 ? 'bg-emerald-100 text-emerald-700' : rate > 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                    {rate}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500 font-medium">No block data available for this district.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ReactTooltip id="my-tooltip" place="top" style={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', padding: '12px', zIndex: 1000 }} />
        </div>
    );
};

export default Dashboard;
