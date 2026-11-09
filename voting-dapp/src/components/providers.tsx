"use client";

import { useState, type ReactNode } from "react";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/config";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } }));
  return <WagmiProvider config={wagmiConfig}><QueryClientProvider client={queryClient}>
    <RainbowKitProvider locale="fr-FR" modalSize="compact" theme={lightTheme({ accentColor: "#ef6b3a", accentColorForeground: "#ffffff", borderRadius: "large", fontStack: "system", overlayBlur: "small" })}>
      {children}<Toaster position="bottom-right" richColors closeButton />
    </RainbowKitProvider>
  </QueryClientProvider></WagmiProvider>;
}
