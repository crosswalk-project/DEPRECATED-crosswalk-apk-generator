/**
 * Minimal wrapper around sdb.
 */
var _ = require('lodash');
var exec = require('child_process').exec;

var construct = function () {
  'use strict';

  var SdbWrapper = function (config) {
    _.extend(this, config);
  };

  /**
   * Execute command with sdb; if this.sdbCmd is not set,
   * cb(error); otherwise
   */
  SdbWrapper.prototype.execute = function (command, cb) {
    if (!this.sdbCmd) {
      cb(
        new Error('sdbCmd property not set on SdbWrapper'),
        'sdbCmd not set for sdbWrapper',
        'sdbCmd not set for sdbWrapper'
      );
    }
    else {
      exec(this.sdbCmd + ' ' + command, cb);
    }
  };

  /**
   * Execute a command on the device via "sdb shell".
   * cb(err, stdout, stderr)
   */
  SdbWrapper.prototype.shell = function (remoteCommand, cb) {
    var cmd = 'shell "' + remoteCommand + '"';
    this.execute(cmd, cb);
  };

  /**
   * Push a file.
   */
  SdbWrapper.prototype.push = function (localFile, remotePath, cb) {
    var cmd = 'push ' + localFile + ' ' + remotePath;
    this.execute(cmd, cb);
  };

  /**
   * Forward a TCP port.
   */
  SdbWrapper.prototype.forward = function (localPort, remotePort, cb) {
    var cmd = 'forward tcp:' + localPort + ' tcp:' + remotePort;
    this.execute(cmd, cb);
  };

  /**
   * Turn root permission mode on/off.
   *
   * NB only works with sdb versions > 2.0
   * TODO test sdb version here and cb(error) if version is bad
   */
  SdbWrapper.prototype.root = function (on, cb) {
    var cmd = 'root ' + (on ? 'on' : 'off');
    this.execute(cmd, cb);
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
