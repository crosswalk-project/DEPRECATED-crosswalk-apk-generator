/**
 * Wraps browser execution.
 */
var exec = require('child_process').exec;

module.exports = function (browserCmd, cb) {
  'use strict';
  exec(browserCmd, cb);
};
