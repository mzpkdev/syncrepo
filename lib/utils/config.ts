import * as fs         from "node:fs/promises"
import * as path       from "node:path"
import { isGitRemote } from "./git"


export type Data = {
    remote: string
    branch: string
    commit?: string
    // Optional prefix to sync from a subdirectory of the template repository
    // Useful for monorepo templates where the template is in a subfolder
    // Example: "templates/basic/" to sync only files from that subdirectory
    prefix?: string
}

type ValidateFunction = (data: Record<string, unknown>) => asserts data is Data

export const validate: ValidateFunction = (data) => {
    if (!data.remote || typeof data.remote !== "string") {
        throw new Error(`Invalid config: Missing or invalid 'remote' field. Run 'syncrepo init --source <url>' to initialize.`)
    }
    if (!data.branch || typeof data.branch !== "string") {
        throw new Error(`Invalid config: Missing or invalid 'branch' field. Run 'syncrepo init --source <url>' to initialize.`)
    }
    if (!isGitRemote(data.remote)) {
        throw new Error(`Invalid config: 'remote' field must be a valid git URL (http://, https://, or git@).`)
    }
    if (data.commit !== undefined && typeof data.commit !== "string") {
        throw new Error(`Invalid config: 'commit' field must be a string.`)
    }
    if (data.prefix !== undefined && typeof data.prefix !== "string") {
        throw new Error(`Invalid config: 'prefix' field must be a string.`)
    }
}

export class Config {
    private readonly filepath: string
    private data: Data | null = null

    constructor(filepath = "syncrepo.json") {
        this.filepath = path.join(process.cwd(), filepath)
    }

    async read(): Promise<Data> {
        let content: string = ""
        try {
            content = await fs.readFile(this.filepath, "utf-8")
        } catch (error) {
            if ((error as { code: string }).code === "ENOENT") {
                throw new Error(`Configuration file not found: ${this.filepath}\nPlease run 'syncrepo init --source <repository-url>' to initialize.`)
            }
            throw error
        }
        try {
            this.data = JSON.parse(content) as Data
        } catch (error) {
            throw new Error(`Failed to parse ${this.filepath}: Invalid JSON format. Please check the file for syntax errors.`)
        }
        validate(this.data)
        return this.data

    }

    async write(data: Partial<Data>): Promise<void> {
        data = Object.assign(this.data ?? {}, data)
        await fs.writeFile(this.filepath, JSON.stringify(data, null, 2))
    }
}


export default new Config()


