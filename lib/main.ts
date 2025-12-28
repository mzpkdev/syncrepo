import { Program, terminal } from "cmdore"
import initCommand           from "./commands/init"
import syncCommand           from "./commands/sync"


export const main = async (...varargs: string[]): Promise<number> => {
    const program = new Program()
    program
        .register(initCommand as any)
        .register(syncCommand as any)
    await program
        .execute(varargs)
    return 0
}


main(...process.argv.slice(2))
    .catch(error => terminal.error(error))
