import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Briefcase, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Navigation = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
            <div className="px-4 md:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">
                            Beneficiary <span className="text-indigo-600">Survey Dash</span>
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-1 lg:ml-8">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
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
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                                }`
                            }
                        >
                            <Calendar className="w-4 h-4" />
                            Date-wise
                        </NavLink>
                        <NavLink
                            to="/business"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                                }`
                            }
                        >
                            <Briefcase className="w-4 h-4" />
                            Business Performance
                        </NavLink>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all border border-slate-200 dark:border-slate-600 shrink-0"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Slider (Hidden on Desktop) */}
            <div className="md:hidden px-4 pb-3 overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex items-center gap-1 min-w-max">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300'
                            }`
                        }
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Main Dashboard
                    </NavLink>
                    <NavLink
                        to="/datewise"
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300'
                            }`
                        }
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Date-wise
                    </NavLink>
                    <NavLink
                        to="/business"
                        className={({ isActive }) =>
                            `px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-300'
                            }`
                        }
                    >
                        <Briefcase className="w-3.5 h-3.5" />
                        Business Performance
                    </NavLink>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
