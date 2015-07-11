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
 * Provides the EDisabledPlugin error which is throw when attempting to use a
 * plugin which has yet to be enabled.
 *
 * @author Orgun109uk <orgun109uk@gmail.com>
 *
 * @module ejs
 */

var util = require('util'),
    t = require('ejs-t');

/**
 * Thrown when trying to use a disabled plugin.
 *
 * @param {String} type The plugin type.
 * @param {String} plugin The name of the plugin.
 *
 * @class EDisabledPlugin
 * @constructor
 * @extends Error
 */
function EDisabledPlugin(type, plugin) {
  'use strict';

  EDisabledPlugin.super_.call(this);
  Error.captureStackTrace(this, EDisabledPlugin);

  this.message = t.t(
    'The plugin ":plugin" of type ":type" is disabled.',
    {':plugin': plugin, ':type': type}
  );
}

/**
 * Inherit from the {Error} class.
 */
util.inherits(EDisabledPlugin, Error);

/**
 * Export the error constructor.
 */
module.exports = EDisabledPlugin;
