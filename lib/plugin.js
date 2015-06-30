/**
 *  ______   __   __   ______  __   ______  __  __
 * /\  ___\ /\ "-.\ \ /\__  _\/\ \ /\__  _\/\ \_\ \
 * \ \  __\ \ \ \-.  \\/_/\ \/\ \ \\/_/\ \/\ \____ \
 *  \ \_____\\ \_\\"\_\  \ \_\ \ \_\  \ \_\ \/\_____\
 *   \/_____/ \/_/ \/_/   \/_/  \/_/   \/_/  \/_____/
 *                                         __   ______
 *                                        /\ \ /\  ___\
 *                                       _\_\ \\ \___  \
 *                                      /\_____\\/\_____\
 *                                      \/_____/ \/_____/
 */

/**
 * Provides the plugin class.
 *
 * @author Orgun109uk <orgun109uk@gmail.com>
 *
 * @module ejs
 */

var util = require('util'),
    events = require('events');

/**
 * The plugin class.
 *
 * @class Plugin
 * @construct
 * @param {String} plugin The name of the plugin.
 * @param {Object} info The info object, normally provided by the overridden
 *   object constructor.
 */
function Plugin(plugin, info) {
  'use strict';

  Plugin.super_.call(this);

  Object.defineProperty(this, 'plugin', {value: plugin});
  Object.defineProperty(this, 'title', {value: info.title || ''});
  Object.defineProperty(this, 'description', {value: info.description || ''});
  Object.defineProperty(this, 'weight', {value: info.weight || 0});
  Object.defineProperty(this, 'version', {value: info.version || ''});

  var me = this,
      overrides = ['initialize', 'message'];

  function doOverride(name) {
    return function () {
      var args = Array.prototype.slice.call(arguments),
          next = args.shift(),
          pargs = args.slice();

      pargs.unshift(name, plugin);
      args.unshift(function (err) {
        if (err) {
          return next(err);
        }

        me.emit.apply(me, pargs);
        next(null);
      });

      me['_' + name].apply(me, args);
    };
  }

  overrides.forEach(function (override) {
    me['_' + override] = me[override];
    me[override] = doOverride(override);
  });
}

util.inherits(Plugin, events.EventEmitter);

/**
 * Inititalizes the plugin.
 *
 * @method initialize
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @async
 */
Plugin.prototype.initialize = function (done) {
  'use strict';

  // Does nothing.

  done(null);
};

/**
 * Sends a message to the plugin.
 *
 * @method message
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @param {String} msg The message to process.
 * @param {Mixed] [...] Any params supplied with the message.
 * @async
 */
Plugin.prototype.message = function (done, msg) {
  'use strict';

  // Does nothing.

  done(null);
};

/**
 * Exports the Plugin constructor.
 */
module.exports = Plugin;
