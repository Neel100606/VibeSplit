/**
 * UPI Payment Utilities
 */

/**
 * Generates an NPCI-compliant UPI payment link.
 * Format: upi://pay?pa=payeeAddress&pn=payeeName&am=amount&cu=INR
 * 
 * @param {Object} params
 * @param {string} params.payeeVpa - The UPI ID (VPA) of the recipient.
 * @param {string} params.payeeName - The name of the recipient.
 * @param {number|string} params.amount - The amount to request.
 * @returns {string} The fully constructed UPI deep link URI.
 */
export function generateUpiLink({ payeeVpa, payeeName }) {
  if (!payeeVpa) return '';
  return `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
}

/**
 * Checks if the current browser session is running on a mobile device.
 * 
 * @returns {boolean} True if running on iOS or Android, false otherwise.
 */
export function isMobileDevice() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
}
