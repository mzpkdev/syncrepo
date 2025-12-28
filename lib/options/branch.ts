import { defineOption } from "cmdore"


export default defineOption({
    name: "branch",
    alias: "b",
    description: "Branch to use from the template repository",
    required: false,
    defaultValue: () => "main",
    parse: (branch: string) => {
        return branch
    }
})

