/**
 * Helper to determine if current time is within a 24-hr HH:mm window
 * (Handles windows crossing midnight like 22:00 -> 06:00)
 */
export const isTimeInWindow = (startTime, endTime, targetDate = new Date()) => {
  if (!startTime || !endTime) return false;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
  const windowStart = startHour * 60 + startMin;
  const windowEnd = endHour * 60 + endMin;

  if (windowStart <= windowEnd) {
    // Normal window: e.g. 19:00 to 21:30
    return currentMinutes >= windowStart && currentMinutes <= windowEnd;
  } else {
    // Crosses midnight: e.g. 22:00 to 06:00
    return currentMinutes >= windowStart || currentMinutes <= windowEnd;
  }
};

/**
 * Calculates delivery fee based on merchant pricing config, distance, and current time.
 */
export const calculateMerchantDeliveryFee = (merchantConfig = {}, distanceKm = 1, orderDate = new Date()) => {
  const baseFee = merchantConfig.baseFee ?? 20;
  const standardRatePerKm = merchantConfig.ratePerKm ?? 10;
  const minFee = merchantConfig.minimumDeliveryFee ?? 20;

  const night = merchantConfig.nightConfig || {};
  const peak = merchantConfig.peakConfig || {};

  let applicableRatePerKm = standardRatePerKm;
  let flatSurcharge = 0;
  let tierApplied = "STANDARD";

  // Check Night Window Priority
  if (night.isEnabled && isTimeInWindow(night.startTime, night.endTime, orderDate)) {
    applicableRatePerKm = night.ratePerKm ?? standardRatePerKm;
    flatSurcharge = night.flatSurcharge ?? 0;
    tierApplied = "NIGHT";
  }
  // Check Peak Hour Window
  else if (peak.isEnabled && isTimeInWindow(peak.startTime, peak.endTime, orderDate)) {
    applicableRatePerKm = peak.ratePerKm ?? standardRatePerKm;
    flatSurcharge = peak.flatSurcharge ?? 0;
    tierApplied = "PEAK";
  }

  // 1 KM = X INR formula: (Distance * RatePerKm) + BaseFee + FlatSurcharge
  const rawDeliveryCharge = (distanceKm * applicableRatePerKm) + baseFee + flatSurcharge;
  const finalDeliveryFee = Math.max(minFee, Math.round(rawDeliveryCharge));

  return {
    deliveryFee: finalDeliveryFee,
    breakdown: {
      distanceKm: Number(distanceKm.toFixed(2)),
      appliedRatePerKm: applicableRatePerKm,
      baseFee,
      surcharge: flatSurcharge,
      tierApplied,
    },
  };
};