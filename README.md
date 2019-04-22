# coven

A pain-free way to handle a mesh of peers via WebRTC

## Usage (node client)

```js
const wrtc = require('wrtc');
const ws = require('ws');
const Coven = require('coven');

const coven = new Coven({ ws, wrtc, signaling: 'wss://coven-broker.now.sh' });

coven.once('open', () => console.log('Connected to signaling server'));
coven.on('connection', peerId => console.log(`Connected to peer ${peerId}`));
coven.on('disconnection', peerId =>
  console.log(`Disconnected from peer ${peerId}`)
);
coven.on('message', ({ peerId, message }) => {
  coven.sendTo(peerId, message);
});
//...
const [peerId] = coven.activePeers;
coven.sendTo(peerId, 'fsdfsd');
```

## Usage (browser client)

```js
import Coven from 'coven';

const coven = new Coven({ signaling: 'wss://coven-broker.now.sh' });

coven.once('open', () => console.log('Connected to signaling server'));
coven.on('connection', peerId => console.log(`Connected to peer ${peerId}`));
coven.on('disconnection', peerId =>
  console.log(`Disconnected from peer ${peerId}`)
);
coven.on('message', ({ peerId, message }) => {
  coven.sendTo(peerId, message);
});
//...
const [peerId] = coven.activePeers;
coven.sendTo(peerId, 'fsdfsd');
```

## Usage (server)

```js
const createSignalingBroker = require('coven/server');
const DEFAULT_PORT = 4000;
const PORT = +(process.env.PORT || DEFAULT_PORT);

createSignalingBroker({
  port: PORT,
  onMessage({ room, type, origin, target }) {
    console.log(`[${room}::${type}] ${origin} -> ${target || '<BROADCAST>'}`);
  },
});
```
