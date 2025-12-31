import React, { createContext, useContext, useMemo } from "react";
import taxonomyJson from "../../config/discovery-taxonomy.v1.json";
import { buildTaxonomyIndex, loadDiscoveryTaxonomy } from "./schema";

const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ children }) {
  const cfg = useMemo(() => loadDiscoveryTaxonomy(taxonomyJson), []);
  const idx = useMemo(() => buildTaxonomyIndex(cfg), [cfg]);

  return <TaxonomyContext.Provider value={{ cfg, idx }}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy() {
  const v = useContext(TaxonomyContext);
  if (!v) throw new Error("useTaxonomy must be used inside <TaxonomyProvider>");
  return v;
}