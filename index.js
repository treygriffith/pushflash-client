/**
 * Module dependencies
 */
require('es5-shim');
var Emitter = require('events').EventEmitter;
var util = require('util');
var debug = require('debug')('pubsub');
var humane = require('humane-js');
var io = require('socket.io-client');

/**
 * Export constructor
 */
module.exports = Subscriber;

/**
 * Create a new Subscriber instance
 * @param {String} channel   Channel id to subscribe to
 * @param {Object} opts      Options for Subscriber instance
 *   @property {String} baseClass humane.js `baseCls`
 *   @proptery {String} namespace Path to listen for notifications on. Defaults to `notifications`.
 */
function Subscriber(channel, opts) {
  if(!(this instanceof Subscriber)) {
    return new Subscriber(channel, opts);
  }

  opts = opts || {};

  this.channel = channel;
  this.namespace = opts.namespace || 'notifications';

  this.io = io.connect('/' + this.namespace);

  // socket.io listeners
  this.io.on('connect', this._onConnect.bind(this));
  this.io.on('disconnect', this._onDisconnect.bind(this));
  this.io.on('message', this._onMessage.bind(this));
  this.io.on('connect_failed', this._onConnectFailed.bind(this));
  this.io.on('unauthorized channel', this._onUnauthorizedChannel.bind(this));
  this.io.on('error', this._onError.bind(this));
  this.io.on('channel set', this._onChannelSet.bind(this));

  // humane message instantiation
  this.baseClass = opts.baseClass || 'humane-jackedup';

  this.addMessageType('error');
  this.addMessageType('unauthorized', 'error');
  this.addMessageType('info');
  this.addMessageType('success');
}

util.inherits(Subscriber, Emitter);

/**
 * Add a new message type for humane.js to display
 * @param {String} type            Message type to listen for
 * @param {String} additionalClass Tacked onto the end of baseClass to get default styles like `-success` and `-error`
 */
Subscriber.prototype.addMessageType = function (type, additionalClass) {
  if(!additionalClass) {
    additionalClass = type;
  }

  this[type] = humane.spawn({
    baseCls: this.baseClass,
    addnCls: this.baseClass + '-' + additionalClass
  });

  this.on(type, this[type]);

  return this;
};

/**
 * Subscribe to a channel. This is primarily used internally.
 * @param {String} id Channel id
 */
Subscriber.prototype.setChannel = function (id) {
  debug('setting channel to '+id);
  this.channel = id;
  this.io.emit('set channel', id);
};

/**
 * Listen for `connect`
 */
Subscriber.prototype._onConnect = function () {
  debug('connected to namespace '+this.namespace);
  this.setChannel(this.channel);
};

/**
 * Listen for `disconnect`
 */
Subscriber.prototype._onDisconnect = function () {
  this.emit('error', 'Disconnected from host');
};

/**
 * Listen for `message` and emit the proper event
 * @param {Object} msg Message received
 */
Subscriber.prototype._onMessage = function (msg) {
  debug('message received on channel '+this.channel);

  if(typeof msg === 'string') {
    msg = {
      type: null,
      body: msg
    };
  }

  msg.type = msg.type || 'info';

  debug('message is of type `'+msg.type+'` which is ' + ((typeof this[msg.type] === 'function') ? '' : 'not ') + 'registered.');
  this.emit(msg.type, msg.body);
};

/**
 * Listen for `connect_failed` events from socket.io
 * @param  {[type]} reason [description]
 * @return {[type]}        [description]
 */
Subscriber.prototype._onConnectFailed = function (reason) {
  debug('Unable to connect to namespace `'+this.namespace+'`: '+reason);
  this.emit('unauthorized', 'Unauthorized');
};

/**
 * Listen for `unauthorized channel` events from Pushflash
 * @param  {String} channel Channel id that failed authorization
 */
Subscriber.prototype._onUnauthorizedChannel = function (channel) {
  debug('unauthorized for channel '+channel);
  this.emit('unauthorized', 'Unauthorized');
};

/**
 * Listen for `error` events
 * @param  {Error} err error emitted
 */
Subscriber.prototype._onError = function (err) {
  this.emit('error', err);
};

/**
 * Listen for `channel set` events from Pushflash.
 * This is basically an ACK
 * @param  {String} channel Channel id
 */
Subscriber.prototype._onChannelSet = function (channel) {
  debug('subscribed to channel '+channel);
};
