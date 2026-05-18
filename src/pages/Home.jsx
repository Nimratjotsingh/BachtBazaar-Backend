import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Store, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  Users, 
  TrendingUp,
  Search,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900">
      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">
              Bachat<span className="text-indigo-600">Bazaar</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-slate-500">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#merchants" className="hover:text-indigo-600 transition">For Merchants</a>
            <a href="#app" className="hover:text-indigo-600 transition">Get App</a>
            <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition shadow-lg shadow-indigo-100" onClick={()=>navigate('/login')}>
              Sign In
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-xs font-black uppercase tracking-widest">
              <Zap size={14} /> The Future of Local Savings
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Shop Smarter, <br />
              <span className="text-indigo-600">Save Bigger.</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-lg leading-relaxed">
              Connect directly with verified local merchants. Get exclusive deals, 
              digital transparency, and a premium shopping experience tailored for your city.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-sm tracking-widest hover:scale-105 transition shadow-2xl shadow-indigo-200" onClick={()=>navigate('/login')}>
                Start Saving Now <ArrowRight size={18} />
              </button>
              <button className="flex items-center justify-center gap-3 px-8 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-slate-50 transition"onClick={()=>navigate('/login')}>
                Become a Merchant
              </button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-indigo-500/10 blur-[100px] rounded-full"></div>
            <div className="relative bg-white border border-slate-200 p-4 rounded-[40px] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-700">
              <div className="bg-slate-50 rounded-[32px] p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-10 w-10 bg-indigo-600 rounded-xl" />
                    <div className="flex gap-1">
                        {[1,2,3].map(i => <div key={i} className="h-2 w-2 rounded-full bg-indigo-200" />)}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-8 bg-white border border-slate-100 rounded-xl w-3/4 shadow-sm" />
                    <div className="h-40 bg-indigo-100 rounded-3xl animate-pulse" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-20 bg-white rounded-2xl border border-slate-100" />
                        <div className="h-20 bg-white rounded-2xl border border-slate-100" />
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TRUST STATS --- */}
      <section className="bg-slate-900 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between gap-12">
            {[
                { label: "Active Shoppers", val: "50k+", icon: Users },
                { label: "Verified Shops", val: "1.2k+", icon: Store },
                { label: "Annual Savings", val: "₹10M+", icon: TrendingUp },
                { label: "Trust Score", val: "99.9%", icon: ShieldCheck }
            ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl">
                        <stat.icon className="text-indigo-400" size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white">{stat.val}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Why BachatBazaar?</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Experience Retail Innovation</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Verified Merchants",
                desc: "Every shop on our platform undergoes a rigorous document audit. Safe shopping, always.",
                icon: ShieldCheck,
                color: "bg-emerald-50 text-emerald-600"
              },
              {
                title: "Real-Time Inventory",
                desc: "See what's in stock before you leave your home. Save time and fuel on every trip.",
                icon: Search,
                color: "bg-blue-50 text-blue-600"
              },
              {
                title: "Loyalty Rewarded",
                desc: "Earn points with every purchase and unlock exclusive localized discounts.",
                icon: Star,
                color: "bg-amber-50 text-amber-600"
              }
            ].map((feat, i) => (
              <div key={i} className="p-10 bg-white border border-slate-100 rounded-[40px] hover:shadow-2xl transition group hover:-translate-y-2">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feat.color}`}>
                  <feat.icon size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{feat.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- MERCHANT CTA --- */}
      <section id="merchants" className="px-6 py-20">
        <div className="max-w-7xl mx-auto bg-indigo-600 rounded-[50px] p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-1/4" />
            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 text-white">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                        Grow your business <br /> in the digital age.
                    </h2>
                    <p className="text-indigo-100 font-medium text-lg">
                        Reach thousands of customers in your local area. Manage your shop, 
                        inventory, and analytics through our powerful Merchant Audit Suite.
                    </p>
                    <ul className="space-y-4">
                        {["Paperless Verification", "Real-time Sales Tracking", "Custom Store Branding"].map(item => (
                            <li key={item} className="flex items-center gap-3 font-bold text-sm uppercase tracking-wider">
                                <CheckCircle2 className="text-indigo-300" size={20} /> {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-[40px] p-8 border border-white/20">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-200 uppercase">Shop Name</label>
                            <div className="bg-white/10 border border-white/20 rounded-2xl h-12" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-200 uppercase">Contact Number</label>
                            <div className="bg-white/10 border border-white/20 rounded-2xl h-12" />
                        </div>
                        <button className="w-full py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-900/40">
                            Apply for Onboarding
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
            <div className="col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <ShoppingBag className="text-white" size={18} />
                    </div>
                    <span className="text-xl font-black tracking-tighter">
                    Bachat<span className="text-indigo-600">Bazaar</span>
                    </span>
                </div>
                <p className="text-slate-500 font-medium max-w-sm">
                    Reimagining the local marketplace through technology, transparency, and trust.
                </p>
            </div>
            <div className="space-y-6">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Platform</h4>
                <ul className="space-y-4 text-sm font-bold text-slate-600 uppercase tracking-tighter">
                    <li><a href="#" className="hover:text-indigo-600">About Us</a></li>
                    <li><a href="#" className="hover:text-indigo-600">Consumer App</a></li>
                    <li><a href="#" className="hover:text-indigo-600">Merchant Portal</a></li>
                </ul>
            </div>
            <div className="space-y-6">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Legal</h4>
                <ul className="space-y-4 text-sm font-bold text-slate-600 uppercase tracking-tighter">
                    <li><a href="http://bachatbazaar.tech/legal/privacy-policy" className="hover:text-indigo-600">Privacy Policy</a></li>
                    <li><a href="http://bachatbazaar.tech/legal/terms-and-condition" className="hover:text-indigo-600">Terms of Service</a></li>
                    <li><a href="#" className="hover:text-indigo-600">KYC Guidelines</a></li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                © 2026 BachatBazaar Technologies. All rights reserved.
            </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;