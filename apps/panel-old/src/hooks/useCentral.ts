import { useContext } from "react";

import { CentralAPIContext } from "../contexts/central-api";

export function useCentral() {
  const context = useContext(CentralAPIContext);

  return context;
}
