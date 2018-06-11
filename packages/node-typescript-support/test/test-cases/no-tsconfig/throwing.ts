// tests source-maps locations

interface ITest {
    name: string
    age: number
}

function runMe() {
    throw new Error(`this should be line 9, col 11`)
}

runMe()
