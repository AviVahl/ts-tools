// tests source-maps locations

interface ITest {
    name: string
    age: number
    run(): void
}

function runMe() {
    if (true) {
        throw new Error(`this should be line 11, col 15`)
    }
}

runMe()
