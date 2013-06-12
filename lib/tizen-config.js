/**
 * Parses config.xml file and makes its properties readily available;
 * NB even if you modify the configFile property directly, the cached
 * copy of the config XML will continue to be returned: there is no
 * way to reload the config.xml on the fly, as that's not necessary in
 * the context where we have a single config.xml file which can be loaded
 * once per grunt run.
 */
var fs = require('fs');

var TizenConfig = function (config) {
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
        self.configParsed  = {uri: uri, id: id};
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
    return new TizenConfig(config);
  }
};
