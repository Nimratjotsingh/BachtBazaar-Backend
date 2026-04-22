import React, { useEffect, useMemo, useState } from 'react';
import { Users, Store, ArrowUpRight, Loader2, AlertCircle } from 'lucide-react';
import { accountClient, buildAuthHeaders } from '../../lib/api'; 

const AdminDashboard = ({token}) => {
  const [data, setData] = useState({ totalUsers: '0', totalMerchants: '0' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Ensure this matches your backend route prefix (e.g., /api/admin/stats)
        const res = await accountClient.get('/admin/stats',{headers});
        
        if (res.data.success) {
          setData(res.data.data);
          console.log(res.data)
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
        setError("Could not load latest metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Defined here so it uses the 'data' state
  const stats = [
    { 
      label: 'Total Users', 
      value: data.totalUsers, 
      icon: <Users size={26} />, 
      color: 'bg-sky-600',
      trend: '+12%' 
    },
    { 
      label: 'Total Merchants', 
      value: data.totalMerchants, 
      icon: <Store size={26} />, 
      color: 'bg-indigo-600',
      trend: '+5%'
    }
  ];

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 text-sky-400">
        <Loader2 className="animate-spin" size={40} />
        <p className="font-bold text-xs uppercase tracking-widest animate-pulse">
          Syncing Platform Data...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-sky-900 tracking-tight">Dashboard</h1>
        <p className="text-sky-500 font-medium text-sm mt-1">Real-time platform growth metrics.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm hover:shadow-xl hover:shadow-sky-100/50 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              {/* <div className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                {stat.trend} <ArrowUpRight size={12} />
              </div> */}
            </div>
            
            <div>
              <p className="text-xs font-black text-sky-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-5xl font-black text-sky-900 tracking-tighter transition-all">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-sky-100 p-12 text-center group hover:border-sky-300 transition-colors">
        <p className="text-sky-300 font-bold text-sm uppercase tracking-widest group-hover:text-sky-500 transition-colors">
          Additional metrics will appear here as the platform grows
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;