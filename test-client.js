const wrtc = require('wrtc');
const ws = require('ws');
const Coven = require('.');

const coven = new Coven ({ ws, wrtc, signaling: 'ws://localhost:4000' });
coven.on('peer', p => {
    console.log(p.covenId);
    p.on('data', console.log);
    p.send('Meow');
}).on('error', console.error);