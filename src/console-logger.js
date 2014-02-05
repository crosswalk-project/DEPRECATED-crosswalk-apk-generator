/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var _ = require('lodash');

/**
 * Wrapper for console which provides an additional method for replacing
 * the current line of text (for writing progress messages).
 * @constructor
 */
var ConsoleLogger = function () {
  if (!(this instanceof ConsoleLogger)) {
    return new ConsoleLogger();
  }

  _.extend(this, console);
};

/**
 * Write to stdout without a trailing newline
 */
ConsoleLogger.prototype.write = function (msg) {
  process.stdout.write(msg);
};

/**
 * Replace the current content of stdout with msg; useful for
 * writing progress messages in one place.
 *
 * @param {string} msg - message to write
 */
ConsoleLogger.prototype.replace = function (msg) {
  process.stdout.clearLine();  // clear current text
  process.stdout.cursorTo(0);  // move cursor to beginning of line
  process.stdout.write(msg);
};

module.exports = ConsoleLogger;
