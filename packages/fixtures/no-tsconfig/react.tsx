import React from 'react'
import ReactDOMServer from 'react-dom/server'

export const compString: string = ReactDOMServer.renderToString(<div style={{ width: 10, height: 20 }} />)
