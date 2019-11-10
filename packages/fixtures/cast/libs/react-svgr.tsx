import React from 'react';
import { render } from 'react-dom';
import Icon from './npm.svg';

const container = document.createElement('div');
document.body.appendChild(container);

render(
    <div>
        Hello React! <Icon />
    </div>,
    container
);
