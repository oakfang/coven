#!/usr/bin/env node

require('../server')({
  port: 3000,
}, ({ room, type, origin, target}) => {
  console.log(`[${room}::${type}] ${origin} -> ${target || '<BROADCAST>'}`)
});