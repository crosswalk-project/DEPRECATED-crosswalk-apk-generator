/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var events = require('events');
var Q = require('q');
var _ = require('lodash');

/**
 * Command line runner.
 * @constructor
 *
 * @param {function} execFn - function which will run a command line;
 * defaults to the built-in exec(); if supplied, should have the
 * signature execFn(command, cb), where cb is a function with the
 * signature cb(err, stdout, stderr)
 */
var CommandRunner = function (execFn) {
  // enable this function to be used as a factory without "new"
  if (!(this instanceof CommandRunner)) {
    return new CommandRunner(execFn);
  }

  this.exec = execFn || require('child_process').exec;

  // used to track command numbers for correlating events
  this.commandId = 0;

  events.EventEmitter.call(this);
};

/**
 * Run a command in the shell.
 *
 * @param {string} command - command line to run
 *
 * @returns {external:Promise} resolves to the output (stdout + stderr)
 * from the command (if it ran without error), or rejects with an error
 * if not; if rejected, the rejection error has a <code>code</code> property
 * representing the return code of the failed command. Note that both
 * stdout and stderr are returned as some tools write info messages
 * to stderr when the command actually returns successfully (e.g.
 * java).
 */
CommandRunner.prototype.run = function (command) {
  var self = this;
  var dfd = Q.defer();
  var start = new Date();

  var commandId = (this.commandId += 1);

  self.emit('command:start', {
    commandId: commandId,
    command: command,
    startTime: start
  });

  this.exec(command, function (err, stdout, stderr) {
    var end = new Date();

    if (err) {
      var msg = 'command\n' + command + '\nreturned bad code ' + err.code +
                '\nstderr was:\n' + stderr + '\nstdout was:\n' + stdout;

      var error = new Error(msg);
      error.code = err.code;

      self.emit('command:fail', {
        commandId: commandId,
        command: command,
        error: error,
        endTime: end
      });

      dfd.reject(error);
    }
    else {
      self.emit('command:success', {
        commandId: commandId,
        command: command,
        endTime: end
      });

      // include output from stderr; tools like java write to stderr
      // even if the exit code is 0
      dfd.resolve(stdout + stderr);
    }
  });

  return dfd.promise;
};

_.extend(CommandRunner.prototype, events.EventEmitter.prototype);

module.exports = CommandRunner;
