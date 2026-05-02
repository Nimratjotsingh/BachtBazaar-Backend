import React from 'react';
import { 
  Search, Filter, RotateCcw, MoreVertical, Eye, 
  Phone, Mail, MapPin, TrendingUp, Plus, 
  Utensils, Shirt, Smartphone, Heart, Home, ShoppingBag 
} from 'lucide-react';

const MerchantListTable = () => {
  const merchants = [
    { id: 'BBM10001', name: "Domino's Pizza", contact: '9876543210', email: 'dominos@gmail.com', category: 'Food & Beverages', plan: 'Premium', revenue: '₹2,45,678', trend: '+ 18.3%', status: 'Active', icon: <Utensils size={14} />, catColor: 'text-blue-600 bg-blue-50', planColor: 'text-orange-600 bg-orange-50' },
    { id: 'BBM10002', name: "Pizza Hub", contact: '9876543211', email: 'pizzahub@gmail.com', category: 'Food & Beverages', plan: 'Standard', revenue: '₹1,25,430', trend: '+ 12.7%', status: 'Active', icon: <Utensils size={14} />, catColor: 'text-blue-600 bg-blue-50', planColor: 'text-blue-600 bg-blue-50' },
    { id: 'BBM10003', name: "Fashion House", contact: '9876543212', email: 'fashion@gmail.com', category: 'Fashion', plan: 'Premium', revenue: '₹98,760', trend: '+ 22.1%', status: 'Active', icon: <Shirt size={14} />, catColor: 'text-purple-600 bg-purple-50', planColor: 'text-orange-600 bg-orange-50' },
    { id: 'BBM10004', name: "ElectroMart", contact: '9876543213', email: 'info@electromart.com', category: 'Electronics', plan: 'Standard', revenue: '₹1,78,345', trend: '+ 15.4%', status: 'Active', icon: <Smartphone size={14} />, catColor: 'text-blue-600 bg-blue-50', planColor: 'text-blue-600 bg-blue-50' },
    { id: 'BBM10005', name: "Beauty & More", contact: '9876543214', email: 'care@beautymore.com', category: 'Beauty & Health', plan: 'Basic', revenue: '₹56,780', trend: '+ 8.9%', status: 'Inactive', icon: <Heart size={14} />, catColor: 'text-pink-600 bg-pink-50', planColor: 'text-emerald-600 bg-emerald-50' },
    { id: 'BBM10006', name: "Home Decor", contact: '9876543215', email: 'homedecor@gmail.com', category: 'Home & Living', plan: 'Standard', revenue: '₹87,654', trend: '+ 11.2%', status: 'Active', icon: <Home size={14} />, catColor: 'text-orange-600 bg-orange-50', planColor: 'text-blue-600 bg-blue-50' },
    { id: 'BBM10007', name: "Rahul Store", contact: '9876543216', email: 'rahulstore@gmail.com', category: 'General Store', plan: 'Basic', revenue: '₹23,450', trend: '+ 2.3%', status: 'Inactive', icon: <ShoppingBag size={14} />, catColor: 'text-green-600 bg-green-50', planColor: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="flex gap-6 p-6 bg-[#F8FAFC] min-h-screen font-sans">
      {/* --- LEFT: MERCHANT TABLE SECTION --- */}
      <div className="flex-1">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-slate-200 mb-6 text-sm font-medium text-slate-500">
          <button className="pb-3 text-blue-600 border-b-2 border-blue-600 flex items-center gap-2">All Merchants <span className="bg-blue-100 px-2 py-0.5 rounded-full text-[10px]">24,568</span></button>
          <button className="pb-3 flex items-center gap-2">Active <span className="text-[10px]">18,765</span></button>
          <button className="pb-3 flex items-center gap-2">Inactive <span className="text-[10px]">5,803</span></button>
          <button className="pb-3 flex items-center gap-2">Pending Approval <span className="text-[10px]">312</span></button>
          <button className="pb-3 flex items-center gap-2">Suspended <span className="text-[10px]">204</span></button>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Search merchant..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white" />
          </div>
          <FilterSelect label="All Categories" />
          <FilterSelect label="All Plans" />
          <FilterSelect label="All Cities" />
          <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold bg-blue-50/50">
            <Filter size={16} /> More Filters
          </button>
          <button className="flex items-center gap-1 text-blue-600 text-sm font-bold ml-2">
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded" /></th>
                <th className="px-4 py-4">Merchant Details</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Category</th>
                <th className="px-4 py-4">Plan</th>
                <th className="px-4 py-4">Revenue (30D)</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {merchants.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{m.name}</p>
                        <p className="text-[10px] text-slate-400">ID: {m.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[11px]">
                    <p className="text-slate-700 font-medium">{m.contact}</p>
                    <p className="text-slate-400">{m.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-md text-[10px] font-bold ${m.catColor}`}>
                      {m.icon} {m.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-bold border border-current opacity-80 ${m.planColor}`}>
                      {m.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{m.revenue}</p>
                    <p className="text-[10px] text-green-500 font-bold">{m.trend}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${m.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      <div className={`size-1.5 rounded-full ${m.status === 'Active' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2 text-slate-400">
                      <Eye size={18} className="cursor-pointer hover:text-blue-500" />
                      <MoreVertical size={18} className="cursor-pointer hover:text-slate-600" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RIGHT: MERCHANT OVERVIEW SIDEBAR --- */}
      <div className="w-96 space-y-4">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="size-16 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center p-2">
               <div className="size-full bg-red-600 rounded-lg flex items-center justify-center text-white font-black text-xl italic">D</div>
            </div>
            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full">Active</span>
          </div>
          <h2 className="text-xl font-black text-slate-800">Domino's Pizza</h2>
          <p className="text-xs text-slate-400 mb-6 font-bold">ID: BBM10001</p>
          
          <div className="space-y-3">
            <ContactInfo icon={<Phone size={14}/>} text="9876543210" />
            <ContactInfo icon={<Mail size={14}/>} text="dominos@gmail.com" />
            <ContactInfo icon={<MapPin size={14}/>} text="Connaught Place, New Delhi" />
          </div>
        </div>

        {/* Performance Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-sm">Performance (Last 30 Days)</h3>
            <button className="text-blue-600 text-[10px] font-bold">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatBox label="Revenue" val="₹2,45,678" trend="+ 18.3%" />
            <StatBox label="Redemptions" val="1,245" trend="+ 16.7%" />
            <StatBox label="Offers Created" val="12" trend="+ 9.1%" />
            <StatBox label="Conversion Rate" val="12.3%" trend="+ 4.2%" />
          </div>
          
          {/* Chart Area */}
          <div className="relative h-32 w-full mt-4">
            <svg viewBox="0 0 400 100" className="w-full h-full">
              <path 
                d="M0 80 Q 50 85, 100 70 T 200 75 T 300 40 T 400 60" 
                fill="none" 
                stroke="#8B5CF6" 
                strokeWidth="3" 
              />
              <circle cx="300" cy="40" r="4" fill="#8B5CF6" />
            </svg>
            <div className="absolute top-0 right-10 bg-slate-800 text-white p-2 rounded-lg text-[10px]">
              <p className="font-bold text-center">₹18,750</p>
              <p className="opacity-70">11 Jun</p>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-bold px-1">
              <span>19 May</span><span>26 May</span><span>02 Jun</span><span>09 Jun</span><span>16 Jun</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-3 border border-blue-200 rounded-xl text-blue-600 text-xs font-bold bg-blue-50/30">
              <Eye size={16} /> View Profile
            </button>
            <button className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold">
              <Plus size={16} /> Create Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Helper Components */
const FilterSelect = ({ label }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:border-blue-400">
    {label} <TrendingUp size={14} className="rotate-90 text-slate-400" />
  </div>
);

const ContactInfo = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-slate-600">
    <div className="text-slate-400">{icon}</div>
    <span className="text-[11px] font-bold">{text}</span>
  </div>
);

const StatBox = ({ label, val, trend }) => (
  <div className="bg-slate-50/50 border border-slate-50 p-3 rounded-xl">
    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-tighter">{label}</p>
    <div className="flex items-baseline justify-between">
      <span className="text-sm font-black text-slate-800">{val}</span>
      <span className="text-[9px] text-green-500 font-bold">{trend}</span>
    </div>
  </div>
);

export default MerchantListTable;