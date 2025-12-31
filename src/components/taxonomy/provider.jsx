import React, { createContext, useContext, useMemo } from "react";
import taxonomyJson from "./taxonomy-config.json?url";
import { buildTaxonomyIndex, loadDiscoveryTaxonomy } from "./schema";

// Load JSON dynamically
const loadConfig = async () => {
  const response = await fetch(taxonomyJson);
  return response.json();
};

const TaxonomyContext = createContext(null);

export function TaxonomyProvider({ children }) {
  const [state, setState] = React.useState(null);

  React.useEffect(() => {
    loadConfig().then(json => {
      const cfg = loadDiscoveryTaxonomy(json);
      const idx = buildTaxonomyIndex(cfg);
      setState({ cfg, idx });
    });
  }, []);

  if (!state) return null;

  return <TaxonomyContext.Provider value={state}>{children}</TaxonomyContext.Provider>;
}

export function useTaxonomy() {
  const v = useContext(TaxonomyContext);
  if (!v) throw new Error("useTaxonomy must be used inside <TaxonomyProvider>");
  return v;
}