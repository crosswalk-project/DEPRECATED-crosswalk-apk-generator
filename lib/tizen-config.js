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
 * Parses config.xml file and makes its properties readily available;
 * NB even if you modify the configFile property directly, the cached
 * copy of the config XML will continue to be returned: there is no
 * way to reload the config.xml on the fly, as that's not necessary in
 * the context where we have a single config.xml file which can be loaded
 * once per grunt run.
 */
var fs = require('fs');

/**
 * Create a Tizen config.xml file wrapper object.
 * {Object} config.parser xml2js parser instance
 * {String} config.configFile Path to the config.xml file to wrap
 */
var TizenConfig = function (config) {
  'use strict';

  this.parser = config.parser;
  this.configFile = config.configFile || 'config.xml';

  // cached copy of the configuration
  this.configParsed = null;
};

/**
 * Get metadata about the Tizen app from a config.xml file.
 *
 * cb() will be invoked with cb(error) or cb(null, <configuration object>)
 * The configuration object has the format:
 * {
 *   id: <widget> id attribute
 *   uri: <widget> > <tizen:application> id attribute
 * }
 *
 * The values of the properties are derived from the config.xml file,
 * from the paths shown.
 */
TizenConfig.prototype.getMeta = function (cb) {
  'use strict';

  var self = this;

  if (self.configParsed) {
    cb(null, self.configParsed);
    return;
  }

  var parseXml = function (xml) {
    self.parser.parseString(xml, function (err, result) {
      if (err) {
        cb(err);
      }
      else {
        var uri = result.widget.$.id;
        var id = result.widget['tizen:application'][0].$.id;
        var packageName = result.widget['tizen:application'][0].$.package;
        self.configParsed  = {uri: uri, id: id, packageName: packageName};
        cb(null, self.configParsed);
      }
    });
  };

  fs.readFile(self.configFile, function (err, xml) {
    if (err) {
      cb(err);
    }
    else {
      parseXml(xml);
    }
  });
};

module.exports = {
  create: function (config) {
    'use strict';
    return new TizenConfig(config);
  }
};
