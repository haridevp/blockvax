import React, { useState, useEffect } from "react";
import {
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Clock,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import ShipmentTimeline from "../components/ShipmentTimeline";
import { fetchAllBatches, transferCustodyOnChain, ROLES } from "../services/contract";
import { formatAddress, validateCustodyTransfer } from "../utils/validation";

export default function Shipments({ wallet, onSelectBatch, onNavigate }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [expandedBatchId, setExpandedBatchId] = useState(null);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferLocation, setTransferLocation] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [transferError, setTransferError] = useState(null);
  const [transferSuccess, setTransferSuccess] = useState(null);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await fetchAllBatches();
      setBatches(data);
    } catch (err) {
      console.error("Failed to load shipments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const openTransferModal = (batch) => {
    setSelectedBatch(batch);
    setRecipientAddress("");
    setTransferLocation("");
    setTransferNotes("");
    setFormErrors({});
    setTransferError(null);
    setTransferSuccess(null);
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError(null);

    const validation = validateCustodyTransfer({
      recipientAddress,
      location: transferLocation,
      notes: transferNotes,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    if (!wallet.isConnected) {
      setTransferError("MetaMask connection is required to sign custody transfer transactions.");
      return;
    }

    // Role/Custodian validation
    const isCurrentCustodian =
      wallet.account &&
      selectedBatch &&
      (wallet.account.toLowerCase() === selectedBatch.currentCustodian.toLowerCase() ||
        wallet.role === "Admin");

    if (!isCurrentCustodian) {
      setTransferError(
        `Only the registered current custodian (${formatAddress(
          selectedBatch.currentCustodian
        )}) or Admin can initiate this custody transfer.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await transferCustodyOnChain({
        batchId: selectedBatch.batchId,
        to: recipientAddress.trim(),
        location: transferLocation.trim(),
        notes: transferNotes.trim() || "Cold chain transit transfer",
      });

      setTransferSuccess({
        batchId: selectedBatch.batchId,
        recipient: recipientAddress,
        txHash: result.txHash,
      });

      await loadBatches();
    } catch (err) {
      console.error("Custody transfer failed:", err);
      setTransferError(err.reason || err.message || "Failed to execute custody transfer on blockchain.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (filter === "ALL") return true;
    if (filter === "IN_TRANSIT") return b.status === "IN_TRANSIT";
    if (filter === "DELIVERED") return b.status === "DELIVERED";
    if (filter === "EXCURSION") return b.hasExcursion || b.status === "EXCURSION_DETECTED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Shipment Tracking & Custody Chain
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end pharmaceutical custody transfers from manufacturer to cold depot, transporter, and hospital pharmacy.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          {["ALL", "IN_TRANSIT", "DELIVERED", "EXCURSION"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filter === f
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f === "ALL" ? "All Shipments" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Shipment Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-400" />
          <div>Loading custody records from blockchain...</div>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-xs text-slate-400">
          No shipments match the selected category.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch) => {
            const isExpanded = expandedBatchId === batch.batchId;
            const isUserCurrentCustodian =
              wallet.account &&
              (wallet.account.toLowerCase() === batch.currentCustodian.toLowerCase() ||
                wallet.role === "Admin");

            return (
              <div
                key={batch.batchId}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4 hover:border-slate-700/80 transition-colors"
              >
                {/* Main Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-sky-400">
                        {batch.batchId}
                      </span>
                      <StatusBadge
                        status={batch.hasExcursion ? "EXCURSION_DETECTED" : batch.status}
                        pulse={batch.hasExcursion}
                      />
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      {batch.vaccineName}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTransferModal(batch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isUserCurrentCustodian
                          ? "bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-cyan-500"
                          : "bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-700"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Transfer Custody</span>
                    </button>

                    <button
                      onClick={() =>
                        setExpandedBatchId(isExpanded ? null : batch.batchId)
                      }
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Journey</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Current Custodian
                    </span>
                    <span className="font-mono font-medium text-slate-300">
                      {formatAddress(batch.currentCustodian)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Manufacturer
                    </span>
                    <span className="font-mono font-medium text-slate-300">
                      {formatAddress(batch.manufacturer)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Permitted Range
                    </span>
                    <span className="font-mono font-medium text-sky-400">
                      {batch.minTemp}°C to {batch.maxTemp}°C
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Recorded Checkpoints
                    </span>
                    <span className="font-mono font-medium text-slate-300">
                      {batch.checkpoints ? batch.checkpoints.length : 0} logs
                    </span>
                  </div>
                </div>

                {/* Expanded Journey Timeline */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
                    <h4 className="text-xs font-semibold text-slate-300">
                      On-Chain Custody Transfer History:
                    </h4>
                    <ShipmentTimeline custodyRecords={batch.custodyHistory || []} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custody Transfer Modal */}
      {transferModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Execute Custody Transfer
                </h3>
                <p className="text-xs text-slate-400">
                  Batch: <strong className="font-mono text-sky-400">{selectedBatch.batchId}</strong>
                </p>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {transferSuccess ? (
              <div className="space-y-3 py-2">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 space-y-2">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Custody Handed Off Successfully!</span>
                  </div>
                  <div>Transferred to: <strong className="font-mono">{formatAddress(transferSuccess.recipient)}</strong></div>
                  <div className="font-mono text-[11px] text-slate-400 break-all">
                    Tx: {transferSuccess.txHash}
                  </div>
                </div>
                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs text-slate-200 font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                {/* Recipient Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Wallet Address (0x...) *
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-950 border font-mono text-slate-200 focus:outline-none ${
                      formErrors.recipientAddress ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
                    }`}
                  />
                  {formErrors.recipientAddress && (
                    <p className="text-rose-400 text-[11px] mt-1">{formErrors.recipientAddress}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    Recipient must hold an authorized supply chain role (Cold Storage, Transporter, Distributor, or Hospital).
                  </p>
                </div>

                {/* Transfer Location */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Transfer Location / Checkpoint Hub *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Central Air Logistics Hub 4"
                    value={transferLocation}
                    onChange={(e) => setTransferLocation(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-slate-200 focus:outline-none ${
                      formErrors.location ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
                    }`}
                  />
                  {formErrors.location && (
                    <p className="text-rose-400 text-[11px] mt-1">{formErrors.location}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Inspection & Handoff Notes
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Temperature checked within range upon receipt into refrigerated container."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {transferError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>{transferError}</div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTransferModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 disabled:opacity-50 cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing Tx...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm Transfer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
