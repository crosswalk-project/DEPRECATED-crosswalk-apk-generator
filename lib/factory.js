/**
 * Factory functions for making Bridge, TizenConfig and the grunt
 * task objects.
 * Responsible for constructing the various component
 * objects, configuring them, and wiring them together.
 */

/**
 * Make a Bridge object based on config, setting defaults if
 * necessary.
 *
 * {String} config.sdbCmd sdb command to use; if not set, defaults
 * to the environment variable SDB; failing that, defaults to 'sdb'
 * {String} config.tizenAppScriptDir The directory the tizen-app.sh script
 * should be pushed to on the device
 * {Object} config.logger Logger object with write(),
 * ok(), warn() and error() methods
 */
var makeBridge = function (config) {
  'use strict';

  var path = require('path');

  var bridge = require('./bridge').create({
    fileLister: require('./file-lister'),
    browserWrapper: require('./browser-wrapper'),

    sdbWrapper: require('./sdb-wrapper').create({
      sdbCmd: config.sdbCmd || process.env.SDB || 'sdb'
    }),

    logger: config.logger,

    tizenAppScriptLocal: path.join(__dirname, '../scripts/tizen-app.sh'),

    tizenAppScriptDir: config.tizenAppScriptDir || 'tmp',

    // internally set at runtime from tizenAppScriptDir and TIZEN_APP_SCRIPT;
    // location of the tizen-app.sh script on the device
    tizenAppScriptPath: null
  });

  // set location of the tizen-app.sh script, based on the local
  // filename for the script and the configured directory
  bridge.tizenAppScriptPath = bridge.getDestination(
    bridge.tizenAppScriptLocal,
    bridge.tizenAppScriptDir
  );

  return bridge;
};

/**
 * Make a TizenConfig object which wraps the specified config.xml file.
 */
var makeTizenConfig = function (config) {
  'use strict';

  var tizenConfig = require('./tizen-config').create({
    parser: new (require('xml2js').Parser)(),

    // set at runtime from config; location of config.xml
    configFile: config.configFile || 'config.xml'
  });

  return tizenConfig;
};

module.exports = {
  makeBridge: makeBridge,
  makeTizenConfig: makeTizenConfig
};
