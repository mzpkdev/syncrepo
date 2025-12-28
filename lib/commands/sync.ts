import { defineCommand, effect, terminal } from "cmdore"
import * as fs                             from "node:fs/promises"
import * as path                           from "node:path"
import git, { isGitRepository, isDirtyRepository } from "../utils/git"
import { IgnoreList }                      from "../utils/ignore"
import config                              from "../utils/config"
import force                               from "../options/force"


const TEMPLATE_REF = "refs/syncrepo/fetch/template"


export default defineCommand({
    name: "sync",
    description: "Synchronize the current project with its template repository",
    examples: [],
    options: [ force ],
    run: async function* ({ force }) {
        if (!(await isGitRepository())) {
            throw new Error(
                "Not a git repository. The sync command must be run from within a git repository.\nRun 'git init' to initialize a git repository first.")
        }
        if (!force && await isDirtyRepository()) {
            throw new Error(
                "Repository has uncommitted changes. Commit or stash your changes before syncing.\n" +
                "Use --force or -f to override this check and proceed anyway."
            )
        }

        const { remote, branch, prefix = "" } = await config.read()
        await git().fetch(remote, `${branch}:${TEMPLATE_REF}`)

        const content = await git().show(`${TEMPLATE_REF}:.syncrepoignore`)
        const ignored = content !== null
            ? IgnoreList.from(content.toString("utf-8"))
            : IgnoreList.empty()

        let filesCreated = 0
        let filesUpdated = 0
        let filesOverwritten = 0
        let filesRemoved = 0

        for (const file of await git().ls.tree(`${TEMPLATE_REF}:${prefix}`)) {
            if (file === ".syncrepoignore") {
                continue
            }
            if (ignored.includes(file)) {
                terminal.print(`Ignoring: ${file}`)
                continue
            }

            // Fetch content first
            const fileContent = await git().show(`${TEMPLATE_REF}:${prefix}${file}`)
            if (fileContent === null) {
                // File listed in tree but cannot be fetched - remove if exists locally
                const pathname = path.join(process.cwd(), file)
                let fileExists = false
                try {
                    await fs.access(pathname)
                    fileExists = true
                } catch {
                    fileExists = false
                }

                if (fileExists) {
                    // Apply security path validation
                    const resolvedPath = path.resolve(pathname)
                    const projectRoot = path.resolve(process.cwd())
                    if (!resolvedPath.startsWith(projectRoot + path.sep)) {
                        throw new Error(
                            `Security error: The template tried to remove a file outside your project directory.\n` +
                            `File path: "${file}"\n` +
                            `Resolved path: "${resolvedPath}"\n` +
                            `Project root: "${projectRoot}"\n\n` +
                            `This is blocked to prevent malicious templates from removing files outside your project.`
                        )
                    }

                    terminal.print(`Removing: ${file}`)
                    filesRemoved++
                    await effect(async () => {
                        await fs.unlink(pathname)
                    })
                }
                continue
            }

            // Check file existence and detect conflicts
            const pathname = path.join(process.cwd(), file)
            let fileExists = false
            let willOverwrite = false

            try {
                await fs.access(pathname)
                fileExists = true
                const existingContent = await fs.readFile(pathname)
                if (!existingContent.equals(fileContent)) {
                    willOverwrite = true
                    filesOverwritten++
                    terminal.print(`⚠️  Warning: ${file} will be overwritten (local changes will be lost)`)
                }
            } catch {
                fileExists = false
            }

            // Print specific action
            if (!willOverwrite) {
                if (fileExists) {
                    terminal.print(`Updating: ${file}`)
                    filesUpdated++
                } else {
                    terminal.print(`Creating: ${file}`)
                    filesCreated++
                }
            }

            const resolvedPath = path.resolve(pathname)
            const projectRoot = path.resolve(process.cwd())
            if (!resolvedPath.startsWith(projectRoot + path.sep)) {
                throw new Error(
                    `Security error: The template tried to write a file outside your project directory.\n` +
                    `File path: "${file}"\n` +
                    `Resolved path: "${resolvedPath}"\n` +
                    `Project root: "${projectRoot}"\n\n` +
                    `This is blocked to prevent malicious templates from writing files outside your project.\n` +
                    `If you trust this template, check the template repository for files with paths containing "../" or absolute paths.`
                )
            }
            await effect(async () => {
                await fs.mkdir(path.dirname(pathname), { recursive: true })
                await fs.writeFile(pathname, fileContent)
            })
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

        terminal.verbose(`Updating config with commit: ${commit}`)
        await effect(async () => {
            await config.write({ commit })
        })

        terminal.verbose(`Summary: ${filesCreated} created, ${filesUpdated} updated, ${filesOverwritten} overwritten, ${filesRemoved} removed`)
        if (filesOverwritten > 0) {
            terminal.print(`⚠️  ${filesOverwritten} file(s) had local changes that were overwritten`)
        }
        if (filesRemoved > 0) {
            terminal.print(`⚠️  ${filesRemoved} file(s) were removed (not found in template repository)`)
        }
        terminal.verbose("All write operations completed (or skipped in dry-run mode)")
        terminal.print("Sync completed successfully")
        return 0
    }
})
