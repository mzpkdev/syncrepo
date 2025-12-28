import * as child from "child_process"


export const isGitRemote = (remote: string): boolean => {
    return remote.startsWith("http://") || remote.startsWith("https://") || remote.startsWith("git@")
}

export const isGitRepository = async (cwd?: string): Promise<boolean> => {
    try {
        await git(cwd).exec("rev-parse", "--git-dir")
        return true
    } catch {
        return false
    }
}

export const isDirtyRepository = async (cwd?: string): Promise<boolean> => {
    try {
        const output = await git(cwd).exec("status", "--porcelain")
        const status = output.toString().trim()
        return status.length > 0
    } catch {
        return true
    }
}

export class GitError extends Error {
    constructor(
        message: string,
        public readonly args: string[],
        public readonly exitCode: number
    ) {
        super(message)
        this.name = "GitError"
    }

    toString(): string {
        return `GitError: ${this.message}\nCommand: git ${this.args.join(" ")}\nExit code: ${this.exitCode}`
    }
}

export class Git {
    private readonly cwd?: string

    constructor(cwd?: string) {
        this.cwd = cwd
    }

    async exec(...varargs: string[]): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const process = child.spawn("git", varargs, this.cwd ? { cwd: this.cwd } : {})
            const chunks: Buffer[] = []
            let stderr = ""
            process.stdout?.on("data", (data: Buffer) => {
                chunks.push(data)
            })
            process.stderr?.on("data", (data: Buffer) => {
                stderr += data.toString()
            })
            process.on("close", (code) => {
                if (code === 0) {
                    resolve(Buffer.concat(chunks))
                } else {
                    reject(new GitError(stderr || `Git command failed with code ${code}`, varargs, code ?? 1))
                }
            })
        })
    }

    async fetch(source: string, refspec?: string): Promise<void> {
        const args = []
        if (refspec) {
            args.push(refspec)
        }
        await this.exec("fetch", source, ...args)
    }

    get ls() {
        const remote = async (source: string, ref?: string) => {
            const args = []
            if (ref) {
                args.push(ref)
            }
            const output = await this.exec("ls-remote", source, ...args)
            return output.toString().trim()
        }

        const tree = async (ref: string, path?: string) => {
            const args = []
            if (path) {
                args.push(path)
            }
            const output = await this.exec("ls-tree", "-r", "--name-only", ref, ...args)
            return output.toString().trim()
                .split("\n")
                .filter(f => f.length > 0)
        }

        return {
            remote,
            tree
        }
    }

    async show(ref: string): Promise<Buffer | null> {
        try {
            return await this.exec("show", ref)
        } catch (error) {
            if (error instanceof GitError) {
                // Check if it's a file-not-found error (exit code 128 or error message containing "fatal")
                if (error.exitCode === 128 || error.message.toLowerCase().includes("fatal")) {
                    return null
                }
                // Re-throw other GitError exceptions (unexpected errors)
                throw error
            }
            // Re-throw non-GitError exceptions
            throw error
        }
    }
}

const git = (cwd?: string) => {
    return new Git(cwd)
}


export default git
