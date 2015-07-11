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
 * Provides the EUndefinedPluginType error which is throw when attempting to use
 * an undefined plugin type.
 *
 * @author Orgun109uk <orgun109uk@gmail.com>
 *
 * @module ejs
 */

var util = require('util'),
    t = require('ejs-t');

/**
 * Thrown when trying to get an undefined plugin type.
 *
 * @param {String} type The plugin type.
 *
 * @class EUndefinedPluginType
 * @constructor
 * @extends Error
 */
function EUndefinedPluginType(type) {
  'use strict';

  EUndefinedPluginType.super_.call(this);
  Error.captureStackTrace(this, EUndefinedPluginType);

  this.message = t.t(
    'The plugin type ":type" is undefined.',
    {':type': type}
  );
}

/**
 * Inherit from the {Error} class.
 */
util.inherits(EUndefinedPluginType, Error);

/**
 * Export the error constructor.
 */
module.exports = EUndefinedPluginType;
