/**
 * Make a TizenConfig object which wraps the specified config.xml file.
 *
 * {Object} config Configuration object.
 * {String} [config.configFile='config.xml'] config.xml to wrap.
 */
module.exports = function (config) {
  'use strict';

  var tizenConfig = require('./tizen-config').create({
    parser: new (require('xml2js').Parser)(),

    // set at runtime from config; location of config.xml
    configFile: config.configFile || 'config.xml'
  });

  return tizenConfig;
};
