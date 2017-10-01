#!/usr/bin/env node

const DEFAULT_PORT = 3000;
const PORT = +(process.env.PORT || DEFAULT_PORT);

require('../server')({
  port: PORT,
}, ({ room, type, origin, target}) => {
  console.log(`[${room}::${type}] ${origin} -> ${target || '<BROADCAST>'}`)
});