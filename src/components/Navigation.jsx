import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar } from 'lucide-react';

const Navigation = () => {
    return (
        <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-800 tracking-tight">Beneficiary<span className="text-indigo-600">Dash</span></span>
                </div>

                <div className="hidden md:flex space-x-1 lg:ml-8">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Main Dashboard
                    </NavLink>
                    <NavLink
                        to="/datewise"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        <Calendar className="w-4 h-4" />
                        Date-wise Achievement
                    </NavLink>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
