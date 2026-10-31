import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { accountClient } from "../../lib/api"; // or your API client instance

const StaffLoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const response = await accountClient.post("/staff/login", {
        email: email.trim(),
        password,
      });

      if (response.data.success && response.data.token) {
        onLogin(response.data.token);
        navigate("/staff/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Staff Login Submission Error:", err);
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans antialiased">
      <div className="max-w-md w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl space-y-8 border border-slate-100">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Portal Login</h1>
          <p className="text-xs text-slate-400 font-medium">
            Sign in with your corporate credentials to access operations
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@company.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-xs font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? "Authenticating..." : "Sign In to Staff Portal"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Need an account? Contact your <strong className="text-slate-700 font-bold">System Super Administrator</strong>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default StaffLoginPage;