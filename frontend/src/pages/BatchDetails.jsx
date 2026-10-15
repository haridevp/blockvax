import React, { useState, useEffect } from "react";
import {
  FileSearch,
  Box,
  Truck,
  ShieldCheck,
  AlertOctagon,
  Calendar,
  Clock,
  Database,
  Download,
  Printer,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Share2,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import ShipmentTimeline from "../components/ShipmentTimeline";
import {
  fetchBatchDetails,
  recordCertificateOnChain,
} from "../services/contract";
import {
  generateCertificateData,
  downloadCertificateJSON,
  printCertificate,
} from "../services/certificate";
import { uploadCertificateToIPFS, isIpfsConfigured } from "../services/ipfs";
import { formatAddress } from "../utils/validation";

export default function BatchDetails({ wallet, batch, onNavigate }) {
  const [batchData, setBatchData] = useState(batch || null);
  const [activeSubTab, setActiveSubTab] = useState("checkpoints");
  const [loading, setLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Certificate generation state
  const [generatedCert, setGeneratedCert] = useState(null);
  const [isAnchoringCert, setIsAnchoringCert] = useState(false);
  const [anchorCertSuccess, setAnchorCertSuccess] = useState(null);
  const [anchorCertError, setAnchorCertError] = useState(null);

  // Reload full details on mount
  useEffect(() => {
    async function refresh() {
      if (batch && batch.batchId) {
        setLoading(true);
        try {
          const detailed = await fetchBatchDetails(batch.batchId);
          setBatchData(detailed);
        } catch (err) {
          console.warn("Could not reload full details:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    refresh();
  }, [batch]);

  if (!batchData) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
        <FileSearch className="w-8 h-8 text-slate-600 mx-auto" />
        <h3 className="font-semibold text-slate-300">No Batch Selected</h3>
        <p>Please select a vaccine batch from the Dashboard or Shipments page.</p>
        <button
          onClick={() => onNavigate("dashboard")}
          className="text-sky-400 hover:underline pt-2"
        >
          &larr; Return to Dashboard
        </button>
      </div>
    );
  }

  const handleCreateCertificate = async () => {
    // Generate canonical certificate structure
    const certPackage = generateCertificateData({
      batch: batchData,
      simulatorStats: {
        startTime: new Date(batchData.registrationTime * 1000).toISOString(),
        endTime: new Date().toISOString(),
        sampleCount: (batchData.checkpoints || []).reduce((acc, c) => acc + (c.sampleCount || 1), 0),
        minObserved: batchData.checkpoints && batchData.checkpoints.length > 0 ? Math.min(...batchData.checkpoints.map(c => c.minObservedTemp)) : batchData.minTemp,
        maxObserved: batchData.checkpoints && batchData.checkpoints.length > 0 ? Math.max(...batchData.checkpoints.map(c => c.maxObservedTemp)) : batchData.maxTemp,
        avgObserved: batchData.checkpoints && batchData.checkpoints.length > 0 ? Math.round(batchData.checkpoints.reduce((a, b) => a + b.avgObservedTemp, 0) / batchData.checkpoints.length) : (batchData.minTemp + batchData.maxTemp) / 2,
        excursionCount: batchData.excursionCount,
        hasExcursion: batchData.hasExcursion,
      },
      outOfRangeReadings: [],
      currentCustody: {
        custodian: batchData.currentCustodian,
        role: "Custodian",
        location: "Cold Chain Node",
        handoffsCount: (batchData.custodyHistory || []).length,
      },
      txHash: "Will anchor to smart contract",
      ipfsCid: null,
    });

    setGeneratedCert(certPackage);
    setActiveSubTab("certificate");
  };

  const handleAnchorCertificateOnChain = async () => {
    if (!generatedCert) return;
    setAnchorCertError(null);
    setAnchorCertSuccess(null);

    if (!wallet.isConnected) {
      setAnchorCertError("MetaMask connection is required to anchor certificate hash to blockchain.");
      return;
    }

    setIsAnchoringCert(true);
    try {
      // Optional IPFS upload attempt
      let ipfsCid = "";
      if (isIpfsConfigured()) {
        const ipfsResult = await uploadCertificateToIPFS(generatedCert.certificate, batchData.batchId);
        if (ipfsResult.success && ipfsResult.cid) {
          ipfsCid = ipfsResult.cid;
        }
      }

      const result = await recordCertificateOnChain({
        batchId: batchData.batchId,
        certificateHash: generatedCert.contentHash,
        ipfsCid: ipfsCid,
        notes: "Digital Cold-Chain Quality Certificate",
      });

      setAnchorCertSuccess({
        txHash: result.txHash,
        certificateHash: generatedCert.contentHash,
        ipfsCid: ipfsCid || "Not Configured (Local JSON)",
      });

      // Refresh batch state
      const updated = await fetchBatchDetails(batchData.batchId);
      setBatchData(updated);
    } catch (err) {
      console.error("Certificate anchoring failed:", err);
      setAnchorCertError(err.reason || err.message || "Failed to anchor certificate on-chain.");
    } finally {
      setIsAnchoringCert(false);
    }
  };

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const expiryDateFormatted = new Date(batchData.expiryDate * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const registrationFormatted = new Date(batchData.registrationTime * 1000).toLocaleString();

  return (
    <div className="space-y-6">
      {/* Batch Header Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-base font-bold text-sky-400">
                {batchData.batchId}
              </span>
              <StatusBadge
                status={batchData.hasExcursion ? "EXCURSION_DETECTED" : batchData.status}
                pulse={batchData.hasExcursion}
              />
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              {batchData.vaccineName}
            </h1>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNavigate("simulator");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950 border border-sky-800 text-xs font-semibold text-sky-300 hover:bg-sky-900 transition-colors cursor-pointer"
            >
              <span>Launch Simulator</span>
            </button>

            <button
              onClick={handleCreateCertificate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Generate Certificate</span>
            </button>
          </div>
        </div>

        {/* Excursion Permanent Warning Banner */}
        {batchData.hasExcursion && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Permanent Excursion Flag Active:</strong>
              A temperature breach was previously recorded during transit/storage. In accordance with cold chain integrity principles, this violation cannot be erased from the smart contract even if subsequent readings return to normal.
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Permitted Safe Band
            </span>
            <span className="font-mono font-bold text-sky-400">
              {batchData.minTemp}°C to {batchData.maxTemp}°C
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Current Custodian
            </span>
            <span className="font-mono font-medium text-slate-300">
              {formatAddress(batchData.currentCustodian)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Manufacturer
            </span>
            <span className="font-mono font-medium text-slate-300">
              {formatAddress(batchData.manufacturer)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Expiration Date
            </span>
            <span className="font-medium text-slate-300">
              {expiryDateFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab("checkpoints")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === "checkpoints"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Checkpoint Evidence Logs ({batchData.checkpoints ? batchData.checkpoints.length : 0})
          </button>

          <button
            onClick={() => setActiveSubTab("custody")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === "custody"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Custody Chain Journey ({batchData.custodyHistory ? batchData.custodyHistory.length : 0})
          </button>

          <button
            onClick={() => setActiveSubTab("certificate")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeSubTab === "certificate"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Digital Certificate & Verification
          </button>
        </div>
      </div>

      {/* TAB 1: Checkpoints Evidence */}
      {activeSubTab === "checkpoints" && (
        <div className="space-y-4">
          {!batchData.checkpoints || batchData.checkpoints.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400 space-y-2">
              <Database className="w-6 h-6 text-slate-600 mx-auto" />
              <div>No periodic checkpoints anchored to the blockchain yet.</div>
              <button
                onClick={() => onNavigate("simulator")}
                className="text-sky-400 hover:underline"
              >
                Launch Simulator to generate and anchor checkpoint evidence &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {batchData.checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        Checkpoint #{idx + 1}: {cp.locationOrStage}
                      </span>
                      <StatusBadge
                        status={cp.excursionDetected ? "EXCURSION" : "OPTIMAL"}
                        size="sm"
                      />
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(cp.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Min / Max Observed</span>
                      <span className={cp.excursionDetected ? "text-rose-400 font-bold" : "text-slate-200"}>
                        {cp.minObservedTemp}°C / {cp.maxObservedTemp}°C
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Average Temp</span>
                      <span className="text-slate-200">{cp.avgObservedTemp}°C</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Samples Batched</span>
                      <span className="text-slate-200">{cp.sampleCount} readings</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Recorded By</span>
                      <span className="text-slate-400">{formatAddress(cp.recordedBy)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="truncate max-w-lg font-mono">
                      Evidence Hash: <span className="text-sky-400">{cp.evidenceHash}</span>
                    </div>
                    {cp.notes && <div className="italic text-slate-500">"{cp.notes}"</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Custody Journey */}
      {activeSubTab === "custody" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <ShipmentTimeline custodyRecords={batchData.custodyHistory || []} />
        </div>
      )}

      {/* TAB 3: Digital Certificate */}
      {activeSubTab === "certificate" && (
        <div className="space-y-5">
          {!generatedCert ? (
            <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">
                Digital Cold-Chain Quality Certificate
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Generate a tamper-evident certificate containing observation statistics, custody timeline, and a Keccak-256 cryptographic digest.
              </p>
              <button
                onClick={handleCreateCertificate}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                Compile Certificate Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Certificate Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Certificate Compiled</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span>Digest:</span>
                    <span className="text-sky-400">{generatedCert.contentHash.slice(0, 18)}...</span>
                    <button
                      onClick={() => handleCopyHash(generatedCert.contentHash)}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadCertificateJSON(generatedCert.certificate, batchData.batchId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>

                  <button
                    onClick={printCertificate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>

                  <button
                    onClick={handleAnchorCertificateOnChain}
                    disabled={isAnchoringCert}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {isAnchoringCert ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Anchoring...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>Anchor Hash On-Chain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Anchor Success / Error Notification */}
              {anchorCertSuccess && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Certificate Hash Permanently Anchored to Ethereum Smart Contract!</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 break-all">
                    Tx Hash: {anchorCertSuccess.txHash}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    IPFS Status: {anchorCertSuccess.ipfsCid}
                  </div>
                </div>
              )}

              {anchorCertError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                  {anchorCertError}
                </div>
              )}

              {/* Certificate Printable Canvas Preview */}
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-6 space-y-6 shadow-2xl printable-cert">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                      BlockVax Integrity Specification v1.0
                    </span>
                    <h2 className="text-lg font-bold text-slate-100">
                      Vaccine Cold-Chain Verification Certificate
                    </h2>
                    <p className="text-xs text-slate-400">
                      Blockchain-Anchored Tamper-Evident Report
                    </p>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Issued: {new Date().toLocaleDateString()}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold uppercase">
                      Audit Status: {batchData.hasExcursion ? "EXCURSION RECORDED" : "VERIFIED OPTIMAL"}
                    </div>
                  </div>
                </div>

                {/* Section 1: Batch & Bounds */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Batch ID</span>
                    <strong className="font-mono text-sky-400 text-sm">{batchData.batchId}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Vaccine Formulation</span>
                    <strong className="text-slate-200">{batchData.vaccineName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Permitted Safe Band</span>
                    <strong className="font-mono text-slate-200">
                      {batchData.minTemp}°C to {batchData.maxTemp}°C
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Expiry Date</span>
                    <strong className="text-slate-200">{expiryDateFormatted}</strong>
                  </div>
                </div>

                {/* Section 2: Cryptographic Digest Anchor */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-slate-300">
                    Cryptographic Digest (Keccak-256)
                  </div>
                  <div className="font-mono text-[11px] text-sky-300 break-all select-all bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {generatedCert.contentHash}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    This SHA3/Keccak-256 hash is computed across all certificate fields. Any subsequent modification of readings, timestamps, or limits invalidates this cryptographic seal.
                  </p>
                </div>

                {/* Disclaimer */}
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300/90 leading-relaxed">
                  <strong>Academic Simulation Notice:</strong> All readings, thermal statistics, and excursion records shown on this certificate were generated via software simulation for educational and prototype evaluation purposes.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
