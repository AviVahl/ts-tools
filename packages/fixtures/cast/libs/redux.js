import { createStore } from 'redux';
import { Provider } from 'react-redux';

document.body.innerHTML = `typeof createStore === ${typeof createStore}; typeof Provider === ${typeof Provider}`;
