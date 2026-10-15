/**
 * IPFS / Pinata Storage Service
 *
 * NOTE: As per project guidelines:
 * "Never fabricate a certificate CID, transaction hash, sensor measurement or successful upload.
 * If IPFS is not configured, allow certificate download and clearly indicate that IPFS storage is unavailable."
 */

export const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY || "";
export const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY || "";
export const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

/**
 * Checks if real IPFS credentials are configured
 */
export function isIpfsConfigured() {
  return Boolean(PINATA_API_KEY && PINATA_API_KEY.trim() && PINATA_SECRET_KEY && PINATA_SECRET_KEY.trim());
}

/**
 * Uploads a JSON certificate to IPFS via Pinata API
 * Returns real CID or null if not configured
 */
export async function uploadCertificateToIPFS(certificateData, batchId) {
  if (!isIpfsConfigured()) {
    console.info(
      "IPFS is not configured (VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY not set in .env). " +
      "Returning null without fabricating mock CIDs."
    );
    return {
      success: false,
      isConfigured: false,
      cid: null,
      message: "IPFS credentials not configured. Certificate available via local JSON/Print download.",
    };
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataOptions: {
          cidVersion: 1,
        },
        pinataMetadata: {
          name: `BlockVax_Cert_${batchId || Date.now()}`,
          keyvalues: {
            app: "BlockVax",
            type: "ColdChainCertificate",
            batchId: batchId || "Unknown",
          },
        },
        pinataContent: certificateData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      isConfigured: true,
      cid: result.IpfsHash,
      gatewayUrl: `${PINATA_GATEWAY}${result.IpfsHash}`,
      message: "Certificate pinned to IPFS successfully.",
    };
  } catch (error) {
    console.error("IPFS upload exception:", error);
    return {
      success: false,
      isConfigured: true,
      cid: null,
      error: error.message,
      message: `IPFS upload error: ${error.message}. Local certificate remains valid.`,
    };
  }
}
