import { observe } from 'mobx';
import { observer } from 'mobx-react';

document.body.innerHTML = `typeof observe/observer === ${typeof observe}/${typeof observer}`;
