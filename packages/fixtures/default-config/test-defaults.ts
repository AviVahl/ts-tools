// verify implicit configuration still occurs

// "module": "commonjs" -> "moduleResolution": "node"
import {someValue} from './some-folder';

// "esModuleInterop": true -> "allowSyntheticDefaultImports": true
import React from 'react';

console.log(React, someValue);
