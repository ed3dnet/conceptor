import { zxcvbnAsync, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { matcherPwnedFactory } from "@zxcvbn-ts/matcher-pwned";

import { type FetchFn } from "./fetch.js";

export type Zxcvbn = ReturnType<typeof zxcvbn>;

let isInitialized = false;

export function initializeZxcvbn(fetch: FetchFn) {
  const matcherPwned = matcherPwnedFactory(fetch, zxcvbnOptions);
  zxcvbnOptions.addMatcher("pwned", matcherPwned);

  const options = {
    // recommended
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
      ...zxcvbnEnPackage.dictionary,
    },
    // recommended
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    // recommended
    useLevenshteinDistance: true,
    // optional
    translations: zxcvbnEnPackage.translations,
  };
  zxcvbnOptions.setOptions(options);

  isInitialized = true;
}

export function zxcvbn() {
  if (!isInitialized) {
    throw new Error("zxcvbn must be initialized before use.");
  }

  return zxcvbnAsync;
}
