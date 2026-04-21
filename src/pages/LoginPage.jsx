import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, Loader2 } from "lucide-react";
import { accountClient } from "../lib/api";
import axios from 'axios';

const BachttBazaarLogin = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 🔥 Call ONLY super admin login API
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/super-admin/login`,{
        email,
        password,
      });

      const { token, admin } = response.data;

      if (!token || !admin) {
        throw new Error("Invalid response");
      }

      await localStorage.setItem('token',token);

      // ✅ Save token in App
      onLogin(token);

      // 🚀 Redirect
      navigate("/dashboard/users");

    } catch (err) {
      console.log(err);
      setError(
        err.response?.data?.message || "Invalid Super Admin credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50 font-sans">
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center shadow-lg">
            <img src="/logo.jpeg" alt="logo" />
          </div>
          <h1 className="text-3xl font-extrabold text-sky-900 tracking-tight">
            Bachtt<span className="text-sky-500">Bazaar</span>
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-sky-100 w-full max-w-md">
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-sky-100 rounded-full border-4 border-white shadow-inner">
              <User size={40} className="text-sky-600" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={submitLogin} className="space-y-5">
            
            {/* Email */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-sky-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full pl-10 pr-3 py-3 border border-sky-200 rounded-xl bg-sky-50/30 focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-sky-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-10 pr-10 py-3 border border-sky-200 rounded-xl bg-sky-50/30 focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 text-sky-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 rounded-xl text-white bg-sky-600 hover:bg-sky-700 font-bold"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={20} />
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-sky-900 text-sky-200 py-4 text-center text-xs">
        COPYRIGHT BANKBAZAAR
      </footer>
    </div>
  );
};

export default BachttBazaarLogin;