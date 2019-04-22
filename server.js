const WebSocket = require('ws');
const ABNORMAL = 1006;
const KA = 'KA';

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

  getPeerIdBySocket(socket) {
    return this._socks.get(socket);
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

function getServer({ onMessage, ...config } = {}) {
  const wss = new WebSocket.Server(config);

  const roomBySocket = new WeakMap();
  const rooms = {};

  wss.on('connection', ws => {
    const onClose = reason => {
      const roomName = roomBySocket.get(ws);
      if (roomName && rooms[roomName]) {
        const room = rooms[roomName];
        const peerId = room.getPeerIdBySocket(ws);
        room.removePeer(ws);
        if (reason === ABNORMAL) {
          return setTimeout(() => {
            if (!room.hasPeer(peerId)) {
              onClose();
            }
          }, 500);
        }
        if (room.size === 0) {
          delete rooms[roomName];
        } else {
          const message = {
            room: roomName,
            origin: peerId,
            type: 'DOWN',
          };
          room.broadcast(JSON.stringify(message));
          onMessage && onMessage(message);
        }
      }
    };
    ws.on('close', onClose);
    ws.on('error', onClose);
    ws.on('message', msg => {
      const { room: roomName, origin, target, type, data } = JSON.parse(msg);
      onMessage && onMessage({ room: roomName, origin, target, type, data });
      if (!rooms[roomName]) rooms[roomName] = new Room();
      const room = rooms[roomName];
      if (!room.hasPeer(origin)) {
        room.addPeer(ws, origin);
        roomBySocket.set(ws, roomName);
      }
      if (type === KA) return;
      if (!target) return room.broadcast(msg);
      return room.sendTo(target, msg);
    });
  });
  return wss;
}

module.exports = getServer;
