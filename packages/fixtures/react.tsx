import React from 'react';
import ReactDOMServer from 'react-dom/server';

console.log(ReactDOMServer.renderToStaticMarkup(<div style={{ width: 10, height: 20 }} />));
