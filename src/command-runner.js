/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');

/**
 * Command line runner.
 * @constructor
 *
 * @param {boolean} [verbose=false] - set to true to print the command
 * lines which are being executed to the logger
 * @param {ConsoleLogger} [logger=vanilla ConsoleLogger] - logger
 * to write messages and command lines to
 * @param {function} execFn - function which will run a command line;
 * defaults to the built-in exec(); if supplied, should have the
 * signature execFn(command, cb), where cb is a function with the
 * signature cb(err, stdout, stderr)
 */
var CommandRunner = function (verbose, logger, execFn) {
  // enable this function to be used as a factory without "new"
  if (!(this instanceof CommandRunner)) {
    return new CommandRunner(verbose);
  }

  this.verbose = !!verbose;
  this.logger = logger || require('./console-logger')();
  this.exec = execFn || require('child_process').exec;
};

/**
 * Run a command in the shell.
 *
 * @param {string} command - command line to run
 * @param {string} [message] - message to show before the command is run
 * if CommandRunner.verbose === true, the command is also shown
 *
 * @returns {external:Promise} resolves to the output (stdout + stderr)
 * from the command (if it ran without error), or rejects with an error
 * if not; if rejected, the rejection error has a <code>code</code> property
 * representing the return code of the failed command. Note that both
 * stdout and stderr are returned as some tools write info messages
 * to stderr when the command actually returns successfully (e.g.
 * java).
 */
CommandRunner.prototype.run = function (command, message) {
  var dfd = Q.defer();
  var start = new Date();
  var verbose = this.verbose;
  var logger = this.logger;

  if (message) {
    logger.log('\n>>>>>>> ' + message);
  }

  this.exec(command, function (err, stdout, stderr) {
    if (verbose) {
      var end = new Date();
      var timeTaken = end.getTime() - start.getTime();

      logger.log('\nCOMMAND EXECUTED:\n' + command +
                 '\n--- EXECUTION TIME: ' + timeTaken + 'ms');
    }

    if (err) {
      var msg = 'command\n' + command + '\nreturned bad code ' + err.code +
                '\nstderr was:\n' + stderr + '\nstdout was:\n' + stdout;
      var error = new Error(msg);
      error.code = err.code;
      dfd.reject(error);
    }
    else {
      // include output from stderr; tools like java write to stderr
      // even if the exit code is 0
      dfd.resolve(stdout + stderr);
    }
  });

  return dfd.promise;
};

module.exports = CommandRunner;
