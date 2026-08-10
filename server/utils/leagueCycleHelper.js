// utils/leagueCycleHelper.js
export function calculateLeagueCycleEndDate(cycleType, customEndDate) {
  const now = new Date();

  if (cycleType === "monthly") {
    // End of current month: 23:59:59.999
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (cycleType === "quarterly") {
    // End of current quarter
    const currentQuarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
  } else if (cycleType === "yearly") {
    // End of current year
    return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (cycleType === "custom" && customEndDate) {
    return new Date(customEndDate);
  }

  return null; // 'all_time' never resets
}