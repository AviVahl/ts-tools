// tests source-maps locations

interface ITest {
  name: string;
  age: number;
}

function runMe() {
  if (true) {
    throw new Error(`this should be line 10, col 11`);
  }
}

runMe();
