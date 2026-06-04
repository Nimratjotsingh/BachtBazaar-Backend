import React, { useEffect } from "react";
import {
X,
Layers,
Percent,
Store,
User,
Mail,
Phone,
MapPin,
ShieldCheck,
Sliders,
Loader2,
Calendar,
Clock,
Tag
} from "lucide-react";

const OfferDetailModal = ({
open,
offer,
loading,
onClose
}) => {
useEffect(() => {
const handleEsc = (e) => {
if (e.key === "Escape") {
onClose?.();
}
};

window.addEventListener("keydown", handleEsc);

return () => {
  window.removeEventListener("keydown", handleEsc);
};

}, [onClose]);

if (!open) return null;

const formatTimestamp = (dateString) => {
if (!dateString) return "N/A";


return new Date(dateString).toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});


};

return ( <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">

  {/* BACKDROP */}
  <div
    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
    onClick={onClose}
  />

  {/* MODAL */}
  <div className="relative w-full max-w-6xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">

    {/* HEADER */}
    <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-5 flex items-center justify-between text-white">
      <div className="flex items-center gap-2">
        <Layers className="text-indigo-400" size={18} />
        <h3 className="font-black text-sm uppercase tracking-wider">
          Offer Inspection Panel
        </h3>
      </div>

      <button
        onClick={onClose}
        className="p-2 rounded-xl hover:bg-white/10 transition"
      >
        <X size={18} />
      </button>
    </div>

    {/* LOADING */}
    {loading ? (
      <div className="h-[600px] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <p className="text-slate-500 font-medium">
          Loading offer details...
        </p>
      </div>
    ) : offer ? (
      <div className="max-h-[85vh] overflow-y-auto">

        <div className="grid lg:grid-cols-2 gap-6 p-6">

          {/* LEFT SECTION */}
          <div className="space-y-5">

            <div className="w-full h-72 rounded-3xl overflow-hidden border bg-slate-100 shadow-inner">
              {offer.thumbnail ? (
                <img
                  src={offer.thumbnail}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Percent
                    size={40}
                    className="text-slate-300"
                  />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {offer.title}
              </h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {offer.description ||
                  "No supplemental descriptions configured for this offer."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="bg-slate-50 border rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold">
                  Discount Percentage
                </p>

                <p className="text-lg font-black text-slate-900 mt-1">
                  {offer.discount_percentage
                    ? `${offer.discount_percentage}%`
                    : "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold">
                  Flat Discount
                </p>

                <p className="text-lg font-black text-slate-900 mt-1">
                  {offer.discount_value
                    ? `₹${offer.discount_value}`
                    : "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold">
                  Minimum Basket
                </p>

                <p className="text-lg font-black text-slate-900 mt-1">
                  ₹{offer.minimum_purchase_amount || 0}
                </p>
              </div>

              <div className="bg-slate-50 border rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold">
                  Display Type
                </p>

                <p className="text-sm font-black text-indigo-600 uppercase mt-1">
                  {offer.display_type || "N/A"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sliders size={14} />
                <span className="font-black text-xs uppercase tracking-wider">
                  Campaign Configuration
                </span>
              </div>

              <div className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Offer Type
                  </span>

                  <span className="font-bold">
                    {offer.offer_type_id?.label ||
                      offer.offer_type_label ||
                      "General Offer"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Start Date
                  </span>

                  <span className="font-bold">
                    {formatTimestamp(offer.start_date)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    End Date
                  </span>

                  <span className="font-bold">
                    {formatTimestamp(offer.end_date)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Status
                  </span>

                  <span className="font-bold uppercase">
                    {offer.status || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="space-y-5">

            <div className="border rounded-3xl overflow-hidden">

              <div className="bg-slate-50 px-5 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store
                    size={15}
                    className="text-indigo-600"
                  />

                  <span className="font-black uppercase text-xs tracking-wider">
                    Merchant Profile
                  </span>
                </div>

                {offer.merchant_id?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100">
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                )}
              </div>

              <div className="p-5">

                <div className="flex items-center gap-4 pb-5 border-b">

                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-lg">
                    {offer.merchant_id?.store_name?.substring(0, 2) || "M"}
                  </div>

                  <div>
                    <h3 className="font-black text-lg text-slate-900">
                      {offer.merchant_id?.store_name || "Merchant"}
                    </h3>

                    <p className="text-xs text-slate-400 mt-1">
                      Owner: {offer.merchant_id?.owner_name || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mt-5 text-sm">

                  <div className="flex items-center gap-3">
                    <Mail size={15} className="text-slate-400" />
                    <span>
                      {offer.merchant_id?.email || "N/A"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone size={15} className="text-slate-400" />
                    <span>
                      {offer.merchant_id?.contact_phone || "N/A"}
                    </span>
                  </div>

                  {offer.merchant_id?.alternative_phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={15} className="text-slate-400" />
                      <span>
                        {offer.merchant_id.alternative_phone}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin
                      size={15}
                      className="text-slate-400 mt-0.5"
                    />
                    <span>
                      {offer.merchant_id?.address ||
                        "No address available"}
                    </span>
                  </div>
                </div>

                <div className="border-t mt-5 pt-4 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    Joined:
                    {" "}
                    {formatTimestamp(
                      offer.merchant_id?.createdAt
                    )}
                  </span>

                  <span className="text-[10px] uppercase font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg">
                    {offer.merchant_id?.business_type || "Retail"}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-3xl p-5">

              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} />
                <span className="font-black uppercase text-xs tracking-wider">
                  Additional Information
                </span>
              </div>

              <div className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Offer Code
                  </span>

                  <span className="font-bold">
                    {offer.code || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Category
                  </span>

                  <span className="font-bold">
                    {offer.category_label || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Created
                  </span>

                  <span className="font-bold">
                    {formatTimestamp(offer.createdAt)}
                  </span>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    ) : null}
  </div>
</div>
);
};

export default OfferDetailModal;
