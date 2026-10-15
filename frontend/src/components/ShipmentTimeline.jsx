import React from "react";
import {
  MapPin,
  Clock,
  ArrowRight,
  User,
  ShieldCheck,
  Building,
  Truck,
  Warehouse,
  Hospital,
} from "lucide-react";
import { formatAddress } from "../utils/validation";

export default function ShipmentTimeline({ custodyRecords = [] }) {
  if (!custodyRecords || custodyRecords.length === 0) {
    return (
      <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
        No custody transfer events recorded yet.
      </div>
    );
  }

  const getRoleIcon = (roleName) => {
    const r = (roleName || "").toLowerCase();
    if (r.includes("manufacturer")) return Building;
    if (r.includes("cold")) return Warehouse;
    if (r.includes("transport")) return Truck;
    if (r.includes("hospital")) return Hospital;
    return User;
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:via-cyan-600 before:to-emerald-500">
      {custodyRecords.map((record, index) => {
        const Icon = getRoleIcon(record.toRole);
        const isLatest = index === custodyRecords.length - 1;
        const dateObj = new Date(record.timestamp * 1000);
        const formattedDate = dateObj.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={index} className="relative group">
            {/* Step node dot */}
            <div
              className={`absolute -left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold shadow-md ${
                isLatest
                  ? "bg-sky-500 border-sky-400 text-white ring-4 ring-sky-500/20"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              <Icon className="w-3 h-3" />
            </div>

            {/* Content card */}
            <div
              className={`rounded-xl border p-4 transition-all ${
                isLatest
                  ? "bg-slate-900/90 border-sky-500/40 shadow-lg shadow-sky-500/5"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {record.from === "0x0000000000000000000000000000000000000000"
                      ? "Initial Batch Creation"
                      : `Custody Handoff #${index}`}
                  </span>
                  <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800/40">
                    {record.toRole}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>
                    {formattedDate} at {formattedTime}
                  </span>
                </div>
              </div>

              {/* Custodian Transition */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mb-2 font-mono bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/60">
                {record.from !== "0x0000000000000000000000000000000000000000" ? (
                  <>
                    <span className="text-slate-400">{formatAddress(record.from)}</span>
                    <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="text-emerald-400 font-semibold">{formatAddress(record.to)}</span>
                  </>
                ) : (
                  <span className="text-emerald-400 font-semibold">
                    Produced by {formatAddress(record.to)}
                  </span>
                )}
              </div>

              {/* Location & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{record.location || "Unspecified Facility"}</span>
                </div>
                {record.notes && (
                  <div className="text-slate-400 italic">
                    "{record.notes}"
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
