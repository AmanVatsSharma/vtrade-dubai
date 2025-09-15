/**
 * @file market-timing.ts
 * @description A helper utility to determine if the Indian stock market (NSE) is currently open.
 */

/**
 * Checks if the Indian stock market is currently open.
 * The market is considered open from 9:15 AM to 3:30 PM IST on weekdays (Monday to Friday).
 * @returns {boolean} - True if the market is open, false otherwise.
 */
export function isMarketOpen(): boolean {
  try {
    const now = new Date();
    
    // Get the current time in India (IST)
    const indianTimeString = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const indianTime = new Date(indianTimeString);

    const dayOfWeek = indianTime.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    const hour = indianTime.getHours();
    const minutes = indianTime.getMinutes();

    // Market is closed on weekends (Saturday and Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Check market hours
    const timeInMinutes = hour * 60 + minutes;
    const marketOpenTime = 9 * 60 + 15; // 9:15 AM
    const marketCloseTime = 15 * 60 + 30; // 3:30 PM

    return timeInMinutes >= marketOpenTime && timeInMinutes <= marketCloseTime;

  } catch (error) {
    console.error("Error checking market status:", error);
    // As a fallback, assume the market is closed to prevent unintended orders.
    return false;
  }
}
