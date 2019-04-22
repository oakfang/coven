const wrtc = require('wrtc');
const ws = require('ws');
const Coven = require('..');

const coven = new Coven({ ws, wrtc, signaling: 'ws://localhost:4000' });
coven
  .on('message', ({ peerId, message }) => console.log(`${peerId}: ${message}`))
  .on('connection', pid => {
    console.log(pid, coven.activePeers);
    coven.sendTo(pid, 'Meow');
  })
  .on('error', console.error);
