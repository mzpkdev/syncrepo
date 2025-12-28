import { defineOption } from "cmdore"


export default defineOption({
    name: "remote",
    alias: "r",
    description: "Git repository URL to use as template remote",
    required: true,
    parse: (remote: string) => {
        return remote
    }
})

