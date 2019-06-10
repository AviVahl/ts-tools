import React from 'react';
import {render} from 'react-dom';

const container = document.createElement('div');
document.body.appendChild(container)

render(<div>Hello React!</div>, container);
