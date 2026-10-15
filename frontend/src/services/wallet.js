import { BrowserProvider, formatEther } from "ethers";

export const NETWORKS = {
  SEPOLIA: {
    chainId: "0xaa36a7", // 11155111
    chainName: "Ethereum Sepolia Testnet",
    nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org", "https://eth-sepolia.public.blastapi.io"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
  HARDHAT: {
    chainId: "0x7a69", // 31337
    chainName: "Hardhat Local Node",
    nativeCurrency: { name: "Hardhat Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: [],
  },
};

export const SEPOLIA_CHAIN_ID = 11155111n;
export const HARDHAT_CHAIN_ID = 31337n;

/**
 * Robust provider resolver that handles:
 * - Standard MetaMask (window.ethereum)
 * - Brave Browser (which may inject window.ethereum with both Brave Wallet and MetaMask)
 * - Multiple wallet extensions (window.ethereum.providers array)
 */
export function getEthereum() {
  if (typeof window === "undefined" || !window.ethereum) return null;

  // If Brave or another browser has multiple injected providers
  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    // Prefer genuine MetaMask if installed alongside Brave Wallet
    const metaMaskProvider = window.ethereum.providers.find(
      (p) => p.isMetaMask && !p.isBraveWallet
    );
    if (metaMaskProvider) return metaMaskProvider;

    // Otherwise return first available provider (e.g. Brave Wallet)
    return window.ethereum.providers[0];
  }

  return window.ethereum;
}

/**
 * Check if MetaMask or compatible EIP-1193 wallet is available
 */
export function isWalletInstalled() {
  return Boolean(getEthereum());
}

/**
 * Get an ethers BrowserProvider safely
 */
export function getBrowserProvider() {
  const eth = getEthereum();
  if (!eth) return null;
  return new BrowserProvider(eth);
}

/**
 * Connect to wallet. Reads accounts and chainId directly from EIP-1193 provider.
 * Does NOT throw if balance or network name fails to resolve over RPC.
 */
export async function connectWallet() {
  const eth = getEthereum();
  if (!eth) {
    throw new Error("No Web3 wallet detected. Please install or enable MetaMask.");
  }

  // Request accounts directly from extension
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No account authorized. Please approve connection in your wallet.");
  }

  const address = accounts[0];

  // Retrieve current chain ID directly from wallet without relying on HTTP RPC ping
  let chainId = 0n;
  try {
    const rawChainId = await eth.request({ method: "eth_chainId" });
    chainId = BigInt(rawChainId);
  } catch (err) {
    console.warn("Could not query eth_chainId:", err);
  }

  const isSepolia = chainId === SEPOLIA_CHAIN_ID;
  const isLocalhost = chainId === HARDHAT_CHAIN_ID;
  const networkName = isSepolia
    ? "Sepolia"
    : isLocalhost
    ? "Hardhat Local (31337)"
    : chainId > 0n
    ? `Chain ${chainId.toString()}`
    : "Unknown Network";

  // Balance query with graceful fallback
  let balance = "0.0000";
  try {
    const provider = getBrowserProvider();
    if (provider) {
      const balanceRaw = await provider.getBalance(address);
      balance = parseFloat(formatEther(balanceRaw)).toFixed(4);
    }
  } catch (err) {
    console.warn("Could not query balance (node may be offline or syncing):", err.message);
  }

  return {
    address,
    chainId,
    networkName,
    balance,
    isSepolia,
    isLocalhost,
  };
}

/**
 * Switch wallet to Sepolia testnet
 */
export async function switchToSepolia() {
  const eth = getEthereum();
  if (!eth) throw new Error("Wallet not detected");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORKS.SEPOLIA.chainId }],
    });
    return true;
  } catch (switchError) {
    // 4902: Unrecognized chain
    if (switchError.code === 4902 || switchError.code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [NETWORKS.SEPOLIA],
      });
      return true;
    }
    throw switchError;
  }
}

/**
 * Switch wallet to Local Hardhat Network (31337)
 */
export async function switchToLocalhost() {
  const eth = getEthereum();
  if (!eth) throw new Error("Wallet not detected");

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: NETWORKS.HARDHAT.chainId }],
    });
    return true;
  } catch (switchError) {
    if (switchError.code === 4902 || switchError.code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [NETWORKS.HARDHAT],
      });
      return true;
    }
    throw switchError;
  }
}

/**
 * Silently check active connection without triggering a user popup.
 * Resilient against offline RPCs.
 */
export async function checkConnection() {
  const eth = getEthereum();
  if (!eth) return null;

  try {
    const accounts = await eth.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) return null;

    const address = accounts[0];

    let chainId = 0n;
    try {
      const rawChainId = await eth.request({ method: "eth_chainId" });
      chainId = BigInt(rawChainId);
    } catch {
      // ignore
    }

    const isSepolia = chainId === SEPOLIA_CHAIN_ID;
    const isLocalhost = chainId === HARDHAT_CHAIN_ID;
    const networkName = isSepolia
      ? "Sepolia"
      : isLocalhost
      ? "Hardhat Local (31337)"
      : chainId > 0n
      ? `Chain ${chainId.toString()}`
      : "Unknown Network";

    let balance = "0.0000";
    try {
      const provider = getBrowserProvider();
      if (provider) {
        const balanceRaw = await provider.getBalance(address);
        balance = parseFloat(formatEther(balanceRaw)).toFixed(4);
      }
    } catch {
      // Don't drop connection if RPC is down
    }

    return {
      address,
      chainId,
      networkName,
      balance,
      isSepolia,
      isLocalhost,
    };
  } catch (error) {
    console.warn("Could not silently check connection:", error);
    return null;
  }
}
