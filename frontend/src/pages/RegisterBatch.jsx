import React, { useState } from "react";
import {
  PlusCircle,
  Sparkles,
  Thermometer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { registerBatchOnChain } from "../services/contract";
import { validateBatchRegistration } from "../utils/validation";

const VACCINE_PRESETS = [
  {
    name: "Covishield (ChAdOx1-S)",
    minTemp: 2,
    maxTemp: 8,
    defaultShelfLifeMonths: 9,
    description: "Standard refrigeration cold chain (2°C to 8°C)",
  },
  {
    name: "Covaxin (BBV152)",
    minTemp: 2,
    maxTemp: 8,
    defaultShelfLifeMonths: 12,
    description: "Inactivated whole-virion vaccine (2°C to 8°C)",
  },
  {
    name: "Moderna Spikevax (mRNA-1273)",
    minTemp: -25,
    maxTemp: -15,
    defaultShelfLifeMonths: 6,
    description: "Standard freezer storage (-25°C to -15°C)",
  },
  {
    name: "Pfizer Comirnaty (BNT162b2)",
    minTemp: -90,
    maxTemp: -60,
    defaultShelfLifeMonths: 6,
    description: "Ultra-low thermal shipper storage (-90°C to -60°C)",
  },
  {
    name: "Custom Vaccine Specification",
    minTemp: 2,
    maxTemp: 8,
    defaultShelfLifeMonths: 6,
    description: "Specify custom thermal boundaries",
  },
];

export default function RegisterBatch({ wallet, onBatchRegistered }) {
  const [selectedPreset, setSelectedPreset] = useState(VACCINE_PRESETS[0].name);
  const [batchId, setBatchId] = useState("");
  const [vaccineName, setVaccineName] = useState(VACCINE_PRESETS[0].name);
  const [minTemp, setMinTemp] = useState(VACCINE_PRESETS[0].minTemp);
  const [maxTemp, setMaxTemp] = useState(VACCINE_PRESETS[0].maxTemp);

  // Default expiry date: 9 months in future
  const defaultFutureDate = new Date();
  defaultFutureDate.setMonth(defaultFutureDate.getMonth() + 9);
  const [expiryDate, setExpiryDate] = useState(defaultFutureDate.toISOString().split("T")[0]);

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [serverError, setServerError] = useState(null);

  const generateRandomBatchId = () => {
    const prefix = "VAX-2026-";
    const rand = Math.floor(1000 + Math.random() * 9000);
    setBatchId(`${prefix}${rand}`);
  };

  const handlePresetChange = (presetName) => {
    setSelectedPreset(presetName);
    const preset = VACCINE_PRESETS.find((p) => p.name === presetName);
    if (preset) {
      if (presetName !== "Custom Vaccine Specification") {
        setVaccineName(preset.name);
      }
      setMinTemp(preset.minTemp);
      setMaxTemp(preset.maxTemp);

      const exp = new Date();
      exp.setMonth(exp.getMonth() + preset.defaultShelfLifeMonths);
      setExpiryDate(exp.toISOString().split("T")[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateBatchRegistration({
      batchId,
      vaccineName,
      expiryDate,
      minTemp,
      maxTemp,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    if (!wallet.isConnected) {
      setServerError("Please connect your MetaMask wallet to submit the on-chain registration transaction.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerBatchOnChain({
        batchId,
        vaccineName,
        expiryDate,
        minTemp,
        maxTemp,
      });

      setTxResult({
        batchId,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
      });

      if (onBatchRegistered) {
        onBatchRegistered({
          batchId,
          vaccineName,
          minTemp: Number(minTemp),
          maxTemp: Number(maxTemp),
          expiryDate: Math.floor(new Date(expiryDate).getTime() / 1000),
          manufacturer: wallet.account,
          currentCustodian: wallet.account,
          status: "REGISTERED",
          hasExcursion: false,
          excursionCount: 0,
        });
      }
    } catch (err) {
      console.error("Batch registration failed:", err);
      setServerError(err.reason || err.message || "Smart contract transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          Register Vaccine Batch
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Mint an immutable vaccine record on the blockchain with specific permissible temperature boundaries.
        </p>
      </div>

      {/* Role Notice */}
      {wallet.isConnected && wallet.role !== "Manufacturer" && wallet.role !== "Admin" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Role Warning: {wallet.role}</span>
            Smart contract requires <strong className="text-amber-200">Manufacturer</strong> or <strong className="text-amber-200">Admin</strong> role to register batches. (Local demo node deployer accounts hold pre-assigned Manufacturer role).
          </div>
        </div>
      )}

      {/* Success Modal / Banner */}
      {txResult && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Vaccine Batch Successfully Registered on Ethereum!</span>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div>Batch Identifier: <strong className="font-mono text-emerald-300">{txResult.batchId}</strong></div>
            {txResult.txHash && (
              <div className="font-mono text-[11px] text-slate-400 break-all">
                Transaction Hash: <span className="text-slate-200">{txResult.txHash}</span>
              </div>
            )}
            {wallet.isSepolia && txResult.txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline pt-1 text-xs"
              >
                <span>View on Sepolia Etherscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <button
            onClick={() => {
              setTxResult(null);
              setBatchId("");
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-900/60 text-emerald-200 text-xs hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            Register Another Batch
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-5">
        {/* Preset Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Pharmaceutical Vaccine Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VACCINE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.name}
                onClick={() => handlePresetChange(p.name)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedPreset === p.name
                    ? "bg-sky-500/10 border-sky-500 text-sky-200 ring-1 ring-sky-500/40"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs font-semibold text-slate-200">{p.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{p.description}</div>
                <div className="text-[10px] font-mono text-sky-400 mt-1">
                  Band: {p.minTemp}°C to {p.maxTemp}°C
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Batch ID */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Unique Batch ID *
            </label>
            <button
              type="button"
              onClick={generateRandomBatchId}
              className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto Generate ID</span>
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. VAX-2026-8812"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value.toUpperCase())}
            className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none ${
              formErrors.batchId ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
            }`}
          />
          {formErrors.batchId && (
            <p className="text-[11px] text-rose-400 mt-1">{formErrors.batchId}</p>
          )}
        </div>

        {/* Vaccine Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Vaccine Description / Antigen Formulation *
          </label>
          <input
            type="text"
            placeholder="e.g. Covishield (ChAdOx1-S)"
            value={vaccineName}
            onChange={(e) => setVaccineName(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none ${
              formErrors.vaccineName ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
            }`}
          />
          {formErrors.vaccineName && (
            <p className="text-[11px] text-rose-400 mt-1">{formErrors.vaccineName}</p>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Expiration Date *
          </label>
          <div className="relative">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none cursor-pointer ${
                formErrors.expiryDate ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
              }`}
            />
          </div>
          {formErrors.expiryDate && (
            <p className="text-[11px] text-rose-400 mt-1">{formErrors.expiryDate}</p>
          )}
        </div>

        {/* Temperature Boundaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Minimum Permitted Temp (°C) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={minTemp}
                onChange={(e) => setMinTemp(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border text-xs font-mono text-slate-200 focus:outline-none ${
                  formErrors.minTemp ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
                }`}
              />
            </div>
            {formErrors.minTemp && (
              <p className="text-[11px] text-rose-400 mt-1">{formErrors.minTemp}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Maximum Permitted Temp (°C) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={maxTemp}
                onChange={(e) => setMaxTemp(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-950 border text-xs font-mono text-slate-200 focus:outline-none ${
                  formErrors.maxTemp ? "border-rose-500" : "border-slate-800 focus:border-sky-500"
                }`}
              />
            </div>
            {formErrors.maxTemp && (
              <p className="text-[11px] text-rose-400 mt-1">{formErrors.maxTemp}</p>
            )}
          </div>
        </div>

        {/* Server/Blockchain Error Banner */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>{serverError}</div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/20 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Anchoring Batch to Blockchain...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Confirm & Register Batch on Ethereum</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
