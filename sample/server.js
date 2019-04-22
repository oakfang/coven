#!/usr/bin/env node

const DEFAULT_PORT = 4000;
const PORT = +(process.env.PORT || DEFAULT_PORT);

require('../server')({
  port: PORT,
  onMessage({ room, type, origin, target }) {
    console.log(`[${room}::${type}] ${origin} -> ${target || '<BROADCAST>'}`);
  },
});
