import React, { useState, useEffect } from 'react';
import { postData, fetchData, setUserData } from './service/api';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';




const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [appversion, setAppVersion] = useState({ appversion: '', message: '', appUrl: '' });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const logindata = {
                'username': username,
                'password': password,
                'newpassword': password
            }
            const response = await postData('/User/login', logindata, {});

            // Check for unauthorized user type
            if (response.uType === 'psuadm') {
                toast.error('You are not authorized to login.');
                return;
            }

            // Store full user data and specifically the token (stored in password field per requirement)
            setUserData(response);
            console.log(response);
            localStorage.setItem('token', response.password);

            toast.success("Login Successful");

            // Redirect after a short delay to allow toast to be seen
            setTimeout(() => {
                // Redirect vendors to New Ticket Report, others to dashboard
                if (response.uType === 'vend') {
                    window.location.href = '/reports/NewTicketReport';
                } else {
                    window.location.href = '/';
                }
            }, 500);
        } catch (err) {
            toast.error(err.details || 'Invalid credentials. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        const loadAppVerion = async () => {
            try {
                // Fetching Supplier and Item list
                setIsLoading(true);
                const data = await fetchData('/Sakhi/appversion');
                //console.log("ticket data:", data);

                // Safety checks to ensure arrays exist
                if (data) {
                    setAppVersion(data || {});
                }
            } catch (err) {
                // console.error("Failed to load master data", err);
                // errorToast("Failed to load suppliers and items");
            } finally {
                setIsLoading(false);
            }
        };

        loadAppVerion();
    }, []);

    return (
        <div className="h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center font-sans selection:bg-primary selection:text-white">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0">
                {/* Texture Image Layer */}
                <div className="absolute inset-0 z-0 bg-slate-950">
                    {/* Lighter Gradient Overlay - allowing bottom art to show */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-slate-950/20 to-primary-dark/30 mix-blend-multiply"></div>
                </div>

                {/* Ambient Glows - Lighter touch */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-slate-900/40"></div>
            </div>

            {/* Glassmorphic Interaction Card - "Crystal Clear" Effect */}
            <div className="relative z-20 w-full max-w-md p-6 mx-4">
                {/* The Glass Pane - Ultra Transparent */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10"></div>

                {/* Inner Bevel/Highlight */}
                <div className="absolute inset-0 rounded-3xl ring-1 ring-white/10 opacity-50 pointer-events-none"></div>

                <div className="relative z-30 p-6 sm:p-8">
                    {/* Header Section */}
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 mx-auto mb-4 relative group flex items-center justify-center">
                            {/* Logo Glow */}
                            <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full group-hover:blur-[60px] transition-all duration-500 opacity-60"></div>
                            <img src="/jeevika.png" alt="Jeevika Logo" className="w-full h-full object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 mb-2 tracking-wide drop-shadow-sm">Welcome Back</h1>
                        <p className="text-primary-light text-[10px] tracking-[0.25em] uppercase font-bold text-shadow-sm">PASHUSAKHI</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div role="alert" aria-live="assertive" className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-100 text-sm text-center animate-fade-in-down backdrop-blur-sm shadow-inner">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="username" className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-1">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-50 placeholder-slate-500 transition-all duration-300 hover:border-white/20 hover:bg-slate-950/80"
                                placeholder="Enter your ID"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-[10px] font-bold text-slate-300 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-slate-50 placeholder-slate-500 transition-all duration-300 hover:border-white/20 hover:bg-slate-950/80 pr-12"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200 focus:outline-none focus:text-white p-1"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-5 py-3 px-4 bg-gradient-to-r from-primary-dark via-primary to-primary-light hover:from-primary hover:to-primary-light text-white font-bold tracking-widest uppercase text-sm rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border-t border-white/20"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg aria-hidden="true" className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    AUTHENTICATING...
                                </span>
                            ) : (
                                "SIGN IN"
                            )}
                        </button>
                    </form>
                </div>

                {/* Decorative Footer */}
                <div className="relative z-30 mt-4 text-center">
                    <a target="_blank"
                        href={appversion.appUrl}
                        className="block mb-3 text-primary-light hover:text-white text-[10px] tracking-widest uppercase font-bold transition-colors duration-300"
                    >
                        {/* Download Mobile App :: {appversion.appversion} */}
                    </a>
                    <div className="opacity-50">
                        <p className="text-slate-400 text-[10px] tracking-widest uppercase font-medium">POWERED BY JEEVIKA & MANAGE BY GEOTECHNOSOFT</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

