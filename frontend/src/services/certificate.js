import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Creates a canonical digital cold-chain compliance certificate structure
 */
export function generateCertificateData({
  batch,
  simulatorStats,
  outOfRangeReadings = [],
  currentCustody = {},
  txHash = null,
  ipfsCid = null,
}) {
  const createdAt = new Date().toISOString();
  const createdTimestamp = Math.floor(Date.now() / 1000);

  const certificateBody = {
    certificateHeader: {
      standard: "BlockVax Cold Chain Integrity Specification v1.0",
      type: "Vaccine Thermal Compliance & Integrity Certificate",
      version: "1.0.0",
      issuedAt: createdAt,
      issuedTimestamp: createdTimestamp,
      environment: "Academic Prototype / Software Simulation Environment",
    },
    batchDetails: {
      batchId: batch.batchId,
      vaccineName: batch.vaccineName,
      expiryDate: new Date(batch.expiryDate * 1000).toISOString(),
      configuredTemperatureRange: {
        min: batch.minTemp,
        max: batch.maxTemp,
        unit: "Celsius",
      },
      manufacturer: batch.manufacturer,
    },
    thermalObservationPeriod: {
      observationStarted: simulatorStats.startTime || createdAt,
      observationEnded: simulatorStats.endTime || createdAt,
      sampleCount: simulatorStats.sampleCount || 0,
      minObservedTemp: simulatorStats.minObserved ?? batch.minTemp,
      maxObservedTemp: simulatorStats.maxObserved ?? batch.maxTemp,
      avgObservedTemp: simulatorStats.avgObserved ?? ((batch.minTemp + batch.maxTemp) / 2),
      excursionCount: simulatorStats.excursionCount || outOfRangeReadings.length,
      hasExcursionOccurred: Boolean(simulatorStats.hasExcursion || outOfRangeReadings.length > 0 || batch.hasExcursion),
    },
    outOfRangeEvents: outOfRangeReadings.map((r) => ({
      timestamp: r.timestamp,
      recordedTemperature: r.temperature,
      limitBreached: r.temperature < batch.minTemp ? `Below Min (${batch.minTemp}°C)` : `Above Max (${batch.maxTemp}°C)`,
      checkpointStage: r.checkpointReference || "Transit Checkpoint",
      source: r.source || "Software Simulator",
    })),
    custodyChain: {
      currentCustodian: currentCustody.custodian || batch.currentCustodian,
      currentRole: currentCustody.role || "Authorized Custodian",
      lastKnownLocation: currentCustody.location || "Central Cold Storage Hub",
      totalHandoffs: currentCustody.handoffsCount || 1,
    },
    blockchainAnchor: {
      network: "Ethereum Sepolia Testnet / Localhost EDR",
      contractAddress: batch.contractAddress || "Configured BlockVax Contract",
      transactionHash: txHash || "Pending / To Be Anchored",
      ipfsCid: ipfsCid || "Not Configured / Local Download Only",
    },
    legalAndTechnicalDisclaimer: {
      notice: "SOFTWARE SIMULATION / PROTOTYPE DISCLAIMER",
      statement:
        "All readings, temperature bounds, and excursion flags recorded in this certificate were produced in a software simulation environment or manual test console. This document demonstrates cryptographic tamper-evidence and blockchain integrity principles. It DOES NOT represent a certified physical pharmaceutical release.",
    },
  };

  // Convert to deterministic canonical JSON string
  const canonicalString = JSON.stringify(certificateBody, Object.keys(certificateBody).sort(), 2);
  const contentHash = keccak256(toUtf8Bytes(canonicalString));

  return {
    certificate: {
      ...certificateBody,
      cryptographicDigest: {
        algorithm: "Keccak-256 (Ethereum Standard)",
        contentHash: contentHash,
      },
    },
    canonicalString,
    contentHash,
  };
}

/**
 * Recomputes hash for any uploaded or parsed certificate JSON to detect tampering
 */
export function verifyCertificateBytes(certificateJson) {
  try {
    const cert = typeof certificateJson === "string" ? JSON.parse(certificateJson) : certificateJson;

    // Remove the digest container if present during recalculation
    const { cryptographicDigest, ...bodyWithoutDigest } = cert;
    const canonicalString = JSON.stringify(bodyWithoutDigest, Object.keys(bodyWithoutDigest).sort(), 2);
    const computedHash = keccak256(toUtf8Bytes(canonicalString));

    const declaredHash = cryptographicDigest ? cryptographicDigest.contentHash : null;

    return {
      isValidFormat: true,
      computedHash,
      declaredHash,
      isInternalMatch: declaredHash ? declaredHash.toLowerCase() === computedHash.toLowerCase() : null,
      batchId: cert.batchDetails ? cert.batchDetails.batchId : null,
      vaccineName: cert.batchDetails ? cert.batchDetails.vaccineName : null,
      cert,
    };
  } catch (error) {
    return {
      isValidFormat: false,
      error: error.message,
    };
  }
}

/**
 * Triggers a browser download of the certificate as formatted JSON
 */
export function downloadCertificateJSON(certificateObj, batchId) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(certificateObj, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `BlockVax_Certificate_${batchId || "BATCH"}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Triggers the browser print dialog for printable certificate
 */
export function printCertificate() {
  window.print();
}
