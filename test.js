const test = require('nefarious');
const EventEmitter = require('events');
const proxyquire = require('proxyquire');

class Emitter extends EventEmitter {
  constructor(options) {
    super();
    this._options = options;
    this._messages = [];
  }

  send(data) {
    this._messages.push(data);
  }
}

const Coven = proxyquire('.', {
  'simple-peer': Emitter,
});

const waitForNextTick = () => new Promise(resolve => setImmediate(resolve));

const getTestTuple = (options = {}) => {
  const events = [];
  const coven = new Coven({ signaling: 'foo', ws: Emitter, ...options });
  coven.emit = (...args) => {
    events.push(args);
    return EventEmitter.prototype.emit.apply(coven, args);
  };
  return [events, coven];
};

test('Base options', t => {
  const a = new Coven({ signaling: 'foo', ws: Emitter });
  t.is(a.room, 'default');
  t.deepEquals(a.spec, { wrtc: undefined });
  const b = new Coven({
    signaling: 'foo',
    ws: Emitter,
    room: 'foo',
    wrtc: 3,
    peerSpec: { x: 2 },
  });
  t.is(b.room, 'foo');
  t.deepEquals(b.spec, { wrtc: 3, x: 2 });
});

test('Base events', async t => {
  let error;
  const [events, coven] = getTestTuple();
  t.is(coven.server._options, 'foo');
  coven.on('error', e => {
    error = e;
  });
  coven.server.emit('error', 0);
  coven.server.emit('open');
  await waitForNextTick();
  t.is(error, 0);
  t.deepEquals(events, [['error', 0], ['open']]);
  t.is(coven.server._messages.length, 1);
  const [raw] = coven.server._messages;
  const msg = JSON.parse(raw);
  t.deepEquals(msg, {
    type: 'UP',
    room: 'default',
    origin: coven.id,
    target: null,
    data: true,
  });
});

test('Simple peer scenario', async t => {
  const [events, coven] = getTestTuple();
  coven.server.emit('open');
  coven.server.emit(
    'message',
    JSON.stringify({
      type: 'UP',
      origin: 1,
      target: null,
      data: true,
    })
  );
  coven.peers.get(1).emit('signal', 33);
  coven.peers.get(1).emit('connect');
  coven.peers.get(1).emit('data', JSON.stringify('meow'));
  coven.peers.get(1).emit('close');
  await waitForNextTick();
  t.is(coven.peers.size, 0);
  t.deepEquals(events, [
    ['open'],
    ['signal', { type: 'UP', origin: 1, target: null, data: true }],
    ['connection', 1],
    ['message', { peerId: 1, message: 'meow' }],
    ['disconnection', 1],
  ]);
});
