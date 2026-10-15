import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Upload,
  FileCode,
  CheckCircle2,
  AlertOctagon,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import confetti from "canvas-confetti";
import { verifyCertificateHashOnChain, fetchBatchDetails } from "../services/contract";
import { verifyCertificateBytes } from "../services/certificate";
import { formatAddress, isValidBytes32Hash } from "../utils/validation";

export default function VerifyCertificate({ wallet }) {
  const [activeTab, setActiveTab] = useState("file"); // "file" or "manual"
  const [batchIdInput, setBatchIdInput] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [uploadedJsonText, setUploadedJsonText] = useState("");
  const [fileName, setFileName] = useState("");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Handle JSON File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setUploadedJsonText(content);
        const parsed = JSON.parse(content);
        if (parsed.batchDetails && parsed.batchDetails.batchId) {
          setBatchIdInput(parsed.batchDetails.batchId);
        }
      } catch (err) {
        setVerificationError("Invalid JSON file uploaded. Please ensure the file is valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Run Verification Pipeline
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      let targetBatchId = batchIdInput.trim();
      let targetHash = hashInput.trim();
      let certDetails = null;

      // If verifying from uploaded file / raw JSON text
      if (activeTab === "file") {
        if (!uploadedJsonText.trim()) {
          throw new Error("Please upload a certificate JSON file or paste certificate data.");
        }

        const parseResult = verifyCertificateBytes(uploadedJsonText);
        if (!parseResult.isValidFormat) {
          throw new Error(`JSON parsing failed: ${parseResult.error}`);
        }

        targetHash = parseResult.computedHash;
        if (parseResult.batchId) {
          targetBatchId = parseResult.batchId;
        }
        certDetails = parseResult.cert;
      }

      if (!targetBatchId) {
        throw new Error("Batch ID is required for verification.");
      }

      if (!targetHash || !isValidBytes32Hash(targetHash)) {
        throw new Error("A valid 32-byte hexadecimal hash (0x...) is required.");
      }

      // Query smart contract
      const onChainResult = await verifyCertificateHashOnChain(targetBatchId, targetHash);

      // Also fetch batch metadata to verify current custody
      let batchInfo = null;
      try {
        batchInfo = await fetchBatchDetails(targetBatchId);
      } catch {
        // Continue
      }

      const isVerified = onChainResult.isValid;

      setVerificationResult({
        isVerified,
        batchId: targetBatchId,
        computedHash: targetHash,
        issuedAt: onChainResult.issuedAt,
        issuedBy: onChainResult.issuedBy,
        ipfsCid: onChainResult.ipfsCid,
        batchInfo,
        certDetails,
      });

      if (isVerified) {
        // Trigger celebratory confetti micro-animation
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#38bdf8", "#34d399", "#60a5fa"],
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationError(err.message || "Certificate verification encountered an error.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <span>Verify Certificate Integrity</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cryptographically verify digital vaccine compliance certificates against Ethereum smart contract records.
        </p>
      </div>

      {/* Verification Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <button
          onClick={() => {
            setActiveTab("file");
            setVerificationResult(null);
            setVerificationError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "file"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Verify by JSON File / Bytes</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("manual");
            setVerificationResult(null);
            setVerificationError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "manual"
              ? "bg-sky-500 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Verify by Batch ID & Hash</span>
        </button>
      </div>

      {/* Main Verification Form Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        {activeTab === "file" ? (
          <div className="space-y-4">
            {/* File Drag and Drop / Input */}
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl bg-slate-950/60 cursor-pointer transition-colors p-4 text-center">
              <Upload className="w-7 h-7 text-sky-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">
                {fileName ? fileName : "Click to select BlockVax certificate JSON"}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Upload the downloadable JSON report to recompute its cryptographic seal.
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Batch ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batch Identifier *
              </label>
              <input
                type="text"
                placeholder="e.g. VAX-2026-COV-01"
                value={batchIdInput}
                onChange={(e) => setBatchIdInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batch ID *
              </label>
              <input
                type="text"
                placeholder="e.g. VAX-2026-COV-01"
                value={batchIdInput}
                onChange={(e) => setBatchIdInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Certificate Content Hash (Keccak-256) *
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Checking On-Chain Cryptographic Proofs...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Against Blockchain</span>
            </>
          )}
        </button>

        {/* Error message */}
        {verificationError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{verificationError}</div>
          </div>
        )}
      </div>

      {/* Verification Result Card */}
      {verificationResult && (
        <div
          className={`rounded-2xl border p-6 space-y-5 animate-in fade-in shadow-2xl ${
            verificationResult.isVerified
              ? "bg-emerald-950/20 border-emerald-500/50"
              : "bg-rose-950/20 border-rose-500/50"
          }`}
        >
          {/* Header Status */}
          <div className="flex items-center gap-3">
            {verificationResult.isVerified ? (
              <div className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>
            )}

            <div>
              <h3
                className={`text-lg font-bold ${
                  verificationResult.isVerified ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {verificationResult.isVerified
                  ? "Authentic Certificate Verified on Blockchain"
                  : "Verification Failed — Tampering or Unregistered Hash"}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {verificationResult.isVerified
                  ? "The cryptographic digest recomputed from the certificate bytes matches the immutable on-chain record exactly."
                  : "No anchored certificate matching this cryptographic digest was found on-chain for this batch ID."}
              </p>
            </div>
          </div>

          {/* Details breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Batch ID</span>
              <span className="text-slate-200 font-bold">{verificationResult.batchId}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Issuing Custodian</span>
              <span className="text-slate-300">
                {verificationResult.issuedBy && verificationResult.issuedBy !== "0x0000000000000000000000000000000000000000"
                  ? formatAddress(verificationResult.issuedBy)
                  : "Unregistered"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Anchoring Timestamp</span>
              <span className="text-slate-300">
                {verificationResult.issuedAt > 0
                  ? new Date(verificationResult.issuedAt * 1000).toLocaleString()
                  : "N/A"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block uppercase">IPFS Storage</span>
              <span className="text-slate-300 truncate">
                {verificationResult.ipfsCid || "Not Configured (Local JSON)"}
              </span>
            </div>

            <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase">Recomputed Digest (Keccak-256)</span>
              <span className="text-sky-400 break-all text-[11px]">
                {verificationResult.computedHash}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
