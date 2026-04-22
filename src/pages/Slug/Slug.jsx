import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import axios from "axios"; // Using standard axios for public routes

const LegalViewPage = () => {
  const { slug } = useParams(); // Grabs the slug from /legal/:slug
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // URL must match your backend PUBLIC route: /api/legal/slug/:slug
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/legal/slug/${slug}`);
        console.log(response)
        
        if (response.data.success) {
          setDoc(response.data.doc);
        }
      } catch (err) {
        console.error("Policy fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [slug]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          Loading Document...
        </p>
      </div>
    );
  }

  // 2. Error / Not Found State
  if (error || !doc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={48} className="text-rose-500" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">404 - Page Not Found</h1>
        <p className="text-slate-500 max-w-md mb-8">
          The legal document you are looking for doesn't exist or has been moved. 
          Please check the URL or return to the homepage.
        </p>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Top Header/Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Verified Policy</span>
          </div>
        </div>
      </nav>

      {/* Document Content */}
      <main className="max-w-4xl mx-auto px-6 mt-12">
        <article className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 md:p-16">
          <header className="mb-12 border-b border-slate-100 pb-8">
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <FileText size={24} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">{doc.type}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {doc.title}
            </h1>
            <p className="mt-4 text-slate-400 text-sm font-medium">
              Last Updated: {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </p>
          </header>

          {/* Render the content */}
          <div className="prose prose-blue max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
              {doc.content}
            </div>
          </div>

          <footer className="mt-20 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} BachtBazaar Platform
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
};

export default LegalViewPage;