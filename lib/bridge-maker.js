/**
 * Copyright 2013 Intel Corporate Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Make a Bridge object based on config, setting defaults if
 * necessary.
 *
 * {String} [config.sdbCmd] sdb command to use; if not set, defaults
 * to the environment variable SDB; failing that, defaults to 'sdb'.
 * {String} [config.tizenAppScriptDir='/tmp'] The directory
 * the tizen-app.sh script should be pushed to on the device.
 * {Object} config.logger Logger object with write(),
 * ok(), warn() and error() methods.
 */
module.exports = function (config) {
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

    tizenAppScriptDir: config.tizenAppScriptDir || '/tmp',

    // internally set at runtime from tizenAppScriptDir and tizenAppScriptLocal;
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
