const EventEmitter = require('events');
const Peer = require('simple-peer');
const uuid = require('uuid');

const ABNORMAL = 1006;

const getOptions = ({
  peerSpec = null,
  signaling = 'ws://localhost:3000',
  room = 'default',
  maxPeers = Infinity,
  ws,
  wrtc,
} = {}) => ({
  peerSpec: Object.assign({ wrtc }, peerSpec || {}),
  signaling,
  room,
  maxPeers,
  ws,
});

const getSignalingServer = (signaling, wsContructor) => {
  if (typeof signaling === 'string') {
    return new wsContructor(signaling);
  }
  return signaling;
};

class Coven extends EventEmitter {
  constructor(options) {
    super();
    this.peers = new Map();
    this.id = uuid();
    const { peerSpec, signaling, room, maxPeers, ws } = getOptions(options);
    this.room = room;
    this.spec = peerSpec;
    this._setupServer(signaling, ws || global.WebSocket, maxPeers);
  }

  close() {
    this.server.close(1001);
    this.peers.clear();
  }

  _setupServer(signaling, wsContructor, maxPeers, reconnect = false) {
    this.server = getSignalingServer(signaling, wsContructor);
    if (!this.server.on) {
      this.server.on = (etype, cb) => {
        this.server.addEventListener(etype, e => cb(e.data));
        return this.server;
      };
    }

    this.server
      .on('close', code => {
        if (code === ABNORMAL) {
          this._setupServer(signaling, wsContructor, maxPeers, true);
        }
      })
      .on('error', e => this.emit('error', e))
      .on('open', () => {
        if (reconnect) {
          this._signal('KA', this.id);
          this.emit('reconnect');
        } else {
          this._signal('UP', this.id, null, true);
          this.emit('open');
        }
      })
      .on('message', msg => {
        const { type, origin, target, data } = JSON.parse(msg);
        if (origin === this.id) return;
        this.emit('signal', { type, origin, target, data });
        switch (type) {
          case 'UP': {
            if (!this.peers.has(origin) && this.peers.size < maxPeers) {
              this.peers.set(origin, this._getPeer(origin, data));
              if (data) {
                this._signal('UP', this.id, origin, false);
              }
            }
            return;
          }
          case 'DOWN': {
            if (this.peers.has(origin)) {
              this.peers.get(origin).emit('close');
            }
          }
          case 'SIGNAL': {
            if (target !== this.id) return;
            this.peers.get(origin).signal(data);
            return;
          }
        }
      });
  }

  _signal(type, origin, target, data) {
    const room = this.room;
    this.server.send(
      JSON.stringify({
        type,
        room,
        origin,
        target,
        data,
      })
    );
  }

  _getPeer(id, initiator) {
    const peer = new Peer(
      Object.assign(
        {
          initiator,
        },
        this.spec
      )
    );
    peer.covenId = id;
    peer.on('signal', data => this._signal('SIGNAL', this.id, id, data));
    peer.once('close', () => {
      this.peers.delete(id);
      this.emit('disconnection', id);
    });
    peer.once('connect', () => this.emit('connection', id));
    peer.on('data', data =>
      this.emit('message', { peerId: id, message: JSON.parse(data) })
    );
    peer.on('stream', stream => this.emit('stream', { peerId: id, stream }));
    return peer;
  }



  get activePeers() {
    return Array.from(this.peers.entries())
      .filter(([, { connected }]) => connected)
      .map(([peerId]) => peerId);
  }

  get size() {
    return this.activePeers.length;
  }

  sendTo(peerId, data) {
    const peer = this.peers.get(peerId);
    peer && peer.send(JSON.stringify(data));
  }

  streamTo(peerId, stream) {
    const peer = this.peers.get(peerId);
    peer && peer.addStream(stream);
  }

  broadcast(data) {
    this.activePeers.forEach(peerId => this.sendTo(peerId, data));
  }

  broadcastStream(stream) {
    this.activePeers.forEach(peerId => this.streamTo(peerId, stream));
  }
}

module.exports = Coven;
