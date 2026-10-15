import { getAddress, isAddress } from "ethers";

/**
 * Validates batch registration input data
 */
export function validateBatchRegistration({
  batchId,
  vaccineName,
  expiryDate,
  minTemp,
  maxTemp,
}) {
  const errors = {};

  if (!batchId || !batchId.trim()) {
    errors.batchId = "Batch ID is required";
  } else if (!/^[A-Z0-9_-]{3,32}$/i.test(batchId.trim())) {
    errors.batchId = "Batch ID must be 3-32 alphanumeric characters, dashes or underscores";
  }

  if (!vaccineName || !vaccineName.trim()) {
    errors.vaccineName = "Vaccine name is required";
  } else if (vaccineName.trim().length < 3) {
    errors.vaccineName = "Vaccine name must be at least 3 characters";
  }

  if (!expiryDate) {
    errors.expiryDate = "Expiry date is required";
  } else {
    const expiryTimestamp = new Date(expiryDate).getTime();
    if (isNaN(expiryTimestamp)) {
      errors.expiryDate = "Invalid date format";
    } else if (expiryTimestamp <= Date.now()) {
      errors.expiryDate = "Expiry date must be in the future";
    }
  }

  const numMin = parseFloat(minTemp);
  const numMax = parseFloat(maxTemp);

  if (isNaN(numMin)) {
    errors.minTemp = "Minimum temperature must be a valid number";
  } else if (numMin < -100 || numMin > 50) {
    errors.minTemp = "Min temp must be between -100°C and 50°C";
  }

  if (isNaN(numMax)) {
    errors.maxTemp = "Maximum temperature must be a valid number";
  } else if (numMax < -100 || numMax > 50) {
    errors.maxTemp = "Max temp must be between -100°C and 50°C";
  }

  if (!isNaN(numMin) && !isNaN(numMax) && numMin >= numMax) {
    errors.maxTemp = "Maximum temperature must be strictly greater than minimum temperature";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates custody transfer input data
 */
export function validateCustodyTransfer({ recipientAddress, location, notes }) {
  const errors = {};

  if (!recipientAddress || !recipientAddress.trim()) {
    errors.recipientAddress = "Recipient wallet address is required";
  } else if (!isAddress(recipientAddress.trim())) {
    errors.recipientAddress = "Invalid Ethereum address format";
  }

  if (!location || !location.trim()) {
    errors.location = "Transfer location / facility is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates manual temperature entry in the simulator
 */
export function validateManualTemperature(temp) {
  const num = parseFloat(temp);
  if (isNaN(num)) {
    return { isValid: false, error: "Please enter a valid numeric temperature" };
  }
  if (num < -120 || num > 70) {
    return { isValid: false, error: "Temperature reading out of plausible physical range (-120°C to 70°C)" };
  }
  return { isValid: true, value: num };
}

/**
 * Validates 32-byte hexadecimal hash
 */
export function isValidBytes32Hash(hash) {
  return typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash.trim());
}

/**
 * Formats an Ethereum address for UI display
 */
export function formatAddress(address, chars = 4) {
  if (!address || !isAddress(address)) return address || "0x00...0000";
  const normalized = getAddress(address);
  return `${normalized.slice(0, chars + 2)}...${normalized.slice(-chars)}`;
}
