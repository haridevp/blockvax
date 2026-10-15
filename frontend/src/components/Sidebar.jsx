import React from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Truck,
  Activity,
  FileSearch,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export default function Sidebar({ activeTab, onSelectTab, batchCount = 0 }) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview & batch telemetry",
    },
    {
      id: "register",
      label: "Register Batch",
      icon: PlusCircle,
      description: "Create new vaccine batch",
    },
    {
      id: "shipments",
      label: "Shipment Tracking",
      icon: Truck,
      description: "Custody transfers & transit",
    },
    {
      id: "simulator",
      label: "Temperature Simulator",
      icon: Activity,
      description: "Software sensor models",
      badge: "Interactive",
    },
    {
      id: "details",
      label: "Batch Details",
      icon: FileSearch,
      description: "Audit trail & checkpoint logs",
    },
    {
      id: "verify",
      label: "Verify Certificate",
      icon: ShieldCheck,
      description: "Tamper-evident verification",
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Cold Chain Navigation
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                    <div>
                      <div className="text-xs font-medium leading-none">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-1 leading-none">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
