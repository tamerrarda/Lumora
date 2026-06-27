"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { config } from "./config";

const STORAGE_KEY = "lumora:wallet";

// G…XYZ abbreviation (for error messages).
function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 5)}…${addr.slice(-4)}` : addr;
}

const walletNetwork =
  config.network === "mainnet" ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET;

// Single kit instance (browser side).
let _kit: StellarWalletsKit | null = null;
function getKit(): StellarWalletsKit {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: walletNetwork,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }
  return _kit;
}

type Signer = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string }
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: Signer;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ref so the signTransaction closure always sees the current address.
  const addressRef = useRef<string | null>(null);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Silent reconnect (previous session).
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!saved) return;
    try {
      const { walletId, addr } = JSON.parse(saved);
      const kit = getKit();
      kit.setWallet(walletId);
      setAddress(addr);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const kit = getKit();
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          kit.setWallet(option.id);
          const { address: addr } = await kit.getAddress();
          setAddress(addr);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ walletId: option.id, addr })
          );
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signTransaction = useCallback<Signer>(async (xdr, opts) => {
    const kit = getKit();
    const want = opts?.address ?? addressRef.current ?? undefined;

    // BEFORE signing: is the wallet's currently active account the same as the
    // transaction's source account? If not, Freighter produces an invalid
    // signature → the network returns txBadAuth. Throw an early, clear error.
    try {
      const live = await kit.getAddress();
      if (want && live?.address && live.address !== want) {
        throw new Error(
          `The active account in your wallet (${short(live.address)}) is different from ` +
            `this transaction's owner (${short(want)}). Switch to ${short(want)} in Freighter and try again.`
        );
      }
    } catch (e) {
      // if getAddress fails (e.g. a locked wallet) try signing anyway;
      // but swallow the mismatch error we threw.
      if (e instanceof Error && e.message.includes("active account")) throw e;
    }

    const { signedTxXdr, signerAddress } = await kit.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
      address: want,
    });

    // AFTER signing: who actually signed? If different from expected, stop.
    if (want && signerAddress && signerAddress !== want) {
      throw new Error(
        `Transaction was signed by ${short(signerAddress)} but the owner is ${short(want)}. ` +
          `Select the correct account in Freighter and try again.`
      );
    }
    return { signedTxXdr, signerAddress };
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, connecting, error, connect, disconnect, signTransaction }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
