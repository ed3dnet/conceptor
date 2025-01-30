import { simpleGit, type SimpleGit } from "simple-git";

export async function getCurrentGitCommit(): Promise<string> {
  return process.env.GIT_COMMIT_HASH ?? (await getGitCommitFromRepo());
}

async function getGitCommitFromRepo() {
  let dirtySuffix = "";
  let git: SimpleGit;
  try {
    git = simpleGit();
    await git.checkIsRepo();
    const status = await git.status();
    if (!status.isClean()) {
      dirtySuffix = "-dirty";
    }
    const commitHash = await git.revparse(["--short", "HEAD"]);
    return commitHash + dirtySuffix;
  } catch (error) {
    // eslint-disable-next-line no-restricted-globals
    console.error("Error retrieving git information:", error);
    return "unknown";
  }
}
