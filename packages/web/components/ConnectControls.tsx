"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

import { shortAddress } from "@/lib/contracts/aegis";
import { usePasskeyAccount } from "@/components/usePasskeyAccount";

/** Dual persona controls: funder = injected EOA/Safe; contributor = passkey smart account. */
export function ConnectControls() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const passkey = usePasskeyAccount();

  return (
    <div className="flex items-center gap-3">
      {passkey.address ? (
        <span className="rounded-full bg-violet-950 px-3 py-1 text-xs text-violet-300">
          passkey {shortAddress(passkey.address)}
        </span>
      ) : (
        <button
          onClick={() => void passkey.register()}
          disabled={passkey.busy}
          className="rounded-full border border-violet-800 px-3 py-1 text-xs text-violet-300 hover:bg-violet-950 disabled:opacity-50"
        >
          {passkey.busy ? "…" : "Passkey sign-in"}
        </button>
      )}
      {isConnected && address ? (
        <button
          onClick={() => disconnect()}
          className="rounded-full bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
          title="Disconnect"
        >
          {shortAddress(address)}
        </button>
      ) : (
        <button
          onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          className="rounded-full border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800"
        >
          Connect wallet
        </button>
      )}
    </div>
  );
}
