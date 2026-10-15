import React, { useState } from "react";
import {
  Wallet,
  Check,
  Copy,
  LogOut,
  ChevronDown,
  Layers,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { formatAddress } from "../utils/validation";
import { isWalletInstalled, getEthereum } from "../services/wallet";

export default function ConnectWallet({ wallet }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localConnecting, setLocalConnecting] = useState(false);

  const {
    account,
    balance,
    networkName,
    role,
    isConnected,
    isConnecting,
    isSepolia,
    isLocalhost,
    error,
    connect,
    disconnect,
    changeToSepolia,
    changeToLocalhost,
  } = wallet;

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectClick = async () => {
    setLocalConnecting(true);
    try {
      await connect();
    } catch (err) {
      console.warn("Connection attempt details:", err);
    } finally {
      setLocalConnecting(false);
    }
  };

  // Check if wallet is present
  const hasWallet = isWalletInstalled();

  if (!hasWallet) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
      >
        <AlertCircle className="w-4 h-4" />
        <span>Install MetaMask</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleConnectClick}
          disabled={isConnecting || localConnecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-cyan-500 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
        >
          {isConnecting || localConnecting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4" />
          )}
          <span>
            {isConnecting || localConnecting ? "Connecting..." : "Connect MetaMask"}
          </span>
        </button>

        {error && (
          <div className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-1 rounded-lg mt-1 max-w-xs text-right">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate" title={error}>
              {error.includes("already pending")
                ? "Click the MetaMask icon in your browser toolbar to approve!"
                : error}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/70 hover:border-slate-600 transition-colors cursor-pointer text-left shadow-sm"
      >
        {/* Network status dot */}
        <div className="relative flex items-center justify-center">
          <span
            className={`w-2 h-2 rounded-full ${
              isSepolia ? "bg-emerald-400" : isLocalhost ? "bg-cyan-400" : "bg-amber-400"
            }`}
          />
          <span
            className={`absolute w-3.5 h-3.5 rounded-full animate-ping opacity-30 ${
              isSepolia ? "bg-emerald-400" : isLocalhost ? "bg-cyan-400" : "bg-amber-400"
            }`}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-medium text-slate-200">
              {formatAddress(account)}
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
              {role}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {balance} ETH
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 border-b border-slate-800/80 mb-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Connected Account</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-200 break-all select-all bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              {account}
            </div>
          </div>

          {/* Network Switcher */}
          <div className="px-2 py-1.5 space-y-1 mb-2 border-b border-slate-800/80">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
              Active Network: <span className="text-slate-200">{networkName || (isSepolia ? "Sepolia" : isLocalhost ? "Hardhat 31337" : "Custom")}</span>
            </span>
            <div className="flex gap-2 pt-1">
              <button
                onClick={changeToSepolia}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                  isSepolia
                    ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Sepolia
              </button>
              <button
                onClick={changeToLocalhost}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                  isLocalhost
                    ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Localhost (31337)
              </button>
            </div>
          </div>

          {/* Sepolia Explorer Link */}
          {account && isSepolia && (
            <a
              href={`https://sepolia.etherscan.io/address/${account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-sky-400 hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                View on Sepolia Explorer
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Disconnect */}
          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect Session</span>
          </button>
        </div>
      )}
    </div>
  );
}
