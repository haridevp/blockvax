import { useState, useEffect, useCallback } from "react";
import {
  isWalletInstalled,
  getEthereum,
  connectWallet as connectWalletService,
  checkConnection,
  switchToSepolia,
  switchToLocalhost,
  SEPOLIA_CHAIN_ID,
  HARDHAT_CHAIN_ID,
} from "../services/wallet";
import { fetchUserRole } from "../services/contract";

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0.0000");
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState("");
  const [role, setRole] = useState("None");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const updateAccountState = useCallback(async (walletInfo) => {
    if (!walletInfo) {
      setAccount(null);
      setBalance("0.0000");
      setChainId(null);
      setNetworkName("");
      setRole("None");
      return;
    }

    setAccount(walletInfo.address);
    setBalance(walletInfo.balance || "0.0000");
    setChainId(walletInfo.chainId);
    setNetworkName(walletInfo.networkName);

    try {
      const userRole = await fetchUserRole(walletInfo.address);
      setRole(userRole);
    } catch {
      setRole("None");
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const walletInfo = await connectWalletService();
      await updateAccountState(walletInfo);
      return walletInfo;
    } catch (err) {
      console.error("Wallet connection failed:", err);
      const msg = err.reason || err.message || "Failed to connect wallet";
      setError(msg);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [updateAccountState]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance("0.0000");
    setChainId(null);
    setNetworkName("");
    setRole("None");
    setError(null);
  }, []);

  const changeToSepolia = useCallback(async () => {
    setError(null);
    try {
      await switchToSepolia();
      const info = await checkConnection();
      if (info) await updateAccountState(info);
    } catch (err) {
      setError(err.reason || err.message || "Failed to switch to Sepolia");
    }
  }, [updateAccountState]);

  const changeToLocalhost = useCallback(async () => {
    setError(null);
    try {
      await switchToLocalhost();
      const info = await checkConnection();
      if (info) await updateAccountState(info);
    } catch (err) {
      setError(err.reason || err.message || "Failed to switch to Localhost");
    }
  }, [updateAccountState]);

  // Initial silent connection check & event listeners
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const info = await checkConnection();
        if (mounted && info) {
          await updateAccountState(info);
        }
      } catch (err) {
        console.warn("Silent connection check error:", err);
      }
    }
    init();

    const eth = getEthereum();
    if (eth && eth.on) {
      const handleAccountsChanged = async (accounts) => {
        if (!mounted) return;
        if (!accounts || accounts.length === 0) {
          disconnect();
        } else {
          const info = await checkConnection();
          if (mounted && info) await updateAccountState(info);
        }
      };

      const handleChainChanged = async () => {
        if (!mounted) return;
        try {
          const info = await checkConnection();
          if (mounted && info) {
            await updateAccountState(info);
          }
        } catch {
          window.location.reload();
        }
      };

      eth.on("accountsChanged", handleAccountsChanged);
      eth.on("chainChanged", handleChainChanged);

      return () => {
        mounted = false;
        if (eth.removeListener) {
          eth.removeListener("accountsChanged", handleAccountsChanged);
          eth.removeListener("chainChanged", handleChainChanged);
        }
      };
    }

    return () => {
      mounted = false;
    };
  }, [updateAccountState, disconnect]);

  const isSepolia = chainId === SEPOLIA_CHAIN_ID;
  const isLocalhost = chainId === HARDHAT_CHAIN_ID;
  const isConnected = Boolean(account);

  return {
    account,
    balance,
    chainId,
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
    refreshRole: async () => {
      if (account) {
        const r = await fetchUserRole(account);
        setRole(r);
      }
    },
  };
}
