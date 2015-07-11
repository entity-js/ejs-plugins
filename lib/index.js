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
    glob = require('glob'),
    async = require('async'),
    semver = require('semver'),
    merge = require('ejs-merge'),
    listener = require('ejs-listener'),
    ejsStatic = require('ejs-static'),
    sortBy = require('ejs-sortby'),
    Plugin = require('./plugin'),
    EUndefinedPlugin = require('./errors/EUndefinedPlugin'),
    EUndefinedPluginType = require('./errors/EUndefinedPluginType'),
    EDisabledPlugin = require('./errors/EDisabledPlugin');

var _plugins,
    _pattern = 'plugin.json',
    _static = ejsStatic('ejs-plugins', {
      _types: {},
      _index: {}
    }).get();

/**
 * The plugins component class.
 *
 * @class Plugins
 * @construct
 * @param {String|Array} paths The path or paths to search for plugin index
 *   files.
 */
_plugins = module.exports = {
  /**
   * Registers a plugin type and paths.
   *
   * @method register
   * @param {String} type The plugin type name.
   * @param {String} title The admin ui title for the plugin type.
   * @param {String} description The admin ui description for the plugin type.
   * @param {String|Array} paths A path or paths where this plugin type is
   *   located.
   * @return {Object} Returns self.
   * @chainable
   */
  register: function (type, title, description, paths) {
    'use strict';

    _static._types[type] = {
      title: title || '',
      description: description || '',
      paths: typeof paths === 'string' ? [paths] : paths
    };

    return _plugins;
  },

  /**
   * Determine if the plugin type has been registered.
   *
   * @method registered
   * @param {String} type The plugin type name.
   * @return {Boolean} Returns true or false.
   */
  registered: function (type) {
    'use strict';

    return _static._types[type] !== undefined;
  },

  /**
   * Returns the registered plugin types.
   *
   * @method types
   * @return {Object} The registered plugin types.
   */
  types: function () {
    'use strict';

    return _static._types;
  },

  /**
   * Index plugin files in the defined paths.
   *
   * @method index
   * @param {Function} done The done callback.
   *   @param {Error} done.err Any raised errors.
   * @param {String|Array} [types] A type or an array of types to index, if not
   *   provided then all registered types is assumed.
   * @async
   */
  index: function (done, types) {
    'use strict';

    if (!types) {
      types = [];

      for (var type in _static._types) {
        types.push(type);
      }
    } else if (typeof types === 'string') {
      types = [types];
    }

    var queue = [];

    function doGlob (type, patterns) {
      return function (next) {
        glob(patterns.join(','), function (err, files) {
          if (err) {
            return next(err);
          }

          files.forEach(function (filename) {
            var plgName = path.dirname(filename).split(path.sep).pop();

            if (_static._index[type] === undefined) {
              _static._index[type] = {};
            }

            _static._index[type][plgName] = require(filename);

            _static._index[type][plgName] = merge({
              title: '',
              description: '',
              author: '',
              version: '0.0.0',
              main: 'index',
              dependencies: {}
            }, _static._index[type][plgName]);

            _static._index[type][plgName]._name = plgName;
            _static._index[type][plgName]._path = path.dirname(filename);
            _static._index[type][plgName]._instance = null;
          });

          sortBy(_static._index[type], 'weight');

          next();
        });
      };
    }

    for (var i = 0, len = types.length; i < len; i++) {
      if (_static._types[types[i]] === undefined) {
        continue;
      }

      _static._index[types[i]] = {};

      var _type = _static._types[types[i]],
          patterns = [];

      for (var j = 0, jen = _type.paths.length; j < jen; j++) {
        var _path = _type.paths[j];
        patterns.push(
          path.join(path.normalize(_path), '**', _pattern)
        );
      }

      queue.push(doGlob(types[i], patterns));
    }

    async.series(queue, function (err) {
      done(err ? err : null);
    });
  },

  /**
   * Returns the indexed plugins.
   *
   * @method plugins
   * @param {String} [type] Return a list of a specific type.
   * @return {Object} Returns an object of indexed plugins.
   */
  plugins: function (type) {
    'use strict';

    return type ?
      (_static._index[type] ? _static._index[type] : {}) :
      _static._index;
  },

  /**
   * Enables the specified plugins.
   *
   * @method enable
   * @param {Function} done The done callback.
   *   @param {Error} done.err Any raised errors.
   * @param {String|Array} [types] The plugin type or types to enable, must be
   *   string if names are used.
   * @param {String|Array} [plugins] A plugin name or array of plugin names to
   *   enable.
   * @async
   */
  enable: function (done, types, plugins) {
    'use strict';

    var plg, i, len, queue = [];

    function action (typ, plugin) {
      return function (next) {
        var module = path.join(
              _static._index[typ][plugin]._path,
              _static._index[typ][plugin].main
            );

        if (require.cache[module]) {
          delete require.cache[module];
        }

        var Constructor = require(module);

        _static._index[typ][plugin]._instance = new Constructor(plugin, _static._index[typ][plugin]);
        _static._index[typ][plugin]._instance.enable(function (err) {
          if (err) {
            return next(err);
          }

          listener.invoke(next, [
            'plugin[' + typ + '].enabled',
            'plugin.enabled'
          ], plugin);
        });
      };
    }

    if (!types || types instanceof Array) {
      if (types) {
        for (i = 0, len = types.length; i < len; i++) {
          if (_static._types[types[i]] === undefined) {
            continue;
          }

          for (plg in _static._index[types[i]]) {
            queue.push(action(types[i], plg));
          }
        }
      } else {
        for (var type in _static._types) {
          for (plg in _static._index[type]) {
            queue.push(action(type, plg));
          }
        }
      }
    } else if (plugins) {
      for ( i = 0, len = plugins.length; i < len; i++) {
        if (_static._index[types][plugins[i]] === undefined) {
          continue;
        }

        queue.push(action(types, plugins[i]));
      }
    } else {
      for (plg in _static._index[types]) {
        queue.push(action(types, plg));
      }
    }

    async.series(queue, function (err) {
      listener.emit('plugins.enabled');
      done(err ? err : null);
    });
  },

  /**
   * Reloads an enabled plugin.
   *
   * @method reload
   * @param {String} type The plugin type.
   * @param {String} plugin The name of the plugin.
   * @return {Object} Returns self.
   * @chainable
   */
  reload: function (type, plugin) {
    'use strict';

    if (_static._index[type] === undefined) {
      throw new EUndefinedPluginType(type);
    }

    if (_static._index[type][plugin] === undefined) {
      throw new EUndefinedPlugin(type, plugin);
    }

    if (_static._index[type][plugin]._instance instanceof Plugin === false) {
      throw new EDisabledPlugin(type, plugin);
    }

    var module = path.join(
          _static._index[type][plugin]._path,
          _static._index[type][plugin].main
        );

    if (require.cache[module]) {
      delete require.cache[module];
    }

    var Constructor = require(module);
    _static._index[type][plugin]._instance = new Constructor(
      plugin,
      _static._index[type][plugin]
    );

    return _plugins;
  },

  /**
   * Disables the specified plugins.
   *
   * @method enable
   * @param {Function} done The done callback.
   *   @param {Error} done.err Any raised errors.
   * @param {String|Array} [types] The plugin type or types to enable, must be
   *   string if names are used.
   * @param {String|Array} [plugins] A plugin name or array of plugin names to
   *   disable.
   * @throws {EUndefinedPluginType} Thrown if the plugin type is not defined.
   * @async
   */
  disable: function (done, type, plugins) {
    'use strict';

    var queue = [], i, len, plg;

    if (_static._index[type] === undefined) {
      throw new EUndefinedPluginType(type);
    }

    function action (typ, plugin) {
      return function (next) {
        _static._index[typ][plugin]._instance.disable(function (err) {
          if (err) {
            return next(err);
          }

          _static._index[type][plugin]._instance = null;

          listener.invoke(next, [
            'plugin[' + typ + '].disabled',
            'plugin.disabled'
          ], plugin);
        });
      };
    }

    if (plugins) {
      for ( i = 0, len = plugins.length; i < len; i++) {
        if (
          _static._index[type][plugins[i]] === undefined ||
          _static._index[type][plugins[i]]._instance instanceof Plugin === false
        ) {
          continue;
        }

        queue.push(action(type, plugins[i]));
      }
    } else {
      for (plg in _static._index[type]) {
        if (_static._index[type][plg]._instance instanceof Plugin === false) {
          continue;
        }

        queue.push(action(type, plg));
      }
    }

    async.series(queue, function (err) {
      listener.emit('plugins.disabled');
      done(err ? err : null);
    });
  },

  /**
   * Updates the provided plugin.
   *
   * @method done
   * @param {Function} done The done callback.
   *   @param {Error} done.err Any raised errors.
   * @param {String} type The plugin type.
   * @param {String} plugin The name of the plugin.
   * @throws {EUndefinedPluginType} Thrown if the plugin type isnt defined.
   * @throws {EUndefinedPlugin} Thrown if the plugin is undefined.
   * @throws {EDisabledPlugin} Thrown if the plugin is not enabled.
   * @async
   */
  update: function (done, type, plugin, from) {
    'use strict';

    if (_static._index[type] === undefined) {
      return done(new EUndefinedPluginType(type));
    } else if (_static._index[type][plugin] === undefined) {
      return done(new EUndefinedPlugin(type, plugin));
    } else if (_static._index[type][plugin]._instance === null) {
      return done(new EDisabledPlugin(type, plugin));
    }

    var to = _static._index[type][plugin].version;
    if (semver.gt(from, to) === false) {
      return done(null);
    }

    _static._index[type][plugin]._instance.update(done, from, to);
  },

  /**
   * Determines if a plugin has been enabled.
   *
   * @method enabled
   * @param {String} type The plugin type.
   * @param {String} plugin The name of the plugin to check.
   * @return {Boolean} Returns true if the plugin has been enabled.
   * @throws {EUndefinedPluginType} Thrown if the plugin type is not defined.
   * @throws {EUndefinedPlugin} Thrown if the plugin is not defined.
   */
  enabled: function (type, plugin) {
    'use strict';

    if (_static._index[type] === undefined) {
      throw new EUndefinedPluginType(type);
    }

    if (_static._index[type][plugin] === undefined) {
      throw new EUndefinedPlugin(type, plugin);
    }

    return _static._index[type][plugin]._instance instanceof Plugin;
  },

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
  message: function (done, types, plugins, msg) {
    'use strict';

    var type, plg, i, len,
        queue = [],
        args = Array.prototype.slice.call(arguments, 4);

    if (plugins && plugins instanceof Array === false) {
      plugins = [plugins];
    } else if (types && types instanceof Array === false) {
      types = [types];
    }

    function msgPlugin (type, plugin) {
      return function (next) {
        var params = args.slice();
        params.unshift(next, msg);

        _static._index[type][plugin]._instance.message.apply(
          _static._index[type][plugin]._instance,
          params
        );
      };
    }

    if (!types || types instanceof Array) {
      if (types) {
        for (i = 0, len = types.length; i < len; i++) {
          if (_static._types[types[i]] === undefined) {
            continue;
          }

          for (plg in _static._index[types[i]]) {
            if (_static._index[types[i]][plg]._instance instanceof Plugin === false) {
              continue;
            }

            queue.push(msgPlugin(types[i], plg));
          }
        }
      } else {
        for (var type in _static._types) {
          for (plg in _static._index[type]) {
            if (_static._index[type][plg]._instance instanceof Plugin === false) {
              continue;
            }

            queue.push(msgPlugin(type, plg));
          }
        }
      }
    } else if (plugins) {
      for ( i = 0, len = plugins.length; i < len; i++) {
        if (
          _static._index[types][plugins[i]] === undefined ||
          _static._index[types][plugins[i]]._instance instanceof Plugin === false
        ) {
          continue;
        }

        queue.push(msgPlugin(types, plugins[i]));
      }
    } else {
      for (plg in _static._index[types]) {
        if (_static._types[types][plg]._instance instanceof Plugin === false) {
          continue;
        }

        queue.push(msgPlugin(types, plg));
      }
    }

    async.series(queue, function (err) {
      done(err ? err : null);
    });
  },

  /**
   * Returns the specified plugin object.
   *
   * @method plugin
   * @param {String} plugin The name of the plugin to return.
   * @return {Plugin} The plugin object.
   * @throws {EUndefinedPluginType} Thrown if the plugin type is not defined.
   * @throws {EUndefinedPlugin} Thrown if the plugin is not defined.
   * @throws {EDisabledPlugin} Thrown if the plugin has not yet been enabled.
   */
  plugin: function (type, plugin) {
    'use strict';

    if (_static._index[type] === undefined) {
      throw new EUndefinedPluginType(type);
    }

    if (_static._index[type][plugin] === undefined) {
      throw new EUndefinedPlugin(type, plugin);
    }

    if (_static._index[type][plugin]._instance instanceof Plugin === false) {
      throw new EDisabledPlugin(type, plugin);
    }

    return _static._index[type][plugin]._instance;
  }
};
