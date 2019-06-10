import packageJson from '../package.json';
import { name } from '../package.json';

if (typeof packageJson === 'object') {
    document.body.innerHTML = `<div>${name}</div>`;
}
