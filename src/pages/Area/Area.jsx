import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Map, Plus, Search, Edit2, Trash2, Sliders, CheckCircle, 
  XCircle, MapPin, Loader2, AlertCircle, X, Navigation, RefreshCw, Compass, Crosshair, Check
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

  // --- Google Maps & DOM References ---
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const editorRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey,
    libraries: googleMapsLibraries
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  const mapCenterCoordinates = useMemo(() => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
    return defaultCenter;
  }, [formData.latitude, formData.longitude]);

  // Handler: Capture coordinates on raw click directly on map terrain
  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  }, []);

  // Handler: Marker drag to fine-tune center point
  const onMarkerDragEnd = useCallback((e) => {
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
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (mapRef.current && !isNaN(lat) && !isNaN(lng)) {
      mapRef.current.panTo({ lat, lng });
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

  const resetFormState = () => {
    setIsEditing(false);
    setSelectedAreaId(null);
    setFormData({ 
      name: "", 
      city: "", 
      latitude: "", 
      longitude: "", 
      radius_km: 5, 
      is_active: true 
    });
  };

  // --- Working Edit Trigger Handler ---
  const handleEditTrigger = (area) => {
    setIsEditing(true);
    setSelectedAreaId(area._id);

    // Coordinate resolution: supports GeoJSON [lng, lat] and direct flat fields
    let rawLng = "";
    let rawLat = "";

    if (area.center_location?.coordinates && Array.isArray(area.center_location.coordinates)) {
      rawLng = area.center_location.coordinates[0];
      rawLat = area.center_location.coordinates[1];
    } else if (area.longitude !== undefined && area.latitude !== undefined) {
      rawLng = area.longitude;
      rawLat = area.latitude;
    }

    const latNum = Number(rawLat);
    const lngNum = Number(rawLng);

    const formattedLat = !isNaN(latNum) && rawLat !== "" ? String(latNum) : "";
    const formattedLng = !isNaN(lngNum) && rawLng !== "" ? String(lngNum) : "";

    setFormData({
      name: area.name || "",
      city: area.city || "",
      longitude: formattedLng,
      latitude: formattedLat,
      radius_km: area.radius_km || 5,
      is_active: area.is_active ?? true
    });

    // Pan & zoom the Google Map viewport to the selected area
    if (mapRef.current && !isNaN(latNum) && !isNaN(lngNum) && formattedLat && formattedLng) {
      mapRef.current.panTo({ lat: latNum, lng: lngNum });
      mapRef.current.setZoom(14);
    }

    // Scroll smoothly to editor on smaller screens
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setGlobalError(null);

      const lat = Number(formData.latitude);
      const lng = Number(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        setGlobalError("Please provide valid numerical coordinates for Latitude and Longitude.");
        return;
      }

      const payload = {
        name: formData.name.trim(),
        city: formData.city.trim(),
        latitude: lat,
        longitude: lng,
        radius_km: Number(formData.radius_km),
        is_active: formData.is_active
      };

      const response = isEditing
        ? await accountClient.put(`/areas/update/${selectedAreaId}`, payload, { headers })
        : await accountClient.post("/areas/create", payload, { headers });

      if (response.data.success) {
        resetFormState();
        fetchAreas();
      }
    } catch (err) {
      setGlobalError(err.response?.data?.message || "Failed to commit perimeter adjustments to database.");
    } finally {
      setSubmitting(false);
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
      setGlobalError(err.response?.data?.message || "Failed to delete area.");
      setLoading(false);
    }
  };

  const filteredAreas = useMemo(() => {
    return areas.filter(area => {
      const matchesSearch = area.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            area.city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = cityFilter === "all" || area.city?.toLowerCase() === cityFilter.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [areas, searchTerm, cityFilter]);

  return (
    <div className="p-8 space-y-6 max-w-[1750px] mx-auto text-slate-800 antialiased bg-slate-50/40 min-h-screen">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">

<Map className="text-blue-600 w-7 h-7" />
Hyper-Local Area Perimeters
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">
            Define physical shopping hubs, search locations using Google Places API, and map geofenced radius rings
          </p>
        </div>
        <button 
          onClick={fetchAreas} 
          className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl transition cursor-pointer"
          title="Refresh Data"
        >
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
              <input 
                type="text" 
                placeholder="Search area zone titles..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/10 outline-none" 
              />
            </div>
            <select 
              value={cityFilter} 
              onChange={(e) => setCityFilter(e.target.value)} 
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer"
            >
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
              {filteredAreas.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-slate-100 p-12 text-center text-slate-400 text-xs font-bold">
                  No areas found matching the search criteria.
                </div>
              ) : (
                filteredAreas.map((area) => {
                  const areaLng = area.center_location?.coordinates?.[0] ?? area.longitude ?? "N/A";
                  const areaLat = area.center_location?.coordinates?.[1] ?? area.latitude ?? "N/A";
                  const isSelected = selectedAreaId === area._id;

                  return (
                    <div 
                      key={area._id} 
                      className={`bg-white rounded-[24px] border p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                        isSelected 
                          ? "border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/10" 
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${area.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                            {area.is_active ? "Active" : "Suspended"}
                          </span>
                          <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 rounded-md px-2 py-0.5 tracking-wider">
                            {area.city?.toUpperCase()}
                          </span>
                          <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-2 py-0.5 tracking-wider">
                            {area.radius_km} KM Radius
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200 rounded-md px-2 py-0.5 tracking-wider">
                              Editing Now
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base leading-snug">{area.name}</h4>
                          <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-slate-400 mt-1">
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <Navigation size={11} className="rotate-45 text-blue-500"/> Lat: {areaLat}
                            </span>
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <Compass size={11} className="text-blue-500"/> Lng: {areaLng}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 justify-end w-full md:w-auto">
                        <button 
                          type="button"
                          onClick={() => handleEditTrigger(area)} 
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                            isSelected 
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                              : "text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-white border-slate-200"
                          }`}
                          title="Edit this perimeter"
                        >
                          <Edit2 size={13} />
                          <span className="hidden sm:inline">{isSelected ? "Editing" : "Edit"}</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteTrigger(area._id)} 
                          className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition cursor-pointer"
                          title="Delete perimeter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* --- RIGHT HAND PANEL: INTERACTIVE GOOGLE MAPS EDITOR SIDEBAR --- */}
        <div 
          ref={editorRef}
          className="xl:col-span-5 bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm sticky top-6 space-y-5"
        >
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={15} className="text-blue-600"/> 
                {isEditing ? "Modify Area Scope" : "Define New Boundary"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {isEditing ? "Updating existing sector settings and radius ring" : "Search or tap on Google Maps to grab exact radial center points"}
              </p>
            </div>
            {isEditing && (
              <button 
                type="button"
                onClick={resetFormState} 
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer"
                title="Cancel Edit"
              >
                <X size={12}/> Cancel
              </button>
            )}
          </div>

          {/* Places Autocomplete Search Form Header Bar Container */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              Google Places Address Lookup
            </label>
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

          {/* Interactive Core Google Map Canvas */}
          <div className="space-y-1 relative">
            <div className="w-full relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
              {isLoaded ? (
                <>
                  <GoogleMap 
                    mapContainerStyle={mapContainerStyle} 
                    center={mapCenterCoordinates} 
                    zoom={formData.latitude ? 14 : 9} 
                    onClick={onMapClick} 
                    onLoad={onMapLoad} 
                    options={{ mapTypeControl: false, streetViewControl: false }}
                  >
                    {formData.latitude && formData.longitude && (
                      <>
                        <Marker 
                          position={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} 
                          draggable={true}
                          onDragEnd={onMarkerDragEnd}
                        />
                        <Circle 
                          center={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} 
                          radius={Number(formData.radius_km || 5) * 1000} 
                          options={circleOptions} 
                        />
                      </>
                    )}
                  </GoogleMap>
                  {formData.latitude && (
                    <button 
                      type="button" 
                      onClick={panToTarget} 
                      className="absolute bottom-4 right-4 bg-white p-2.5 rounded-xl text-blue-600 shadow-md hover:bg-slate-50 transition border border-slate-200 cursor-pointer"
                      title="Center Map on Target"
                    >
                      <Crosshair size={15} />
                    </button>
                  )}
                </>
              ) : (
                <div className="h-80 w-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest gap-2">
                  <Loader2 className="animate-spin text-blue-600" size={18} /> Initializing API Modules...
                </div>
              )}
            </div>
            {formData.latitude && (
              <p className="text-[10px] text-slate-400 italic">Tip: Click anywhere on the map or drag the pin to adjust position.</p>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Area / Market Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g., Dhobi Bazaar Hub" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target City Mapping</label>
                <input 
                  type="text" 
                  name="city" 
                  required 
                  value={formData.city} 
                  onChange={handleInputChange} 
                  placeholder="e.g., Bathinda" 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-slate-800" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Latitude Position</label>
                <input 
                  type="number" 
                  step="any" 
                  name="latitude" 
                  required 
                  value={formData.latitude} 
                  onChange={handleInputChange} 
                  placeholder="30.2112"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Longitude Position</label>
                <input 
                  type="number" 
                  step="any" 
                  name="longitude" 
                  required 
                  value={formData.longitude} 
                  onChange={handleInputChange} 
                  placeholder="74.9454"
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-800" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Geofence Radius ({formData.radius_km} km)
                </label>
              </div>
              <input 
                type="number" 
                min="1" 
                max="50" 
                name="radius_km" 
                required 
                value={formData.radius_km} 
                onChange={handleInputChange} 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700" 
              />
            </div>

            <div className="flex items-center gap-2 p-1 pt-2 border-t border-slate-50">
              <input 
                type="checkbox" 
                id="is_active" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleInputChange} 
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500/20 cursor-pointer" 
              />
              <label htmlFor="is_active" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">
                Activate changes across system discovery pipelines
              </label>
            </div>

            <div className="pt-2 flex gap-2">
              {isEditing && (
                <button 
                  type="button" 
                  onClick={resetFormState}
                  className="w-1/3 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                disabled={submitting} 
                className={`h-11 ${isEditing ? "w-2/3" : "w-full"} bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={14}/>
                ) : isEditing ? (
                  <Check size={14} strokeWidth={2.5}/>
                ) : (
                  <Plus size={14} strokeWidth={2.5}/>
                )}
                {submitting 
                  ? "Processing Coordinates..." 
                  : isEditing 
                  ? "Save Boundary Adjustments" 
                  : "Deploy Live Geofenced Area"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AdminAreasDashboard;