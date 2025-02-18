import { useContext } from "react";

import { ThemeProviderContext } from "../contexts/theme.tsx";

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
