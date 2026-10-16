import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accountClient, buildAuthHeaders } from "../../lib/api";
import { 
  Store, User, Mail, Phone, MapPin, Clock, ShieldCheck, 
  Sliders, Loader2, AlertCircle, ArrowLeft, Navigation, Radio, 
  ExternalLink, Maximize2, Image as ImageIcon, Download, X, FileCheck, CheckCircle2, XCircle, Tag, Calendar
} from "lucide-react";

const AdminShopDetailView = ({ token }) => {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shopData, setShopData] = useState(null);

  // Lightbox State for Image Assets
  const [lightboxImage, setLightboxImage] = useState(null); // { src, label }

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  useEffect(() => {
    fetchShopDetails();
  }, [shopId]);

  const fetchShopDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await accountClient.get(`/admin/shops/${shopId}`, { headers });
      if (res.data.success) {
        setShopData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load shop details dossier:", err);
      setError(err.response?.data?.message || "Failed to retrieve shop profile records.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-32 text-center text-indigo-600 bg-[#FBFBFE] min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="animate-spin mb-3 w-10 h-10" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Loading merchant storefront dossier...</p>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4 bg-[#FBFBFE] min-h-screen">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 flex items-center gap-3">
          <AlertCircle size={20} /> {error || "Shop record could not be resolved."}
        </div>
      </div>
    );
  }

  const { shopInfo, taxonomy, operationalStatus, merchantProfile, verificationLogs = [], timestamps } = shopData;
  const { latitude, longitude } = shopInfo.coordinates || {};

  // Standardized week structure ensuring all 7 days display correctly
  const standardDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const weeklySchedule = operationalStatus.weeklySchedule || {};

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6 bg-[#FBFBFE] min-h-screen text-slate-800 antialiased font-sans">
      
      {/* Top Header Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Store className="text-indigo-600" size={26} /> {shopInfo.shopName}
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-0.5">
              Comprehensive Storefront Audit Dossier & Regulatory Compliance
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs ${
            operationalStatus.isOpenNow ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${operationalStatus.isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {operationalStatus.isOpenNow ? "Store Open" : "Store Closed"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: MEDIA ASSETS, LOCATION, TIMINGS, & VERIFICATION AUDIT LOGS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* --- STORE MEDIA ASSETS CAROUSEL / GRID --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ImageIcon size={15} className="text-indigo-600" /> Storefront Visual Assets & Facade
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Store Facade / Photo", src: shopInfo.storeFrontUrl },
                { label: "Banner Artwork", src: shopInfo.bannerUrl },
                { label: "Brand Logo", src: shopInfo.logoUrl },
              ].map((asset, i) => (
                <div key={i} className="relative aspect-video bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden group flex items-center justify-center p-2">
                  {asset.src ? (
                    <>
                      <img src={asset.src} alt={asset.label} className="w-full h-full object-contain" />
                      <button
                        onClick={() => setLightboxImage({ src: asset.src, label: `${shopInfo.shopName} - ${asset.label}` })}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition cursor-pointer shadow-md"
                        title="Zoom Image"
                      >
                        <Maximize2 size={13} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-600 space-y-1">
                      <ImageIcon size={24} className="mx-auto" />
                      <span className="text-[10px] font-bold block">{asset.label} (Not Provided)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* --- LOCATION & GEOSPATIAL METRICS CARD --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <MapPin size={15} className="text-indigo-600" /> Geospatial & Address Coordinates
              </h3>
              {latitude && longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 transition"
                >
                  <Navigation size={12} /> Open in Google Maps <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Street Address</span>
                <strong className="text-slate-800">{shopInfo.address || "Unspecified"} {shopInfo.address1}</strong>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">City & Region</span>
                <strong className="text-slate-800">{shopInfo.city || "N/A"}</strong>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">GPS Coordinates (Lat, Lng)</span>
                <strong className="font-mono text-slate-800">
                  {latitude !== null && longitude !== null ? `${latitude}, ${longitude}` : "GPS Unstamped"}
                </strong>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Visibility Radius</span>
                <strong className="text-slate-800">{shopInfo.visibilityRadiusKm} km coverage</strong>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Store Taxonomy Category</span>
                <strong className="text-indigo-600">{taxonomy.category?.label || "Uncategorized"}</strong>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Sub-Category</span>
                <strong className="text-slate-700">{taxonomy.subCategory?.label || "None"}</strong>
              </div>
            </div>

            {shopInfo.description && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Storefront Bio Description</span>
                {shopInfo.description}
              </div>
            )}
          </div>

          {/* --- COMPLETE WEEKLY TIMINGS SCHEDULE MATRIX --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Clock size={15} className="text-indigo-600" /> Complete Weekly Opening Hours Matrix
            </h3>

            <div className="divide-y divide-slate-100">
              {standardDays.map((day) => {
                const schedule = weeklySchedule[day] || { isClosed: true, open: "09:00", close: "21:00" };
                return (
                  <div key={day} className="py-3 flex items-center justify-between text-xs capitalize">
                    <span className="font-extrabold text-slate-700 w-32 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {day}
                    </span>
                    {schedule.isClosed ? (
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        Closed Full Day
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-900 bg-slate-50 px-3.5 py-1 rounded-lg border border-slate-100">
                        {schedule.open || "09:00"} — {schedule.close || "21:00"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- GOVERNMENT & REGULATORY VERIFICATION AUDIT LOGS --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FileCheck size={15} className="text-indigo-600" /> Regulatory Verification Audit Logs (IDfy)
            </h3>

            {verificationLogs.length === 0 ? (
              <p className="text-xs font-medium text-slate-400 italic py-4 text-center bg-slate-50 rounded-2xl border border-slate-100">
                No government verification audit logs recorded for this merchant profile yet.
              </p>
            ) : (
              <div className="space-y-3">
                {verificationLogs.map((log, idx) => (
                  <div key={log._id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-[10px]">
                          {log.type}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          log.isValid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {log.isValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {log.isValid ? "Verified Valid" : "Verification Failed"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.completedAt ? new Date(log.completedAt).toLocaleString("en-IN") : "Pending"}
                      </span>
                    </div>

                    {/* Extracted Top-Level Details (Name, Document Number, DOB) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Entity Name</span>
                        <strong className="text-slate-800 text-xs">{log.name || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Document Number</span>
                        <strong className="font-mono text-indigo-600 text-xs">{log.documentNumber || "N/A"}</strong>
                      </div>
                      {/* <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Date of Birth / Reg.</span>
                        <strong className="font-mono text-slate-800 text-xs">{log.dob || "N/A"}</strong>
                      </div> */}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-600">
                      <div><strong className="text-slate-400 font-sans">Request ID:</strong> {log.requestId}</div>
                      <div><strong className="text-slate-400 font-sans">Status:</strong> {log.status}</div>
                    </div>

                    {/* Result Output Details */}
                    {log.resultOutput && Object.keys(log.resultOutput).length > 0 && (
                      <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
                        <span className="text-[10px] font-black font-sans uppercase text-slate-400 block mb-1">Registry Output Summary</span>
                        {Object.entries(log.resultOutput).map(([key, val], i) => {
                          if (typeof val === "object" && val !== null) return null;
                          return (
                            <div key={i} className="flex justify-between border-b border-slate-50 py-0.5">
                              <span className="text-slate-400">{key}:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[250px]">{String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: MERCHANT PROFILE, OVERRIDE STATUS, & TIMESTAMPS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* --- READ-ONLY OPERATIONAL OVERRIDE STATUS BOX --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Radio size={15} className="text-indigo-600" /> Operational Override Status
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Override Mode</span>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-black text-[10px]">
                  {operationalStatus.manualOverrideConfig.status || "AUTO"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">Status Reason</span>
                <p className="text-slate-700 font-semibold leading-relaxed">
                  {operationalStatus.manualOverrideConfig.reason || "Operating normally under standard weekly schedule parameters."}
                </p>
              </div>
            </div>
          </div>

          {/* --- OWNER MERCHANT PARTNER PROFILE CARD --- */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <User size={15} className="text-indigo-600" /> Owner Partner Profile
            </h3>

            {merchantProfile ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-slate-500">
                    {merchantProfile.profileImage ? (
                      <img src={merchantProfile.profileImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      (merchantProfile.name || "M")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                      {merchantProfile.name || "Merchant Owner"}
                      {merchantProfile.isVerified && <ShieldCheck size={14} className="text-emerald-500" />}
                    </h4>
                    <p className="text-slate-400 text-[11px] font-medium">{merchantProfile.email || "No email provided"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2 text-slate-600">
                  <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> <span>{merchantProfile.phone || shopInfo.phone || "N/A"}</span></div>
                  <div className="flex items-center gap-2"><Radio size={13} className="text-slate-400" /> <span>Status: <strong className="uppercase text-slate-800">{merchantProfile.status || "Active"}</strong></span></div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-400 italic">No parent merchant entity linked to this store record.</p>
            )}
          </div>

          {/* --- SYSTEM AUDIT TIMESTAMPS --- */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/60 text-[11px] font-semibold text-slate-500 space-y-1.5">
            <div className="flex justify-between">
              <span>Record Created:</span>
              <strong className="text-slate-700">{timestamps?.createdAt ? new Date(timestamps.createdAt).toLocaleString("en-IN") : "N/A"}</strong>
            </div>
            <div className="flex justify-between">
              <span>Last Modified:</span>
              <strong className="text-slate-700">{timestamps?.updatedAt ? new Date(timestamps.updatedAt).toLocaleString("en-IN") : "N/A"}</strong>
            </div>
          </div>

        </div>

      </div>

      {/* --- ROOT LEVEL FULLSCREEN IMAGE LIGHTBOX MODAL --- */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-5xl mx-auto">
            <span className="text-white font-black text-xs uppercase tracking-wider truncate max-w-md bg-black/40 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
              {lightboxImage.label}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.src}
                download="storefront-asset.jpg"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition border border-white/10 cursor-pointer"
                title="Download Graphic"
              >
                <Download size={16} />
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition border border-white/10 cursor-pointer"
                title="Close Fullscreen"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div 
            className="w-full h-full flex items-center justify-center p-4 max-w-5xl max-h-[80vh]"
            onClick={(e) => { if (e.target === e.currentTarget) setLightboxImage(null); }}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.label}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminShopDetailView;