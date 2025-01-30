import { command } from "cmd-ts";
import * as Paseto from "paseto";

export const generatePasetoSymmetricKeysCommand = command({
  name: "generate-paseto-symmetric-keys",
  description:
    "Generates symmetric keys for PASETO V3, in order to encrypt tokens.",
  args: {},
  handler: async () => {
    const key = await Paseto.V3.generateKey("local", { format: "paserk" });

    const ret = {
      keyPair: {
        type: "paseto-v3-local",
        key,
      },
    };

    // eslint-disable-next-line no-restricted-globals
    console.log(JSON.stringify(ret, null, 2));
  },
});
