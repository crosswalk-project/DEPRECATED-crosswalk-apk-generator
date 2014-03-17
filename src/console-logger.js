/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var _ = require('lodash');

// private function used recursively by logPublicProperties();
// copy non-private properties of obj to the object copy
var copyPublic = function (obj, copy) {
  var privatePrefix = /^_/;

  _.each(obj, function (value, key) {
    if (!privatePrefix.test(key)) {
      if (_.isObject(value) && !_.isArray(value)) {
        copy[key] = copyPublic(value, {});
      }
      else {
        copy[key] = value;
      }
    }
  });

  return copy;
};

/**
 * Wrapper for console which provides an additional method for replacing
 * the current line of text (for writing progress messages).
 * @constructor
 */
var ConsoleLogger = function () {
  if (!(this instanceof ConsoleLogger)) {
    return new ConsoleLogger();
  }

  this.spinInterval = null;

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

/**
 * Write properties of an object to the console, excluding any
 * properties which begin with '_' (private ones)
 */
ConsoleLogger.prototype.logPublicProperties = function (obj) {
  console.log(copyPublic(obj, {}));
};

/**
 * Show a "spinner" to indicate something is still happening
 */
ConsoleLogger.prototype.spinStart = function () {
  if (this.spinInterval) {
    return;
  }

  var self = this;
  var states = ['-', '\\', '|', '/'];
  var i = 0;

  this.spinInterval = setInterval(function () {
    self.replace('Working... ' + states[i]);
    i++;

    if (i === states.length) {
      i = 0;
    }
  }, 500);
};

ConsoleLogger.prototype.spinStop = function () {
  if (this.spinInterval) {
    clearInterval(this.spinInterval);
    this.replace('');
  }
};

module.exports = ConsoleLogger;
