const WebSocket = require('ws');

function getServer(config, onMessage) {
  const wss = new WebSocket.Server(config);
  const peers = new Map();
  const rooms = {};
  const broadcast = data => wss.clients
                               .filter(({ readyState }) =>
                                  readyState === WebSocket.OPEN)
                               .forEach(client => client.send(data));
  wss.on('connection', ws => {
    ws.on('close', () => {
      if (peers.has(ws)) {
        const { room, id } = peers.get(ws);
        rooms[room].delete(ws);
        if (rooms[room].size === 0) {
          delete rooms[room];
        }
      }
    });
    ws.on('message', msg => {
      const { room, origin, target, type, data } = JSON.parse(msg);
      onMessage && onMessage({ room, origin, target, type, data });
      if (!rooms[room]) rooms[room] = new Map();
      const ids = rooms[room];
      if (!ids.has(origin)) {
        ids.set(origin, ws);
        peers.set(ws, { room, id: origin });
      }
      if (!target) return broadcast(msg);
      return ids.get(target).send(msg);
    });
  });
  return wss;
}

module.exports = getServer;