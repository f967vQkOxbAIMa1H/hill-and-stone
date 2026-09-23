"use client";

import { createContext, useContext } from "react";
import { defaultSite, type SiteConfig } from "@/lib/site";

const SiteContext = createContext<SiteConfig>(defaultSite);

/** Makes the current business settings available to client components. Set once in the root layout. */
export function SiteProvider({ value, children }: { value: SiteConfig; children: React.ReactNode }) {
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
