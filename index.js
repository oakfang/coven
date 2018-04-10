const EventEmitter = require("events");
const Peer = require("simple-peer");
const uuid = require("uuid");

const getOptions = ({
  peerSpec = null,
  signaling = "ws://localhost:3000",
  room = "default",
  maxPeers = Infinity,
  ws,
  wrtc
} = {}) => ({
  peerSpec: Object.assign({ wrtc }, peerSpec || {}),
  signaling,
  room,
  maxPeers,
  ws
});

const getSignalingServer = (signaling, wsContructor) => {
  if (typeof signaling === "string") {
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
    this.server = getSignalingServer(signaling, ws || global.WebSocket);
    if (!this.server.on) {
      this.server.on = (etype, cb) =>
        this.server.addEventListener(etype, e => cb(e.data));
    }

    this.server.on("error", e => this.emit("error", e));

    this.server.on("open", () => {
      this._signal("UP", this.id, null, true);
      this.emit("connected");
    });

    this.server.on("message", msg => {
      const { type, origin, target, data } = JSON.parse(msg);
      if (origin === this.id) return;
      this.emit("signal", { type, origin, target, data });
      switch (type) {
        case "UP": {
          if (!this.peers.has(origin) && this.peers.size < maxPeers) {
            this.peers.set(origin, this._getPeer(origin, data));
            if (data) {
              this._signal("UP", this.id, origin, false);
            }
          }
          return;
        }
        case "SIGNAL": {
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
        data
      })
    );
  }

  _getPeer(id, initiator) {
    const peer = new Peer(
      Object.assign(
        {
          initiator
        },
        this.spec
      )
    );
    peer.covenId = id;
    peer.on("signal", data => this._signal("SIGNAL", this.id, id, data));
    peer.once("close", () => this.peers.delete(id));
    peer.once("connect", () => this.emit("peer", peer));
    return peer;
  }

  get size() {
    return this._getConnectedPeers().length;
  }

  _getConnectedPeers() {
    return Array.from(this.peers.values()).filter(({ connected }) => connected);
  }

  broadcast(data) {
    this._getConnectedPeers().forEach(peer => peer.send(data));
  }
}

module.exports = Coven;
