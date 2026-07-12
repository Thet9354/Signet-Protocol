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
    <div className="flex items-center gap-2">
      {passkey.address ? (
        <span
          className="badge"
          title={passkey.address}
          style={{ color: "var(--color-brass)", borderColor: "color-mix(in oklab, var(--color-brass) 35%, transparent)" }}
        >
          <span className="badge-dot" />
          <span className="t-mono">{shortAddress(passkey.address)}</span>
        </span>
      ) : (
        <button onClick={() => void passkey.register()} disabled={passkey.busy} className="btn btn-ghost btn-sm">
          {passkey.busy ? "…" : "Passkey sign-in"}
        </button>
      )}
      {isConnected && address ? (
        <button onClick={() => disconnect()} className="btn btn-secondary btn-sm" title="Disconnect">
          <span className="badge-dot" style={{ background: "var(--color-moss)" }} />
          <span className="t-mono">{shortAddress(address)}</span>
        </button>
      ) : (
        <button
          onClick={() => connectors[0] && connect({ connector: connectors[0] })}
          className="btn btn-secondary btn-sm"
        >
          Connect wallet
        </button>
      )}
    </div>
  );
}
