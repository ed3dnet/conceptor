import { command } from "cmd-ts";
import * as Paseto from "paseto";

export const generatePasetoAsymmetricKeysCommand = command({
  name: "generate-paseto-asymmetric-keys",
  description:
    "Generates asymmetric keys for PASETO V4, in order to sign and verify tokens.",
  args: {},
  handler: async () => {
    const keys = await Paseto.V4.generateKey("public", { format: "paserk" });

    const ret = {
      keyPair: {
        type: "paseto-v4-public",
        ...keys,
      },
    };

    // eslint-disable-next-line no-restricted-globals
    console.log(JSON.stringify(ret, null, 2));
  },
});
