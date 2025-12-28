export interface IgnoreRule {
    pattern: string      // The pattern string (after processing negation, etc.)
    negate: boolean      // true if pattern starts with !
    isDirectory: boolean // true if pattern ends with /
}

/**
 * Parses a .syncrepoignore file (similar to .gitignore format)
 * Supports:
 * - Comments (#)
 * - Negation patterns (!)
 * - Directory patterns (trailing /)
 * - Basic glob patterns (*, **, ?)
 */
export const parseIgnoreFile = (content: string): IgnoreRule[] => {
    const rules: IgnoreRule[] = []
    const lines = content.split(/\r?\n/)

    for (let line of lines) {
        // Remove comments
        const commentIndex = line.indexOf("#")
        if (commentIndex !== -1) {
            line = line.substring(0, commentIndex)
        }

        // Trim whitespace
        line = line.trim()

        // Skip empty lines
        if (!line) {
            continue
        }

        // Check for negation
        const negate = line.startsWith("!")
        if (negate) {
            line = line.substring(1).trim()
        }

        // Check for directory pattern
        const isDirectory = line.endsWith("/")
        if (isDirectory) {
            line = line.slice(0, -1)
        }

        // Skip if empty after processing
        if (!line) {
            continue
        }

        rules.push({
            pattern: line,
            negate,
            isDirectory
        })
    }

    return rules
}

/**
 * Checks if a file path matches a pattern (similar to .gitignore matching)
 */
const matchesPattern = (filepath: string, pattern: string, isDirectory: boolean): boolean => {
    // Normalize pattern
    const normalizedPath = filepath.replace(/\\/g, "/")

    // If pattern starts with /, it's anchored to root
    const anchored = pattern.startsWith("/")
    const patternWithoutAnchor = anchored ? pattern.substring(1) : pattern

    // Convert glob pattern to regex
    let regexPattern = patternWithoutAnchor
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "___DOUBLE_STAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]")
        .replace(/___DOUBLE_STAR___/g, ".*")

    // If directory pattern, ensure it matches directories
    if (isDirectory) {
        regexPattern = `(${regexPattern}/.*|${regexPattern}/?)`
    }

    // Build regex
    const regex = anchored
        ? new RegExp(`^${regexPattern}`)
        : new RegExp(`(^|/)${regexPattern}`)

    return regex.test(normalizedPath)
}

export class IgnoreList {
    private readonly rules: IgnoreRule[]

    private constructor(rules: IgnoreRule[]) {
        this.rules = rules
    }

    static from(content: string): IgnoreList {
        const rules = parseIgnoreFile(content)
        if (!rules || rules.length === 0) {
            return IgnoreList.empty()
        }
        return new IgnoreList(rules)
    }

    static empty(): IgnoreList {
        return new IgnoreList([])
    }

    includes(filepath: string): boolean {
        if (!this.rules || this.rules.length === 0) {
            return false
        }
        const normalizedPath = filepath.replace(/\\/g, "/")
        let ignored = false
        for (const rule of this.rules) {
            const matches = matchesPattern(normalizedPath, rule.pattern, rule.isDirectory)
            if (matches) {
                ignored = !rule.negate
            }
        }
        return ignored
    }
}

