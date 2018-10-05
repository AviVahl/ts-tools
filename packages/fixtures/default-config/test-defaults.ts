// verify implicit configuration still occurs

// "module": "commonjs" -> "moduleResolution": "node"
import {someValue} from './some-folder'

// "esModuleInterop": true -> "allowSyntheticDefaultImports": true
import React from 'react'

// tslint:disable-next-line:no-console
console.log(React, someValue)
