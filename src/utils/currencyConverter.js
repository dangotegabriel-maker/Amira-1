// src/utils/currencyConverter.js

/**
 * Converts a USD amount to GHS (Ghana Cedis) and then to the smallest unit (Pesewas)
 * as required by the Paystack API (no decimals).
 * @param {number} usdAmount The amount in USD to convert.
 * @param {number} rate The exchange rate to apply (defaults to 16.0).
 * @returns {number} The rounded amount in Pesewas.
 */
export const convertUSDToGHS = (usdAmount, rate = 16.0) => {
  if (typeof usdAmount !== 'number' || isNaN(usdAmount)) return 0;

  // (Price in USD * Exchange Rate) * 100 (to get Pesewas)
  const converted = (usdAmount * rate) * 100;

  // Ensure no decimals are sent to the Paystack API
  return Math.round(converted);
};
