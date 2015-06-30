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
 * Provides the plugins component.
 *
 * @author Orgun109uk <orgun109uk@gmail.com>
 *
 * @module ejs
 * @class Plugins
 */

var path = require('path'),
    util = require('util'),
    glob = require('glob'),
    events = require('events'),
    async = require('async'),
    sortBy = require('ejs-sortby'),
    EUndefinedPlugin = require('./errors/EUndefinedPlugin');

/**
 * Process an individual file into an index item.
 *
 * @param {Array} paths An array of paths used.
 * @param {String} file The filename to process and load.
 * @return {Object} The processed file item.
 */
function processItem(paths, file) {
  'use strict';

  for (var i = 0, len = paths.length; i < len; i++) {
    if (file.indexOf(paths[i]) === -1) {
      continue;
    }

    return {
      name: path.dirname(file.substr(paths[i].length + 1)),
      Constructor: require(file)
    };
  }

  return false;
}

/**
 * The plugins component class.
 *
 * @class Plugins
 * @construct
 * @param {String|Array} paths The path or paths to search for plugin index
 *   files.
 */
function Plugins(paths) {
  'use strict';

  Plugins.super_.call(this);
  this._paths = typeof paths === 'string' ? [paths] : paths;
  this._pattern = 'index.js';
  this._index = {};
}

util.inherits(Plugins, events.EventEmitter);

/**
 * Index plugin files in the defined paths.
 *
 * @method index
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @async
 */
Plugins.prototype.index = function (done) {
  'use strict';

  var me = this,
      patterns = [];

  this._paths.forEach(function (item) {
    patterns.push(
      path.join(path.normalize(item), '**', me._pattern)
    );
  });

  this._index = {};
  glob(patterns.join(','), function (err, files) {
    if (err) {
      return done(err);
    }

    files.forEach(function (file) {
      var processedItem = processItem(me._paths, file);
      me._index[processedItem.name] = new processedItem.Constructor(
        processedItem.name
      );

      Object.defineProperty(me._index[processedItem.name], 'path', {
        value: path.dirname(file)
      });

      me._index[processedItem.name]
        .on('initialize', function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift('initialize');
          me.emit.apply(me, args);
        })
        .on('message', function () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift('message');
          me.emit.apply(me, args);
        });
    });

    sortBy(me._index, 'weight');
    done(null);
  });
};

/**
 * Get the names of all the indexed plugins.
 *
 * @method plugins
 * @returns {Array} An array of the indexed plugin names.
 */
Plugins.prototype.plugins = function () {
  'use strict';

  var names = [];
  for (var plugin in this._index) {
    names.push(plugin);
  }

  return names;
};

/**
 * Initializes all the plugins.
 *
 * @method done
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @async
 */
Plugins.prototype.initialize = function (done) {
  'use strict';

  var me = this,
      queue = [];

  function init(plugin) {
    return function (next) {
      me._index[plugin].initialize(function (err) {
        if (err) {
          return next(err);
        }

        me._index[plugin]._initialized = true;
        me.emit('initialize', plugin);
        next();
      });
    };
  }

  for (var plg in this._index) {
    queue.push(init(plg));
  }

  async.series(queue, function (err) {
    me.emit('initialized');
    done(err ? err : null);
  });
};

/**
 * Determines if a plugin has been initialized or not.
 *
 * @method initialized
 * @param {String} plugin The name of the plugin to check.
 * @returns {Boolean} Returns true if the plugin has been initialized,
 *   otherwise false.
 */
Plugins.prototype.initialized = function (plugin) {
  'use strict';

  return this._index[plugin] && this._index[plugin]._initialized === true;
};

/**
 * Send a message to the defined plugin(s).
 *
 * @method message
 * @param {Function} done The done callback.
 *   @param {Error} done.err Any raised errors.
 * @param {String|Array} plugins A plugin name, array of plugin names or null
 *   for all plugins.
 * @param {String} msg The message to send to the plugin(s).
 * @param {Mixed} [...] Any other sent arguments will be sent to the plugin(s).
 * @async
 */
Plugins.prototype.message = function (done, plugins, msg) {
  'use strict';

  if (!plugins) {
    plugins = this.plugins();
  } else if (typeof plugins === 'string') {
    plugins = [plugins];
  }

  var me = this,
      queue = [],
      args = Array.prototype.slice.call(arguments, 3);

  function msgPlugin(plugin) {
    return function (next) {
      var params = args.slice();
      params.unshift(next, msg);

      me._index[plugin].message.apply(null, params);
    };
  }

  plugins.forEach(function (plg) {
    if (!me._index[plg] || !me._index[plg]._initialized) {
      return;
    }

    queue.push(msgPlugin(plg));
  });

  async.series(queue, function (err) {
    done(err ? err : null);
  });
};

/**
 * Returns the specified plugin object.
 *
 * @method plugin
 * @param {String} plugin The name of the plugin to return.
 * @returns {Plugin} The plugin object.
 *
 * @throws {Error} Thrown if the plugin is not defined.
 */
Plugins.prototype.plugin = function (plugin) {
  'use strict';

  if (this._index[plugin] === undefined) {
    throw new EUndefinedPlugin(plugin);
  }

  return this._index[plugin];
};

/**
 * Exports the Plugins constructor.
 */
module.exports = Plugins;
