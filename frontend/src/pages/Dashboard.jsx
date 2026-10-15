import React, { useState, useEffect } from "react";
import {
  Box,
  Truck,
  AlertOctagon,
  ShieldCheck,
  PlusCircle,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Search,
  CheckCircle2,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge";
import { fetchAllBatches } from "../services/contract";
import { formatAddress } from "../utils/validation";

export default function Dashboard({ onNavigate, onSelectBatch }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await fetchAllBatches();
      setBatches(data);
    } catch (err) {
      console.error("Dashboard failed to load batches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  // Compute Metrics
  const totalBatches = batches.length;
  const inTransitCount = batches.filter((b) => b.status === "IN_TRANSIT").length;
  const excursionCount = batches.filter((b) => b.hasExcursion || b.status === "EXCURSION_DETECTED").length;
  const certificatesCount = batches.filter((b) => b.latestCertificateHash && b.latestCertificateHash !== "0x0000000000000000000000000000000000000000000000000000000000000000").length;

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vaccineName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Cold Chain Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time vaccine batches, simulated temperature telemetry, and Ethereum integrity records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadBatches}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate("register")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-cyan-500 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Batch</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Batches */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Batches</span>
            <div className="p-2 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalBatches}</div>
          <div className="text-[11px] text-slate-500 mt-1">Smart contract registered</div>
        </div>

        {/* In Transit */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Active Shipments</span>
            <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">{inTransitCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">En route across cold chain</div>
        </div>

        {/* Violations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Excursions Flagged</span>
            <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/40">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{excursionCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Permanent immutable audit flags</div>
        </div>

        {/* Certificates */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Certificates Anchored</span>
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{certificatesCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Keccak-256 cryptographic digests</div>
        </div>
      </div>

      {/* Main Batches Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Registered Vaccine Inventory</h2>
            <p className="text-xs text-slate-400">Click any batch to inspect detailed audit trails or launch the software simulator.</p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search batch or vaccine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="EXCURSION_DETECTED">Excursion</option>
            </select>
          </div>
        </div>

        {/* Table of Batches */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400" />
            <div>Synchronizing batch telemetry from smart contract...</div>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div>No vaccine batches match the current filter.</div>
            <button
              onClick={() => onNavigate("register")}
              className="text-sky-400 hover:underline"
            >
              Register your first vaccine batch &rarr;
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-3 px-3">Batch ID</th>
                  <th className="py-3 px-3">Vaccine Name</th>
                  <th className="py-3 px-3">Safe Temperature Band</th>
                  <th className="py-3 px-3">Current Custodian</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredBatches.map((batch) => (
                  <tr
                    key={batch.batchId}
                    className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    onClick={() => {
                      onSelectBatch(batch);
                      onNavigate("details");
                    }}
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-sky-400">
                      {batch.batchId}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {batch.vaccineName}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {batch.minTemp}°C to {batch.maxTemp}°C
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {formatAddress(batch.currentCustodian)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge
                        status={batch.hasExcursion ? "EXCURSION_DETECTED" : batch.status}
                        pulse={batch.hasExcursion}
                      />
                    </td>
                    <td className="py-3 px-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onSelectBatch(batch);
                          onNavigate("simulator");
                        }}
                        title="Open in Temperature Simulator"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800/60 hover:bg-sky-900 transition-colors"
                      >
                        <Activity className="w-3 h-3 text-sky-400" />
                        <span>Simulate</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectBatch(batch);
                          onNavigate("details");
                        }}
                        title="View Detailed Records & Certificate"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      >
                        <span>Audit</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
