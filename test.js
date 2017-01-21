const Coven = require('.');
const wrtc = require('wrtc');

const coven = new Coven({
  peerSpec: { wrtc },
});

coven.on('peer', peer => {
  peer.on('data', data => console.log(`${peer.covenId} is saying: "${data}"`));
  coven.broadcast('I am not alone!');
});