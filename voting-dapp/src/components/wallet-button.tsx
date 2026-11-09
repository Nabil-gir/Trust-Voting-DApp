"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, CircleAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted, authenticationStatus }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated");
        if (!ready) return <Button className="wallet-button" disabled><Wallet size={16} />Connexion au wallet</Button>;
        if (!connected) return <Button className="wallet-button" onClick={openConnectModal}><Wallet size={16} />Connecter mon wallet</Button>;
        if (chain.unsupported) return <Button className="wallet-button" variant="destructive" onClick={openChainModal}><CircleAlert size={16} />Changer de réseau</Button>;
        return <Button className="wallet-button wallet-connected" onClick={openAccountModal}><span className="wallet-avatar" aria-hidden="true" />{account.displayName}<ChevronDown size={14} /></Button>;
      }}
    </ConnectButton.Custom>
  );
}
