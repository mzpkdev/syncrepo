import { defineOption } from "cmdore"


export default defineOption({
    name: "force",
    alias: "f",
    description: "Force sync even if there are uncommitted changes",
    required: false,
    defaultValue: () => false,
    parse: () => {
        return true
    }
})
