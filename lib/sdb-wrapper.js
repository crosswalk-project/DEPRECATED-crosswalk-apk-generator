/**
 * Minimal wrapper around sdb.
 */
var _ = require('lodash');
var exec = require('child_process').exec;

var construct = function () {
  'use strict';

  var SdbWrapper = function (config) {
    config.sdbCmd = config.sdbCmd || process.env.SDB || 'sdb';
    _.extend(this, config);
  };

  /**
   * Execute a command on the device via "sdb shell".
   * cb(err, stdout, stderr)
   */
  SdbWrapper.prototype.shell = function (remoteCommand, cb) {
    var cmd = this.sdbCmd + ' shell "' + remoteCommand + '"';
    exec(cmd, cb);
  };

  /**
   * Push a file.
   */
  SdbWrapper.prototype.push = function (localFile, remotePath, cb) {
    var cmd = this.sdbCmd + ' push ' + localFile + ' ' + remotePath;
    exec(cmd, cb);
  };

  /**
   * Forward a TCP port.
   */
  SdbWrapper.prototype.forward = function (localPort, remotePort, cb) {
    var cmd = this.sdbCmd + ' forward tcp:' + localPort + ' tcp:' + remotePort;
    exec(cmd, cb);
  };

  /**
   * Turn root permission mode on/off.
   *
   * NB only works with sdb versions > 2.0
   * TODO test sdb version here and cb(error) if version is bad
   */
  SdbWrapper.prototype.root = function (on, cb) {
    var cmd = this.sdbCmd + ' root ' + (on ? 'on' : 'off');
    exec(cmd, cb);
  };

  return SdbWrapper;
};

var SdbWrapper = construct();

module.exports = {
  create: function (config) {
    'use strict';
    return new SdbWrapper(config);
  }
};
