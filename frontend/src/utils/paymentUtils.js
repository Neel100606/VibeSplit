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
export const generateUpiLink = ({ payeeVpa, payeeName }) => {
  if (!payeeVpa) return '';
  const encodedName = encodeURIComponent(payeeName);
  // pa: Payee VPA Address
  // pn: Payee Name
  // mc: Merchant Category Code (0000 explicitly forces P2P transaction mode)
  // mode: 02 specifies a standard SDK/Web intent trigger layout
  return `upi://pay?pa=${payeeVpa}&pn=${encodedName}&mc=0000&mode=02`;
};

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
