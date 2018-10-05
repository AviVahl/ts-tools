import {platform} from 'os' // verify named imports
import path from 'path' // verify interop without config

console.log(`Current platform is: ${platform()}`)
console.log(`Path separator is: ${path.sep}`)
