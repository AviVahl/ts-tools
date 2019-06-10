import React from 'react';
import { render } from 'react-dom';
import { MdCast } from 'react-icons/md';

const container = document.createElement('div');
document.body.appendChild(container);

render(
    <div>
        react-icons works <MdCast />
    </div>,
    container
);
