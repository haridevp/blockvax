import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Sliders,
  Send,
  Database,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Flame,
  Snowflake,
  HelpCircle,
} from "lucide-react";
import TemperatureChart from "../components/TemperatureChart";
import StatusBadge from "../components/StatusBadge";
import {
  TemperatureSimulator,
  SIMULATION_MODES,
} from "../services/temperatureSimulator";
import { recordCheckpointOnChain, fetchAllBatches } from "../services/contract";
import { validateManualTemperature } from "../utils/validation";

export default function TemperatureSimulatorPage({
  wallet,
  activeBatch,
  onSelectBatch,
}) {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(
    activeBatch ? activeBatch.batchId : ""
  );
  const [currentBatch, setCurrentBatch] = useState(activeBatch || null);

  // Simulator Instance
  const simRef = useRef(null);
  const [mode, setMode] = useState(SIMULATION_MODES.NORMAL);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [intervalMs, setIntervalMs] = useState(1500);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState({
    sampleCount: 0,
    minObserved: null,
    maxObserved: null,
    avgObserved: null,
    excursionCount: 0,
    hasExcursion: false,
    prototypeAssessment: "AWAITING_SIMULATION",
  });

  // Manual Mode Input
  const [manualTempInput, setManualTempInput] = useState("");
  const [manualCheckpointRef, setManualCheckpointRef] = useState("Manual QA Receiving Checkpoint");
  const [manualError, setManualError] = useState(null);

  // Blockchain Anchoring
  const [anchorNotes, setAnchorNotes] = useState("");
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorSuccess, setAnchorSuccess] = useState(null);
  const [anchorError, setAnchorError] = useState(null);

  // Load available batches
  useEffect(() => {
    async function load() {
      try {
        const list = await fetchAllBatches();
        setBatches(list);
        if (!selectedBatchId && list.length > 0) {
          setSelectedBatchId(list[0].batchId);
          setCurrentBatch(list[0]);
        }
      } catch (err) {
        console.error("Could not fetch batches for simulator:", err);
      }
    }
    load();
  }, [selectedBatchId]);

  // Handle batch selection
  useEffect(() => {
    if (selectedBatchId && batches.length > 0) {
      const found = batches.find((b) => b.batchId === selectedBatchId);
      if (found) {
        setCurrentBatch(found);
        if (onSelectBatch) onSelectBatch(found);

        // Re-init simulator for new batch
        if (simRef.current) {
          simRef.current.reset();
        }
        const sim = new TemperatureSimulator({
          batchId: found.batchId,
          vaccineName: found.vaccineName,
          minTemp: found.minTemp,
          maxTemp: found.maxTemp,
        });

        sim.subscribe((latest, sum, allReadings) => {
          setReadings([...allReadings]);
          setSummary({ ...sum });
        });

        simRef.current = sim;
        setIsRunning(false);
        setIsPaused(false);
        setAnchorSuccess(null);
        setAnchorError(null);
      }
    }
  }, [selectedBatchId, batches]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simRef.current) {
        simRef.current.pause();
      }
    };
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (simRef.current) {
      simRef.current.setMode(newMode);
    }
  };

  const handleStart = () => {
    if (!simRef.current) return;
    simRef.current.start();
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!simRef.current) return;
    simRef.current.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (!simRef.current) return;
    simRef.current.resume();
    setIsPaused(false);
  };

  const handleReset = () => {
    if (!simRef.current) return;
    simRef.current.reset();
    setIsRunning(false);
    setIsPaused(false);
    setReadings([]);
    setAnchorSuccess(null);
    setAnchorError(null);
  };

  const handleSpeedChange = (ms) => {
    setIntervalMs(ms);
    if (simRef.current) {
      simRef.current.setInterval(ms);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setManualError(null);

    const val = validateManualTemperature(manualTempInput);
    if (!val.isValid) {
      setManualError(val.error);
      return;
    }

    if (!simRef.current) return;
    simRef.current.submitManualReading(val.value, manualCheckpointRef);
    setManualTempInput("");
  };

  // Anchor Checkpoint to Smart Contract
  const handleAnchorToBlockchain = async () => {
    setAnchorError(null);
    setAnchorSuccess(null);

    if (readings.length === 0) {
      setAnchorError("No simulated temperature readings available to anchor.");
      return;
    }

    if (!wallet.isConnected) {
      setAnchorError("MetaMask wallet connection is required to anchor evidence on-chain.");
      return;
    }

    setIsAnchoring(true);
    try {
      const evidence = simRef.current.generateEvidencePackage(anchorNotes);

      const result = await recordCheckpointOnChain({
        batchId: currentBatch.batchId,
        locationOrStage: simRef.current.checkpointRef,
        minObserved: evidence.stats.minObserved,
        maxObserved: evidence.stats.maxObserved,
        avgObserved: evidence.stats.avgObserved,
        sampleCount: evidence.stats.sampleCount,
        excursionDetected: evidence.stats.hasExcursion,
        evidenceHash: evidence.evidenceHash,
        notes: anchorNotes || "Simulator telemetry checkpoint",
      });

      setAnchorSuccess({
        batchId: currentBatch.batchId,
        evidenceHash: evidence.evidenceHash,
        txHash: result.txHash,
        sampleCount: evidence.stats.sampleCount,
        excursionDetected: evidence.stats.hasExcursion,
      });
    } catch (err) {
      console.error("Failed to anchor checkpoint:", err);
      setAnchorError(err.reason || err.message || "Smart contract checkpoint transaction failed.");
    } finally {
      setIsAnchoring(false);
    }
  };

  if (!currentBatch) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading vaccine batches for temperature simulator...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Prominent Hardware Restriction Disclaimer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-400" />
            <span>Software Temperature Simulator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulates realistic vaccine thermal dynamics in software. No physical hardware or IoT sensors required.
          </p>
        </div>

        {/* Hardware Restriction Banner */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <strong className="font-semibold block text-[11px] uppercase tracking-wider text-amber-400">
              Hardware Restriction Enforced
            </strong>
            <span className="text-[11px] text-slate-300">
              Readings generated via deterministic software models or manual test input.
            </span>
          </div>
        </div>
      </div>

      {/* Batch Selector & Permitted Band Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Batch:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-400 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} — {b.vaccineName} ({b.minTemp}°C to {b.maxTemp}°C)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Configured Safe Range:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
              {currentBatch.minTemp}°C to {currentBatch.maxTemp}°C
            </span>
            <StatusBadge
              status={currentBatch.hasExcursion ? "EXCURSION_DETECTED" : currentBatch.status}
            />
          </div>
        </div>
      </div>

      {/* Simulator Control Deck */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* Mode Selector Tabs */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Simulation Mode
            </span>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => handleModeChange(SIMULATION_MODES.NORMAL)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                  mode === SIMULATION_MODES.NORMAL
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Normal Mode (In Range)</span>
              </button>

              <button
                onClick={() => handleModeChange(SIMULATION_MODES.EXCURSION)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                  mode === SIMULATION_MODES.EXCURSION
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Excursion Mode (Inject Violation)</span>
              </button>

              <button
                onClick={() => handleModeChange(SIMULATION_MODES.MANUAL)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                  mode === SIMULATION_MODES.MANUAL
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual Input Mode</span>
              </button>
            </div>
          </div>

          {/* Engine Controls (Start / Pause / Resume / Reset) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block md:text-right">
              Engine Controls
            </span>
            <div className="flex items-center gap-2">
              {!isRunning || isPaused ? (
                <button
                  onClick={isRunning ? handleResume : handleStart}
                  disabled={mode === SIMULATION_MODES.MANUAL}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isRunning ? "Resume Stream" : "Start Simulator"}</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Stream</span>
                </button>
              )}

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              {/* Tick Speed */}
              <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
                <span className="text-[10px] text-slate-500">Speed:</span>
                {[1000, 1500, 3000].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      intervalMs === spd
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {spd / 1000}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Manual Input Bar (Shown if Manual Mode Active) */}
        {mode === SIMULATION_MODES.MANUAL && (
          <form
            onSubmit={handleManualSubmit}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Sliders className="w-4 h-4" />
              <span>Manual Test Injection Console</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Temperature Reading (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 4.2 or 14.5"
                  value={manualTempInput}
                  onChange={(e) => setManualTempInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Shipment Checkpoint Reference
                </label>
                <input
                  type="text"
                  value={manualCheckpointRef}
                  onChange={(e) => setManualCheckpointRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Sample</span>
                </button>
              </div>
            </div>
            {manualError && (
              <p className="text-rose-400 text-[11px]">{manualError}</p>
            )}
          </form>
        )}

        {/* Excursion Alarm Banner */}
        {summary.hasExcursion && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/60 text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-300 block text-sm">
                  Cold Chain Temperature Excursion Detected!
                </strong>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  {summary.excursionCount} simulated sample(s) breached the permitted band ({currentBatch.minTemp}°C to {currentBatch.maxTemp}°C). Batch is flagged as requiring quality review.
                </p>
                <div className="mt-1 text-[10px] text-rose-400 uppercase tracking-wider font-semibold">
                  Status: {summary.prototypeAssessment}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Temperature Chart Component */}
        <TemperatureChart
          readings={readings}
          minTemp={currentBatch.minTemp}
          maxTemp={currentBatch.maxTemp}
          vaccineName={currentBatch.vaccineName}
        />

        {/* Blockchain Evidence Checkpoint Anchoring */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-400" />
                <span>Anchor Checkpoint Evidence to Smart Contract</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Computes a Keccak-256 cryptographic digest across current readings and commits checkpoint metrics on-chain.
              </p>
            </div>

            <button
              onClick={handleAnchorToBlockchain}
              disabled={isAnchoring || readings.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-sky-500/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              {isAnchoring ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Anchoring on Ethereum...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Anchor {readings.length} Samples On-Chain</span>
                </>
              )}
            </button>
          </div>

          <input
            type="text"
            placeholder="Checkpoint notes (e.g. Refrigerated transit leg #2 periodic check)"
            value={anchorNotes}
            onChange={(e) => setAnchorNotes(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />

          {anchorSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Checkpoint Anchored to Blockchain!</span>
              </div>
              <div className="font-mono text-[11px] text-slate-400 break-all">
                Evidence Hash: {anchorSuccess.evidenceHash}
              </div>
              <div className="font-mono text-[11px] text-slate-400 break-all">
                Tx Hash: {anchorSuccess.txHash}
              </div>
            </div>
          )}

          {anchorError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
              {anchorError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
