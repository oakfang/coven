'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
var Peer = require('simple-peer');
var WebSocket = require('ws');
var uuid = require('uuid');

var getOptions = function getOptions() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$peerSpec = _ref.peerSpec,
      peerSpec = _ref$peerSpec === undefined ? null : _ref$peerSpec,
      _ref$signaling = _ref.signaling,
      signaling = _ref$signaling === undefined ? 'ws://localhost:3000' : _ref$signaling,
      _ref$room = _ref.room,
      room = _ref$room === undefined ? 'default' : _ref$room;

  return {
    peerSpec: peerSpec,
    signaling: signaling,
    room: room
  };
};

var getSignalingServer = function getSignalingServer(signaling) {
  if (typeof signaling === 'string') {
    return new WebSocket(signaling);
  }
  return signaling;
};

var Coven = function (_EventEmitter) {
  _inherits(Coven, _EventEmitter);

  function Coven(options) {
    _classCallCheck(this, Coven);

    var _this = _possibleConstructorReturn(this, (Coven.__proto__ || Object.getPrototypeOf(Coven)).call(this));

    _this.peers = new Map();
    _this.id = uuid();

    var _getOptions = getOptions(options),
        peerSpec = _getOptions.peerSpec,
        signaling = _getOptions.signaling,
        room = _getOptions.room;

    _this.room = room;
    _this.spec = peerSpec;
    _this.server = getSignalingServer(signaling);

    _this.server.on('open', function () {
      _this._signal('UP', _this.id, null, true);
      _this.emit('connected');
    });

    _this.server.on('message', function (msg) {
      var _JSON$parse = JSON.parse(msg),
          type = _JSON$parse.type,
          origin = _JSON$parse.origin,
          target = _JSON$parse.target,
          data = _JSON$parse.data;

      if (origin === _this.id) return;
      _this.emit('signal', { type: type, origin: origin, target: target, data: data });
      switch (type) {
        case 'UP':
          {
            if (!_this.peers.has(origin)) {
              _this.peers.set(origin, _this._getPeer(origin, data));
              if (data) {
                _this._signal('UP', _this.id, origin, false);
              }
            }
            return;
          }
        case 'SIGNAL':
          {
            if (target !== _this.id) return;
            if (!_this.peers.has(origin)) {
              _this.peers.set(origin, _this._getPeer(origin));
            }
            _this.peers.get(origin).signal(data);
            return;
          }
      }
    });
    return _this;
  }

  _createClass(Coven, [{
    key: '_signal',
    value: function _signal(type, origin, target, data) {
      var room = this.room;
      this.server.send(JSON.stringify({
        type: type,
        room: room,
        origin: origin,
        target: target,
        data: data
      }));
    }
  }, {
    key: '_getPeer',
    value: function _getPeer(id, initiator) {
      var _this2 = this;

      var peer = new Peer(Object.assign({
        initiator: initiator
      }, this.spec || {}));
      peer.covenId = id;
      peer.on('signal', function (data) {
        return _this2._signal('SIGNAL', _this2.id, id, data);
      });
      peer.once('close', function () {
        return _this2.peers.delete(id);
      });
      peer.once('connect', function () {
        return _this2.emit('peer', peer);
      });
      return peer;
    }
  }, {
    key: 'broadcast',
    value: function broadcast(data) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.peers.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var peer = _step.value;

          peer.send(data);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }]);

  return Coven;
}(EventEmitter);

module.exports = Coven;
