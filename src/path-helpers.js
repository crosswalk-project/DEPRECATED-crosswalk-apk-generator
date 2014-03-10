/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var os = require('os');

// translate forward slashes in str into OS-specific path separators
var fixSeparators = function (str, platform) {
  platform = platform || os.platform();

  if (/^win/.test(platform)) {
    str = str.split('/').join('\\');
  }

  return str;
};

// strip trailing path separators (one or more '/' or '\' characters followed
// by end of string)
var pathSepsRegex = new RegExp('[\\\\\/]+$');
var stripTrailingSeparators = function (str) {
  return str.replace(pathSepsRegex, '');
};

module.exports = {
  fixSeparators: fixSeparators,
  stripTrailingSeparators: stripTrailingSeparators
};
