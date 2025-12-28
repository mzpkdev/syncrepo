import { defineCommand }              from "cmdore"
import remote                         from "../options/remote"
import branch                         from "../options/branch"
import git, { GitError, isGitRemote } from "../utils/git"
import config                         from "../utils/config"


export default defineCommand({
    name: "init",
    description: "Initialize a template repository in the current directory",
    examples: [
        "--remote https://github.com/example/template.git",
        "--remote https://github.com/example/template.git --branch develop"
    ],
    options: [ remote, branch ],
    run: async function* ({ remote, branch }) {
        if (!isGitRemote(remote)) {
            throw new GitError("Local template remotes are not supported for initialization", [ remote, branch ], 1)
        }
        const output = await git().ls.remote(remote, branch)
        let [ commit ] = output.split("\t")
        commit = commit?.trim()
        if (!commit) {
            throw new Error(
                `No commit hash found for branch "${branch}" in remote "${remote}".\n` +
                `Check that the branch exists and the remote is accessible.`
            )
        }
        await config.write({ remote, branch, commit })
        console.log(`Initialized template from ${remote} (branch: ${branch})`)
        return 0
    }
})
