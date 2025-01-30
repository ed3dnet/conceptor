import { subcommands } from "cmd-ts";

import { completeImageUploadCommand } from "./complete-image-upload.js";
import { createImageUploadCommand } from "./create-image-upload.js";
import { vacuumUploadsCommand } from "./vacuum-uploads.js";

const subs = [
  completeImageUploadCommand,
  createImageUploadCommand,
  vacuumUploadsCommand,
].sort((a, b) => a.name.localeCompare(b.name));

export const IMAGES_CLI = subcommands({
  name: "images",
  cmds: Object.fromEntries(subs.map((cmd) => [cmd.name, cmd])),
});
