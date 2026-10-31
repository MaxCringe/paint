import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Scarf HUD shows the embroidered shawl silhouette in both inventory states',()=>{
 const html=read('index.html'),icon=read('public/icons/misty-scarf.svg'),css=read('src/styles/hud.css');
 assert.match(html,/<img class="scarf-symbol" src="\/icons\/misty-scarf\.svg"/);
 assert.match(html,/id="scarf-count"/);
 assert.match(icon,/id="flower"/);
 assert.match(icon,/id="leaf"/);
 assert.match(icon,/Loose woven fringes/);
 assert.match(icon,/#df3974/);
 assert.match(css,/#scarf-indicator\.is-ready \.scarf-symbol/);
 assert.match(css,/grayscale\(1\)/);
});
