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
  
  // Active date focus state configuration parameters
  const [formData, setFormData] = useState({
    max_allowed_offers: 5,
    notes: "",
    is_locked: false,
    current_booked_count: 0
  });

  const headers = useMemo(() => buildAuthHeaders(token), [token]);

  // Formatted targeted date calculations
  const formattedSelectedDate = useMemo(() => {
    return selectedDate.toISOString().split("T")[0];
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthSchedule();
  }, [currentMonth]);

  useEffect(() => {
    fetchSelectedDateDetails();
  }, [selectedDate, schedule]);

  // Fetch all existing override configurations for the visible calendar matrix window
  const fetchMonthSchedule = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const res = await accountClient.get("/calendar-config/admin/schedule", {
        params: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString()
        },
        headers
      });

      // Map array into a quick-lookup key-value hash map matching: {'YYYY-MM-DD': configObject}
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

  // Pull individual slot states when moving day focal rings
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
      // Direct live counter polling if no custom system rule exists yet
      try {
        const res = await accountClient.get("/calendar-config/availability", {
          params: { date: selectedDate.toISOString() },
          headers
        });
        setFormData({
          max_allowed_offers: res.data.max_slots,
          notes: "",
          is_locked: res.data.is_locked,
          current_booked_count: res.data.booked_slots
        });
      } catch (err) {
        console.error("Failed to fetch individual day metrics schema fallback:", err);
      }
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await accountClient.post("/calendar-config/admin/limit", {
        date: selectedDate.toISOString(),
        max_allowed_offers: Number(formData.max_allowed_offers),
        notes: formData.notes,
        is_locked: formData.is_locked
      }, { headers });

      await fetchMonthSchedule(); // Refresh calendar UI matrix node indicators
      alert(`Configurations applied for ${formattedSelectedDate}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update target slot restriction variables.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncCounter = async () => {
    try {
      setActionLoading(true);
      await accountClient.post("/calendar-config/admin/sync", { date: selectedDate.toISOString() }, { headers });
      await fetchMonthSchedule();
      alert("Counter synchronized against live offer document states successfully.");
    } catch (err) {
      alert("Synchronization process rejected.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- Calendar UI Helper Generators ---
  const changeMonth = (direction) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  const generateCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    
    // Fill empty placeholder nodes to shift grid starts relative to the matching weekdays
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="h-14 bg-slate-50/40 rounded-xl border border-transparent" />);
    }

    // Build actual calendar structural block matrices
    for (let day = 1; day <= totalDays; day++) {
      const activeLoopDate = new Date(year, month, day);
      const dateKey = activeLoopDate.toISOString().split("T")[0];
      const customRule = schedule[dateKey];
      
      const isSelected = formattedSelectedDate === dateKey;
      const isLocked = customRule?.is_locked;
      const bookedCount = customRule?.current_booked_count || 0;
      const maxSlots = customRule?.max_allowed_offers || 5;
      const isFull = bookedCount >= maxSlots;

      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => setSelectedDate(activeLoopDate)}
          className={`h-14 relative p-2 flex flex-col justify-between items-start rounded-xl border transition-all text-left group
            ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 z-10' : 'bg-white border-blue-50 text-blue-950 hover:border-blue-300'}
            ${isLocked ? 'bg-amber-50/50' : ''}
          `}
        >
          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-blue-950'}`}>
            {day}
          </span>
          
          <div className="w-full flex justify-between items-center mt-1">
            {/* Limit Indicators */}
            {bookedCount > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter
                  ${isSelected
                    ? 'bg-white/20 text-white'
                    : isFull
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-50 text-blue-600'}
                `}
              >
                {bookedCount}/{maxSlots}
              </span>
            )}
            
            {/* Lock Ticker Badges */}
            {isLocked && (
              <Lock
                size={10}
                className={isSelected ? "text-white" : "text-amber-500 ml-auto"}
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
    <div className="p-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-blue-950 flex items-center gap-2">
          <Calendar className="text-blue-500" /> Calendar Campaign Cap Allocation
        </h1>
        <p className="text-blue-500">Regulate and balance top-level merchant visibility allocations per calendar block day</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT/MID CONTENT: Interactive Calendar Tracker Component Grid Matrix */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-blue-100 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-blue-50 pb-4">
            <h2 className="text-xl font-bold text-blue-950">
              {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-blue-100">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-xs font-bold hover:bg-blue-50 border border-blue-100 text-blue-600 rounded-lg transition">
                Today
              </button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition border border-blue-100">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Labels Row Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase text-blue-400 tracking-wider">
            {weekdays.map(day => <div key={day} className="py-1">{day}</div>)}
          </div>

          {/* Core Generative Grid Days Canvas Layer */}
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

        {/* RIGHT SIDEBAR: Targeted Date Form Modification Side Control Panel */}
        <div className="bg-white rounded-[32px] border border-blue-100 shadow-xl overflow-hidden">
          <div className="p-6 bg-blue-50/20 border-b border-blue-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-950 text-base">Date Control Panel</h3>
              <p className="text-xs font-mono text-blue-500 mt-0.5">{formattedSelectedDate}</p>
            </div>
            <button
              type="button"
              onClick={handleSyncCounter}
              disabled={actionLoading}
              title="Synchronize/Audit Bookings Counter"
              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <RefreshCw size={16} className={actionLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
            {/* Live Utilization Performance Indicator Metric Display Layout Block */}
            <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 flex items-center justify-between text-sm">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Bookings Allocation</div>
                <div className="text-xl font-black text-blue-950">
                  {formData.current_booked_count} <span className="text-slate-400 text-xs font-medium">Slots Occupied</span>
                </div>
              </div>
              {formData.current_booked_count >= formData.max_allowed_offers && (
                <div className="p-2 bg-red-50 rounded-xl text-red-500" title="Slots completely filled up.">
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
                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-950"
                value={formData.max_allowed_offers}
                onChange={(e) => setFormData({ ...formData, max_allowed_offers: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Internal Allocation Notes</label>
              <textarea
                rows="3"
                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 resize-none"
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
                onClick={() => setFormData({ ...formData, is_locked: !formData.is_locked })}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 ${formData.is_locked ? 'bg-amber-500 justify-end' : 'bg-slate-200 justify-start'}`}
              >
                <div className="bg-white w-5 h-5 rounded-full shadow-md flex items-center justify-center text-xs">
                  {formData.is_locked ? <Lock size={10} className="text-amber-600" /> : <Unlock size={10} className="text-slate-400" />}
                </div>
              </button>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="animate-spin" /> : <Save size={16} />} Apply Day Configurations
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendarConfig;