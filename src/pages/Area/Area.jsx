import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Map, Plus, Search, Edit2, Trash2, Sliders, CheckCircle, 
  XCircle, MapPin, Loader2, AlertCircle, X, Navigation, RefreshCw, Compass, Crosshair
} from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from "@react-google-maps/api";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const mapContainerStyle = {
  width: "100%",
  height: "340px",
  borderRadius: "16px"
};

const defaultCenter = {
  lat: 30.2112,
  lng: 74.9454
};

const circleOptions = {
  strokeColor: "#2563eb",
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: "#3b82f6",
  fillOpacity: 0.15,
  clickable: false,
  draggable: false,
  editable: false,
  visible: true,
  zIndex: 1
};

// Explicitly define required maps libraries to prevent runtime reload memory leaks
const googleMapsLibraries = ["places"];

const AdminAreasDashboard = ({ token, googleMapsApiKey }) => {
  // --- Core Lifecycle States ---
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // --- Filter View States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");

  // --- Form Controls States ---
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    latitude: "",
    longitude: "",
    radius_km: 5,
    is_active: true
  });

  // --- Google Maps References ---
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey,
    libraries: googleMapsLibraries // FIXED: Loaded places query module
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const mapCenterCoordinates = useMemo(() => {
    if (formData.latitude && formData.longitude) {
      return { lat: Number(formData.latitude), lng: Number(formData.longitude) };
    }
    return defaultCenter;
  }, [formData.latitude, formData.longitude]);

  // Handler: Capture coordinates on structural raw click events directly onto map terrain
  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  }, []);

  // Handler: Process location selections inside the address autocomplete bar
  const onPlaceSelected = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      
      if (!place.geometry || !place.geometry.location) {
        alert("Selected location contains no valid geometry coordinate maps data.");
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      // Parse out city name text components dynamically from address structures if available
      let foundCity = "";
      const addressComponents = place.address_components || [];
      for (const component of addressComponents) {
        if (component.types.includes("locality")) {
          foundCity = component.long_name;
          break;
        }
      }

      setFormData(prev => ({
        ...prev,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        city: foundCity || prev.city,
        name: prev.name || place.name || ""
      }));

      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(14);
      }
    }
  };

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);
  const onAutocompleteLoad = (autocomplete) => { autocompleteRef.current = autocomplete; };

  const panToTarget = () => {
    if (mapRef.current && formData.latitude && formData.longitude) {
      mapRef.current.panTo({ lat: Number(formData.latitude), lng: Number(formData.longitude) });
      mapRef.current.setZoom(14);
    }
  };

  // =========================================================
  // PIPELINE 1: FETCH DATA CHANNELS
  // =========================================================
  const fetchAreas = async () => {
    try {
      setLoading(true);
      setGlobalError(null);
      const res = await accountClient.get("/areas/admin-list", { headers });
      if (res.data.success) setAreas(res.data.data || []);
    } catch (err) {
      setGlobalError("Failed to collect system geofencing area matrix listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAreas(); }, [token]);

  // =========================================================
  // PIPELINE 2: MUTATION OPS CONTRACT 
  // =========================================================
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setGlobalError(null);

      const payload = {
        name: formData.name,
        city: formData.city,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        radius_km: Number(formData.radius_km),
        is_active: formData.is_active
      };

      const response = isEditing
        ? await accountClient.put(`/areas/update/${selectedAreaId}`, payload, { headers })
        : await accountClient.post("/areas/create", payload, { headers });

      if (response.data.success) {
        resetFormState();
        fetchAreas();
        alert("Area geofence configuration successfully committed.");
      }
    } catch (err) {
      setGlobalError(err.response?.data?.message || "Failed to commit perimeter adjustments to database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTrigger = (area) => {
    setIsEditing(true);
    setSelectedAreaId(area._id);
    const lng = area.center_location?.coordinates[0] ?? "";
    const lat = area.center_location?.coordinates[1] ?? "";

    setFormData({
      name: area.name,
      city: area.city,
      longitude: lng,
      latitude: lat,
      radius_km: area.radius_km || 5,
      is_active: area.is_active ?? true
    });

    if (mapRef.current && lat && lng) {
      mapRef.current.panTo({ lat: Number(lat), lng: Number(lng) });
      mapRef.current.setZoom(14);
    }
  };

  const handleDeleteTrigger = async (id) => {
    if (!window.confirm("Delete this hyper-local area boundary?")) return;
    try {
      setLoading(true);
      await accountClient.delete(`/areas/delete/${id}`, { headers });
      if (selectedAreaId === id) resetFormState();
      fetchAreas();
    } catch (err) {
      setGlobalError(err.response?.data?.message || "Failed to strip area metrics.");
      setLoading(false);
    }
  };

  const resetFormState = () => {
    setIsEditing(false);
    setSelectedAreaId(null);
    setFormData({ name: "", city: "", latitude: "", longitude: "", radius_km: 5, is_active: true });
  };

  const filteredAreas = useMemo(() => {
    return areas.filter(area => {
      const matchesSearch = area.name.toLowerCase().includes(searchTerm.toLowerCase()) || area.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = cityFilter === "all" || area.city.toLowerCase() === cityFilter.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [areas, searchTerm, cityFilter]);

  return (
    <div className="p-8 space-y-6 max-w-[1750px] mx-auto text-slate-800 antialiased bg-slate-50/40 min-h-screen">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <Map className="text-blue-600 w-7 h-7" /> Hyper-Local Area Perimeters
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Define physical shopping hubs, search locations using Google Places API, and map geofenced radius rings</p>
        </div>
        <button onClick={fetchAreas} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl transition cursor-pointer">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {globalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
          <AlertCircle size={16} /> {globalError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* --- LEFT HAND PANELS: DATA TABLE CARDS LEDGERS --- */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Search area zone titles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none" />
            </div>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer">
              <option value="all">Filter By City (All)</option>
              {["all", ...new Set(areas.map(a => a.city).filter(Boolean))].filter(c => c !== "all").map(city => (
                <option key={city} value={city}>{city.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-24 text-center text-blue-600 shadow-xs">
              <Loader2 className="animate-spin inline-block mb-2" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Geofenced Sectors Matrices...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAreas.map((area) => (
                <div key={area._id} className={`bg-white rounded-[24px] border p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${selectedAreaId === area._id ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-100"}`}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${area.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200"}`}>{area.is_active ? "Active" : "Suspended"}</span>
                      <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 rounded-md px-2 py-0.5 tracking-wider">{area.city.toUpperCase()}</span>
                      <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-2 py-0.5 tracking-wider">{area.radius_km} KM Radius</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base leading-snug">{area.name}</h4>
                      <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5 text-slate-500"><Navigation size={11} className="rotate-45"/> Lat: {area.center_location?.coordinates[1]}</span>
                        <span className="flex items-center gap-0.5 text-slate-500"><Compass size={11}/> Lng: {area.center_location?.coordinates[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => handleEditTrigger(area)} className="p-2.5 text-slate-500 hover:text-blue-600 bg-slate-50 border rounded-xl transition cursor-pointer"><Edit2 size={13} /></button>
                    <button onClick={() => handleDeleteTrigger(area._id)} className="p-2.5 text-slate-500 hover:text-rose-600 bg-slate-50 border rounded-xl transition cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- RIGHT HAND PANEL: INTERACTIVE GOOGLE MAPS EDITOR SIDEBAR --- */}
        <div className="xl:col-span-5 bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm sticky top-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <Sliders size={15} className="text-blue-600"/> {isEditing ? "Modify Area Scope" : "Define Boundary"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Search or tap on Google Maps to grab exact radial center points</p>
            </div>
            {isEditing && <button onClick={resetFormState} className="p-1.5 bg-slate-50 text-slate-400 hover:text-slate-700 border rounded-lg transition"><X size={14}/></button>}
          </div>

          {/* Places Autocomplete Search Form Header Bar Container */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Google Places Address Lookup</label>
            {isLoaded ? (
              <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceSelected}>
                <input
                  type="text"
                  placeholder="Type marketplace name, venue, road or landmark..."
                  className="w-full p-2.5 bg-blue-50/50 border border-blue-200 font-medium rounded-xl outline-none text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-xs"
                />
              </Autocomplete>
            ) : (
              <div className="h-10 bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
            )}
          </div>

          {/* Interactive Core Google Map Object Layout Canvas */}
          <div className="space-y-1 relative">
            <div className="w-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
              {isLoaded ? (
                <>
                  <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenterCoordinates} zoom={formData.latitude ? 14 : 9} onClick={onMapClick} onLoad={onMapLoad} options={{ mapTypeControl: false, streetViewControl: false }}>
                    {formData.latitude && formData.longitude && (
                      <>
                        <Marker position={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} />
                        <Circle center={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} radius={Number(formData.radius_km || 5) * 1000} options={circleOptions} />
                      </>
                    )}
                  </GoogleMap>
                  {formData.latitude && (
                    <button type="button" onClick={panToTarget} className="absolute bottom-4 right-4 bg-white p-2.5 rounded-xl text-blue-600 shadow-md hover:bg-slate-50 transition border border-slate-200 cursor-pointer"><Crosshair size={15} /></button>
                  )}
                </>
              ) : (
                <div className="h-80 w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest gap-2"><Loader2 className="animate-spin text-blue-600" size={18} /> Initializing API Modules...</div>
              )}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Area / Market Name</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g., Dhobi Bazaar Hub" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target City Mapping</label>
                <input type="text" name="city" required value={formData.city} onChange={handleInputChange} placeholder="e.g., Bathinda" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Latitude Position</label>
                <input type="number" step="any" name="latitude" required value={formData.latitude} onChange={handleInputChange} className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Longitude Position</label>
                <input type="number" step="any" name="longitude" required value={formData.longitude} onChange={handleInputChange} className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Geofence Cap Radius Bounds (Kilometers)</label>
              <input type="number" min="1" max="50" name="radius_km" required value={formData.radius_km} onChange={handleInputChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700" />
            </div>

            <div className="flex items-center gap-2 p-1 pt-2 border-t border-slate-50">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500/20" />
              <label htmlFor="is_active" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">Activate changes across system discovery pipelines</label>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={submitting} className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer">
                {submitting ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14} strokeWidth={2.5}/>}
                {submitting ? "Processing Coordinates..." : isEditing ? "Save Boundary Adjustments" : "Deploy Live Geofenced Area"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminAreasDashboard;