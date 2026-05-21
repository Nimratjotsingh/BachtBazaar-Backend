import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, Lock, Unlock, Save, Loader2, 
  ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Sliders
} from "lucide-react";
import { accountClient, buildAuthHeaders } from "../../lib/api";

const AdminCalendarConfig = ({ token }) => {
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    max_allowed_offers: 5,
    notes: "",
    is_locked: false,
    current_booked_count: 0
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Helper to generate a reliable string key (YYYY-MM-DD) from local dates without shifting timezones
  const formatDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formattedSelectedDate = useMemo(() => {
    return formatDateKey(selectedDate);
  }, [selectedDate]);

  // --- START: CALENDAR TIME BOUNDARY THRESHOLD CALCULATIONS ---
  const todayMidnightThreshold = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isPastDate = (date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return target < todayMidnightThreshold;
  };

  const isSelectedDateInPast = useMemo(() => {
    return isPastDate(selectedDate);
  }, [selectedDate, todayMidnightThreshold]);
  // --- END: CALENDAR TIME BOUNDARY THRESHOLD CALCULATIONS ---

  // Fetch the full month when month changes
  useEffect(() => {
    fetchMonthSchedule();
  }, [currentMonth]);

  // Make sure form data updates immediately whenever the selection OR the master schedule data updates
  useEffect(() => {
    fetchSelectedDateDetails();
  }, [formattedSelectedDate, schedule]); 

  const fetchMonthSchedule = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999));
      
      const res = await accountClient.get("/calendar-config/admin/schedule", {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        },
        headers
      });

      const scheduleMap = {};
      res.data.data?.forEach(item => {
        const dateKey = item.date.split("T")[0];
        scheduleMap[dateKey] = item;
      });
      setSchedule(scheduleMap);
    } catch (err) {
      console.error("Failed to load month metrics configuration mapping:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedDateDetails = async () => {
    const dayMatch = schedule[formattedSelectedDate];
    if (dayMatch) {
      setFormData({
        max_allowed_offers: dayMatch.max_allowed_offers,
        notes: dayMatch.notes || "",
        is_locked: dayMatch.is_locked,
        current_booked_count: dayMatch.current_booked_count || 0
      });
    } else {
      try {
        // FIX: Send YYYY-MM-DD instead of .toISOString() to avoid timezone shifting
        const res = await accountClient.get("calendar-config/availability", {
          params: { date: formattedSelectedDate },
          headers
        });

        setFormData({
          max_allowed_offers: res.data.max_slots,
          notes: "",
          is_locked: res.data.is_locked,
          current_booked_count: res.data.booked_slots
        });
      } catch (err) {
        console.error("Failed to fetch individual day metrics fallback:", err);
      }
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (isSelectedDateInPast) return; 
    
    try {
      setActionLoading(true);
      // FIX: Send formattedSelectedDate (YYYY-MM-DD string literal) to lock the date parameter in place
      const res = await accountClient.post("/calendar-config/admin/limit", {
        date: formattedSelectedDate,
        max_allowed_offers: Number(formData.max_allowed_offers),
        notes: formData.notes,
        is_locked: formData.is_locked
      }, { headers });
      
      if (res.data.success && res.data.data) {
        const updatedItem = res.data.data;
        const dateKey = updatedItem.date.split("T")[0];
        setSchedule(prev => ({
          ...prev,
          [dateKey]: updatedItem
        }));
      }

      await fetchMonthSchedule(); 
      alert(`Configurations applied for ${formattedSelectedDate}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update day variables.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncCounter = async () => {
    try {
      setActionLoading(true);
      // FIX: Synchronize using formattedSelectedDate string mapping to preserve midnight blocks
      await accountClient.post("/calendar-config/admin/sync", { date: formattedSelectedDate }, { headers });
      await fetchMonthSchedule();
      alert("Counter synchronized against live database entries.");
    } catch (err) {
      alert("Synchronization process rejected.");
    } finally {
      setActionLoading(false);
    }
  };

  const changeMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const generateCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-14 bg-slate-50/40 rounded-xl" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const activeLoopDate = new Date(year, month, day);
      const dateKey = formatDateKey(activeLoopDate);
      const customRule = schedule[dateKey];
      
      const isSelected = formattedSelectedDate === dateKey;
      const isLocked = customRule?.is_locked;
      const bookedCount = customRule?.current_booked_count || 0;
      const maxSlots = customRule?.max_allowed_offers || 5;
      const isFull = bookedCount >= maxSlots;
      const isHistory = isPastDate(activeLoopDate);

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => setSelectedDate(activeLoopDate)}
          className={`h-14 relative p-2 flex flex-col justify-between items-start rounded-xl border transition-all text-left cursor-pointer group
            ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 z-10' : 'bg-white border-blue-50 text-blue-950 hover:border-blue-300'}
            ${isLocked ? 'bg-amber-50/50 border-amber-100' : ''}
            ${isHistory ? 'bg-slate-100/70 border-slate-100 text-slate-400 opacity-60 hover:border-slate-100 cursor-not-allowed' : ''}
          `}
        >
          <span className={`text-xs font-bold ${isSelected ? 'text-white' : isHistory ? 'text-slate-400' : 'text-blue-950'}`}>
            {day}
          </span>
          
          <div className="w-full flex justify-between items-center mt-1">
            {bookedCount > 0 ? (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter
                  ${isSelected
                    ? 'bg-white/20 text-white'
                    : isHistory
                    ? 'bg-slate-200 text-slate-500'
                    : isFull
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-50 text-blue-600'}
                `}
              >
                {bookedCount}/{maxSlots}
              </span>
            ) : (
              <span className={`text-[9px] px-1 py-0.5 rounded font-medium opacity-40 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                0/{maxSlots}
              </span>
            )}
            
            {isLocked && (
              <Lock
                size={10}
                className={isSelected ? "text-white" : isHistory ? "text-slate-400 ml-auto" : "text-amber-500 ml-auto"}
              />
            )}
          </div>
        </button>
      );
    }

    return cells;
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto text-slate-800 antialiased">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2 tracking-tight">
          <Calendar className="text-blue-500" /> Calendar Campaign Cap Allocation
        </h1>
        <p className="text-blue-500 text-sm mt-0.5">Regulate and balance top-level merchant visibility allocations per calendar block day</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Calendar Grid Display */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-blue-100 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-blue-50 pb-4">
            <h2 className="text-xl font-bold text-blue-950">
              {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-blue-100 cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-xs font-bold hover:bg-blue-50 border border-blue-100 text-blue-600 rounded-lg transition cursor-pointer">
                Today
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-blue-100 cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase text-blue-400 tracking-wider">
            {weekdays.map(day => <div key={day} className="py-1">{day}</div>)}
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-blue-400">
              <Loader2 className="animate-spin" size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {generateCalendarCells()}
            </div>
          )}
        </div>

        {/* Settings Form Panel Sidebar */}
        <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden">
          <div className="p-6 bg-blue-50/20 border-b border-blue-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-950 text-base">Date Control Panel</h3>
              <p className="text-xs font-mono text-blue-500 mt-0.5">
                {formattedSelectedDate} {isSelectedDateInPast && <span className="text-red-500 font-sans font-bold ml-1">(Past Date)</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncCounter}
              disabled={actionLoading}
              title="Synchronize/Audit Bookings Counter"
              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
            >
              <RefreshCw size={16} className={actionLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Bookings Allocation</div>
                <div className="text-xl font-black text-blue-950">
                  {formData.current_booked_count} <span className="text-slate-400 text-xs font-medium">Slots Occupied</span>
                </div>
              </div>
              {formData.current_booked_count >= formData.max_allowed_offers && (
                <div className="p-2 bg-red-50 rounded-xl text-red-500">
                  <AlertCircle size={20} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                <Sliders size={12} /> Maximum Allowed Campaigns Cap
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isSelectedDateInPast} 
                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-950 disabled:opacity-50 disabled:cursor-not-allowed"
                value={formData.max_allowed_offers}
                onChange={(e) => setFormData({ ...formData, max_allowed_offers: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Internal Allocation Notes</label>
              <textarea
                rows="3"
                disabled={isSelectedDateInPast} 
                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., Extended seasonal limits for holiday peak traffic windows..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-blue-50 pt-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-blue-950">Lock This Date</span>
                <p className="text-[11px] text-slate-400">Instantly drops active merchant asset creation requests on this day</p>
              </div>
              <button
                type="button"
                disabled={isSelectedDateInPast} 
                onClick={() => setFormData({ ...formData, is_locked: !formData.is_locked })}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${formData.is_locked ? 'bg-amber-500 justify-end' : 'bg-slate-200 justify-start'}`}
              >
                <div className="bg-white w-5 h-5 rounded-full shadow-md flex items-center justify-center text-xs">
                  {formData.is_locked ? <Lock size={10} className="text-amber-600" /> : <Unlock size={10} className="text-slate-400" />}
                </div>
              </button>
            </div>

            {isSelectedDateInPast ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500 text-center italic">
                Historical records are archived and cannot be modified.
              </div>
            ) : (
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <Save size={16} />} Apply Day Configurations
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarConfig;