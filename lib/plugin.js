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
 * @submodule Plugins
 * @class Plugin
 */

var listener = require('ejs-listener');

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

  Object.defineProperty(this, 'plugin', {value: plugin});
  Object.defineProperty(this, 'title', {value: info.title || ''});
  Object.defineProperty(this, 'description', {value: info.description || ''});
  Object.defineProperty(this, 'weight', {value: info.weight || 0});
  Object.defineProperty(this, 'version', {value: info.version || ''});

  var me = this,
      overrides = ['message', 'enable', 'disable', 'update'];

  function doOverride(name) {
    return function () {
      var args = Array.prototype.slice.call(arguments),
          done = args.shift(),
          pargs = args.slice();

      args.unshift(function (err) {
        if (err) {
          return done(err);
        }

        listener.invoke(done, 'plugin.' + name, me, pargs);
        //done(null);
      });

      me['_' + name].apply(me, args);
    };
  }

  overrides.forEach(function (override) {
    me['_' + override] = me[override];
    me[override] = doOverride(override);
  });
}

/**
 * Enable this plugin.
 *
 * @method enable
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @async
 */
Plugin.prototype.enable = function (done) {
  'use strict';

  // Does nothing.

  done(null);
};

/**
 * Disable this plugin.
 *
 * @method disable
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @async
 */
Plugin.prototype.disable = function (done) {
  'use strict';

  // Does nothing.

  done(null);
};

/**
 * Updates this plugin.
 *
 * @method update
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @param {String} from The version currently set.
 * @param {String} to The target version updating to.
 * @async
 */
Plugin.prototype.update = function (done, from, to) {
  'use strict';

  // Do nothing.

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
