const WebSocket = require("ws");

class Room {
  constructor() {
    this._peers = new Map();
    this._socks = new WeakMap();
  }

  get size() {
    return this._peers.size;
  }

  hasPeer(peerId) {
    return this._peers.has(peerId);
  }

  addPeer(socket, peerId) {
    this._peers.set(peerId, socket);
    this._socks.set(socket, peerId);
  }

  removePeer(socket) {
    this._peers.delete(this._socks.get(socket));
  }

  broadcast(data) {
    for (let socket of this._peers.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }

  sendTo(peerId, data) {
    const socket = this._peers.get(peerId);
    if (socket) {
      socket.send(data);
    }
  }
}

function getServer(config, onMessage) {
  Object.assign(config || {}, {
    clientTracking: true
  });
  const wss = new WebSocket.Server(config);

  const roomBySocket = new WeakMap();
  const rooms = {};

  wss.on("connection", ws => {
    ws.on("close", () => {
      const roomName = roomBySocket.get(ws);
      if (roomName) {
        const room = rooms[roomName];
        room.removePeer(ws);
        if (room.size === 0) {
          delete rooms[roomName];
        }
      }
    });
    ws.on("message", msg => {
      const { room: roomName, origin, target, type, data } = JSON.parse(msg);
      onMessage && onMessage({ room: roomName, origin, target, type, data });
      if (!rooms[roomName]) rooms[roomName] = new Room();
      const room = rooms[roomName];
      if (!room.hasPeer(origin)) {
        room.addPeer(ws, origin);
        roomBySocket.set(ws, roomName);
      }
      if (!target) return room.broadcast(msg);
      return room.sendTo(target, msg);
    });
  });
  return wss;
}

module.exports = getServer;
