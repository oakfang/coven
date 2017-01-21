const EventEmitter = require('events');
const Peer = require('simple-peer');
const WebSocket = require('ws');
const uuid = require('uuid');

const getOptions = ({
  peerSpec=null,
  signaling='ws://localhost:3000',
  room='default',
}={}) => ({
  peerSpec,
  signaling,
  room,
});

const getSignalingServer = signaling => {
  if (typeof signaling === 'string') {
    return new WebSocket(signaling);
  }
  return signaling;
};

class Coven extends EventEmitter {
  constructor(options) {
    super();
    this.peers = new Map();
    this.id = uuid();
    const { peerSpec, signaling, room } = getOptions(options);
    this.room = room;
    this.spec = peerSpec;
    this.server = getSignalingServer(signaling);

    this.server.on('open', () => {
      this._signal('UP', this.id, null, true);
      this.emit('connected');
    });

    this.server.on('message', msg => {
      const { type, origin, target, data } = JSON.parse(msg);
      if (origin === this.id) return;
      this.emit('signal', {type, origin, target, data});
      switch (type) {
        case 'UP': {
          if (!this.peers.has(origin)) {
            this.peers.set(origin, this._getPeer(origin, data));
            if (data) {
              this._signal('UP', this.id, origin, false);
            }
          }
          return;
        }
        case 'SIGNAL': {
          if (target !== this.id) return;
          if (!this.peers.has(origin)) {
            this.peers.set(origin, this._getPeer(origin));
          }
          this.peers.get(origin).signal(data);
          return;
        }
      }
    });
  }

  _signal(type, origin, target, data) {
    const room = this.room;
    this.server.send(JSON.stringify({
      type,
      room,
      origin,
      target,
      data,
    }));
  }

  _getPeer(id, initiator) {
    const peer = new Peer(Object.assign({
      initiator,
    }, this.spec || {}));
    peer.covenId = id;
    peer.on('signal', data => this._signal('SIGNAL', this.id, id, data));
    peer.once('close', () => this.peers.delete(id));
    peer.once('connect', () => this.emit('peer', peer));
    return peer;
  }

  broadcast(data) {
    for (const peer of this.peers.values()) {
      peer.send(data);
    }
  }
}

module.exports = Coven;