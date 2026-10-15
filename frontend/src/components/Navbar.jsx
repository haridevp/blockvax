import React from "react";
import {
  ThermometerSnowflake,
  ShieldAlert,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import ConnectWallet from "./ConnectWallet";
import { CONTRACT_ADDRESS } from "../services/contract";
import { formatAddress } from "../utils/validation";

export default function Navbar({ wallet, onToggleSidebar, activeTab }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 shadow-md shadow-sky-500/20 text-white">
            <ThermometerSnowflake className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-sky-400 bg-clip-text text-transparent">
                BlockVax
              </span>
              <span className="rounded-md bg-sky-950 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-800/50">
                v1.0-PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Software-Only Cold Chain Verification
            </p>
          </div>
        </div>

        {/* Prototype Hardware Disclaimer Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Hardware Restriction Active: <strong className="text-amber-300 font-medium">100% Software Simulated</strong>
          </span>
        </div>

        {/* Contract Address & Wallet Action */}
        <div className="flex items-center gap-3">
          {/* Smart Contract Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Contract:</span>
            <span className="font-mono text-slate-200 font-medium">
              {formatAddress(CONTRACT_ADDRESS, 3)}
            </span>
            {wallet.isSepolia && (
              <a
                href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Sepolia Etherscan"
                className="text-slate-500 hover:text-sky-400 ml-0.5"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Connect Wallet Widget */}
          <ConnectWallet wallet={wallet} />
        </div>
      </div>
    </header>
  );
}
