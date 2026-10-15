import { Contract, JsonRpcProvider } from "ethers";
import { getBrowserProvider, isWalletInstalled } from "./wallet";
import BlockVaxAbi from "../abi/BlockVax.json";

import localConfig from "../contractAddress.json";

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  (localConfig && localConfig.contractAddress) ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

export const ROLES = {
  0: "None",
  1: "Admin",
  2: "Manufacturer",
  3: "Cold Storage",
  4: "Transporter",
  5: "Distributor",
  6: "Hospital",
};

export const ROLE_ENUM = {
  NONE: 0,
  ADMIN: 1,
  MANUFACTURER: 2,
  COLD_STORAGE: 3,
  TRANSPORTER: 4,
  DISTRIBUTOR: 5,
  HOSPITAL: 6,
};

export const BATCH_STATUS = {
  0: "REGISTERED",
  1: "IN_TRANSIT",
  2: "DELIVERED",
  3: "EXCURSION_DETECTED",
  4: "UNDER_REVIEW",
};

/**
 * Returns read-only or signer-connected contract instance
 */
export async function getContract(withSigner = false) {
  if (withSigner) {
    if (!isWalletInstalled()) {
      throw new Error("MetaMask is required for on-chain write transactions.");
    }
    const provider = getBrowserProvider();
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, BlockVaxAbi, signer);
  }

  // Try BrowserProvider first if wallet is present
  if (isWalletInstalled()) {
    try {
      const provider = getBrowserProvider();
      return new Contract(CONTRACT_ADDRESS, BlockVaxAbi, provider);
    } catch {
      // Fallback
    }
  }

  // Fallback to Sepolia or Local JSON-RPC provider
  const rpcUrl = SEPOLIA_RPC_URL;
  const jsonRpcProvider = new JsonRpcProvider(rpcUrl);
  return new Contract(CONTRACT_ADDRESS, BlockVaxAbi, jsonRpcProvider);
}

/**
 * Fetch user's registered role from the contract
 */
export async function fetchUserRole(address) {
  if (!address) return "None";
  try {
    const contract = await getContract(false);
    const roleId = await contract.userRoles(address);
    return ROLES[Number(roleId)] || "None";
  } catch (error) {
    console.warn("Could not query user role from contract:", error.message);
    return "None";
  }
}

/**
 * Fetch all registered batches from the smart contract
 */
export async function fetchAllBatches() {
  try {
    const contract = await getContract(false);
    const batchIds = await contract.getAllBatchIds();
    
    const batches = [];
    for (const id of batchIds) {
      const rawBatch = await contract.getBatch(id);
      batches.push(formatBatchStruct(rawBatch));
    }
    return batches;
  } catch (error) {
    console.warn("Blockchain read error or contract not deployed yet:", error.message);
    return getFallbackMockBatches();
  }
}

/**
 * Fetch detailed data for a single batch including custody, checkpoints and certificates
 */
export async function fetchBatchDetails(batchId) {
  try {
    const contract = await getContract(false);
    const rawBatch = await contract.getBatch(batchId);
    const rawCustody = await contract.getCustodyHistory(batchId);
    const rawCheckpoints = await contract.getCheckpoints(batchId);
    const rawCertificates = await contract.getCertificates(batchId);

    return {
      ...formatBatchStruct(rawBatch),
      custodyHistory: rawCustody.map((c) => ({
        from: c.from,
        to: c.to,
        fromRole: ROLES[Number(c.fromRole)] || "Unknown",
        toRole: ROLES[Number(c.toRole)] || "Unknown",
        timestamp: Number(c.timestamp),
        location: c.location,
        notes: c.notes,
      })),
      checkpoints: rawCheckpoints.map((cp) => ({
        timestamp: Number(cp.timestamp),
        recordedBy: cp.recordedBy,
        locationOrStage: cp.locationOrStage,
        minObservedTemp: Number(cp.minObservedTemp),
        maxObservedTemp: Number(cp.maxObservedTemp),
        avgObservedTemp: Number(cp.avgObservedTemp),
        sampleCount: Number(cp.sampleCount),
        excursionDetected: cp.excursionDetected,
        evidenceHash: cp.evidenceHash,
        notes: cp.notes,
      })),
      certificates: rawCertificates.map((cert) => ({
        certificateHash: cert.certificateHash,
        ipfsCid: cert.ipfsCid,
        issuedAt: Number(cert.issuedAt),
        issuedBy: cert.issuedBy,
        notes: cert.notes,
      })),
    };
  } catch (error) {
    console.warn("Could not fetch batch details from contract:", error.message);
    // Find in mock data if fallback
    const mocks = getFallbackMockBatches();
    const found = mocks.find((b) => b.batchId.toLowerCase() === batchId.toLowerCase());
    if (found) return found;
    throw new Error(`Batch "${batchId}" not found on blockchain.`);
  }
}

/**
 * Register a new batch on-chain
 */
export async function registerBatchOnChain({
  batchId,
  vaccineName,
  expiryDate,
  minTemp,
  maxTemp,
}) {
  const contract = await getContract(true);
  const expiryTimestamp = Math.floor(new Date(expiryDate).getTime() / 1000);
  
  const tx = await contract.registerBatch(
    batchId.trim(),
    vaccineName.trim(),
    expiryTimestamp,
    Math.round(Number(minTemp)),
    Math.round(Number(maxTemp))
  );

  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Transfer custody on-chain
 */
export async function transferCustodyOnChain({ batchId, to, location, notes }) {
  const contract = await getContract(true);
  const tx = await contract.transferCustody(batchId, to, location, notes || "Standard handoff");
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Record a temperature checkpoint and evidence hash on-chain
 */
export async function recordCheckpointOnChain({
  batchId,
  locationOrStage,
  minObserved,
  maxObserved,
  avgObserved,
  sampleCount,
  excursionDetected,
  evidenceHash,
  notes,
}) {
  const contract = await getContract(true);
  const tx = await contract.recordCheckpoint(
    batchId,
    locationOrStage,
    Math.round(minObserved),
    Math.round(maxObserved),
    Math.round(avgObserved),
    sampleCount,
    excursionDetected,
    evidenceHash,
    notes || "Simulator batch checkpoint"
  );
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Record digital certificate hash and optional IPFS CID on-chain
 */
export async function recordCertificateOnChain({
  batchId,
  certificateHash,
  ipfsCid,
  notes,
}) {
  const contract = await getContract(true);
  const tx = await contract.recordCertificate(
    batchId,
    certificateHash,
    ipfsCid || "",
    notes || "Cryptographic audit certificate"
  );
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

/**
 * Verify a certificate hash against the smart contract
 */
export async function verifyCertificateHashOnChain(batchId, computedHash) {
  const contract = await getContract(false);
  const [isValid, issuedAt, issuedBy, ipfsCid] =
    await contract.verifyCertificateHash(batchId, computedHash);

  return {
    isValid,
    issuedAt: Number(issuedAt),
    issuedBy,
    ipfsCid,
  };
}

/**
 * Assign supply chain role (Admin only)
 */
export async function assignRoleOnChain(account, roleIndex) {
  const contract = await getContract(true);
  const tx = await contract.assignRole(account, roleIndex);
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
  };
}

function formatBatchStruct(raw) {
  return {
    batchId: raw.batchId,
    vaccineName: raw.vaccineName,
    expiryDate: Number(raw.expiryDate),
    minTemp: Number(raw.minTemp),
    maxTemp: Number(raw.maxTemp),
    manufacturer: raw.manufacturer,
    currentCustodian: raw.currentCustodian,
    status: BATCH_STATUS[Number(raw.status)] || "REGISTERED",
    statusCode: Number(raw.status),
    hasExcursion: Boolean(raw.hasExcursion),
    excursionCount: Number(raw.excursionCount),
    registrationTime: Number(raw.registrationTime),
    latestCertificateHash: raw.latestCertificateHash,
    latestIpfsCid: raw.latestIpfsCid,
  };
}

/**
 * Fallback prototype data shown if blockchain provider cannot be reached
 */
function getFallbackMockBatches() {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      batchId: "VAX-2026-COV-01",
      vaccineName: "Covishield (ChAdOx1-S)",
      expiryDate: now + 180 * 24 * 3600,
      minTemp: 2,
      maxTemp: 8,
      manufacturer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      currentCustodian: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      status: "IN_TRANSIT",
      statusCode: 1,
      hasExcursion: false,
      excursionCount: 0,
      registrationTime: now - 5 * 24 * 3600,
      latestCertificateHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      latestIpfsCid: "",
      custodyHistory: [
        {
          from: "0x0000000000000000000000000000000000000000",
          to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          fromRole: "None",
          toRole: "Manufacturer",
          timestamp: now - 5 * 24 * 3600,
          location: "Serum Institute Plant 3",
          notes: "Initial Production QA Cleared",
        },
        {
          from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          to: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          fromRole: "Manufacturer",
          toRole: "Cold Storage",
          timestamp: now - 3 * 24 * 3600,
          location: "Regional Cold Hub Beta",
          notes: "Received into 4°C cold chamber",
        },
      ],
      checkpoints: [
        {
          timestamp: now - 2 * 24 * 3600,
          recordedBy: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          locationOrStage: "Cold Hub Storage Unit 4",
          minObservedTemp: 3,
          maxObservedTemp: 6,
          avgObservedTemp: 4,
          sampleCount: 120,
          excursionDetected: false,
          evidenceHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
          notes: "Software simulated temperature log - optimal band maintained",
        },
      ],
      certificates: [],
    },
    {
      batchId: "VAX-2026-PFZ-02",
      vaccineName: "Comirnaty Ultra-Cold (BNT162b2)",
      expiryDate: now + 90 * 24 * 3600,
      minTemp: -90,
      maxTemp: -60,
      manufacturer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      currentCustodian: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      status: "EXCURSION_DETECTED",
      statusCode: 3,
      hasExcursion: true,
      excursionCount: 1,
      registrationTime: now - 2 * 24 * 3600,
      latestCertificateHash: "0x72a8190c749910e53a25191b9802e0dfaa413bc971489025eab663e2718e223b",
      latestIpfsCid: "",
      custodyHistory: [
        {
          from: "0x0000000000000000000000000000000000000000",
          to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          fromRole: "None",
          toRole: "Manufacturer",
          timestamp: now - 2 * 24 * 3600,
          location: "BioNTech Mainz BioFacility",
          notes: "Packaged in dry-ice thermal shippers",
        },
        {
          from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          to: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          fromRole: "Manufacturer",
          toRole: "Transporter",
          timestamp: now - 1 * 24 * 3600,
          location: "Transit Express Carrier Alpha",
          notes: "Loaded into cryogenic freight vehicle",
        },
      ],
      checkpoints: [
        {
          timestamp: now - 18 * 3600,
          recordedBy: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          locationOrStage: "Transit Checkpoint - Interstate Corridor",
          minObservedTemp: -75,
          maxObservedTemp: -48, // Exceeded -60°C!
          avgObservedTemp: -58,
          sampleCount: 85,
          excursionDetected: true,
          evidenceHash: "0x99e82103fca3810f601b0451a840e9083204910efb8192038741092837192837",
          notes: "Dry ice sublimation rate exceeded normal limits during simulated delay",
        },
      ],
      certificates: [],
    },
    {
      batchId: "VAX-2026-MOD-03",
      vaccineName: "Spikevax (mRNA-1273)",
      expiryDate: now + 120 * 24 * 3600,
      minTemp: -25,
      maxTemp: -15,
      manufacturer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      currentCustodian: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      status: "DELIVERED",
      statusCode: 2,
      hasExcursion: false,
      excursionCount: 0,
      registrationTime: now - 8 * 24 * 3600,
      latestCertificateHash: "0x44f12809ea8b584a22c5478d8a7c2b09ff8271e8432a9c18512f38d4924b11f2",
      latestIpfsCid: "",
      custodyHistory: [
        {
          from: "0x0000000000000000000000000000000000000000",
          to: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          fromRole: "None",
          toRole: "Manufacturer",
          timestamp: now - 8 * 24 * 3600,
          location: "Moderna Manufacturing Hub",
          notes: "Batch release documentation signed",
        },
        {
          from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          to: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
          fromRole: "Manufacturer",
          toRole: "Hospital",
          timestamp: now - 1 * 24 * 3600,
          location: "City General Hospital Pharmacy",
          notes: "Final delivery accepted into pharmacy freezers",
        },
      ],
      checkpoints: [
        {
          timestamp: now - 2 * 24 * 3600,
          recordedBy: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
          locationOrStage: "Hospital Inbound Receiving Dock",
          minObservedTemp: -22,
          maxObservedTemp: -18,
          avgObservedTemp: -20,
          sampleCount: 90,
          excursionDetected: false,
          evidenceHash: "0x44f12809ea8b584a22c5478d8a7c2b09ff8271e8432a9c18512f38d4924b11f2",
          notes: "Optimal freezing range confirmed upon receipt",
        },
      ],
      certificates: [],
    },
  ];
}
