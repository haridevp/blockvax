import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Truck,
  Box,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function StatusBadge({ status, size = "md", pulse = false }) {
  const normStatus = (status || "").toUpperCase();

  let config = {
    bg: "bg-slate-800/80",
    text: "text-slate-300",
    border: "border-slate-700",
    icon: Clock,
    label: status || "Unknown",
  };

  switch (normStatus) {
    case "OPTIMAL":
      config = {
        bg: "bg-emerald-950/60",
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        icon: CheckCircle2,
        label: "Optimal Range",
      };
      break;

    case "WARNING":
      config = {
        bg: "bg-amber-950/60",
        text: "text-amber-400",
        border: "border-amber-500/40",
        icon: AlertTriangle,
        label: "Near Threshold",
      };
      break;

    case "EXCURSION":
    case "EXCURSION_DETECTED":
      config = {
        bg: "bg-rose-950/70",
        text: "text-rose-400",
        border: "border-rose-500/50",
        icon: AlertOctagon,
        label: "Excursion Breach",
      };
      break;

    case "REGISTERED":
      config = {
        bg: "bg-indigo-950/60",
        text: "text-indigo-400",
        border: "border-indigo-500/40",
        icon: Box,
        label: "Registered",
      };
      break;

    case "IN_TRANSIT":
      config = {
        bg: "bg-cyan-950/60",
        text: "text-cyan-400",
        border: "border-cyan-500/40",
        icon: Truck,
        label: "In Transit",
      };
      break;

    case "DELIVERED":
      config = {
        bg: "bg-emerald-950/60",
        text: "text-emerald-400",
        border: "border-emerald-500/40",
        icon: ShieldCheck,
        label: "Delivered",
      };
      break;

    case "UNDER_REVIEW":
      config = {
        bg: "bg-amber-950/60",
        text: "text-amber-400",
        border: "border-amber-500/40",
        icon: AlertTriangle,
        label: "Under Review",
      };
      break;

    default:
      break;
  }

  const Icon = config.icon;
  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 gap-1.5"
      : size === "lg"
      ? "text-sm px-3.5 py-1.5 gap-2 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${
        pulse && (normStatus === "EXCURSION" || normStatus === "EXCURSION_DETECTED")
          ? "animate-pulse ring-2 ring-rose-500/30"
          : ""
      }`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      <span>{config.label}</span>
    </span>
  );
}
