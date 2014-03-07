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

// map from Android API levels to version numbers; this is used
// to guess where tools will be on Windows, as the directories
// are named 'build-tools/android-<version>' rather than
// 'build-tools/<api level>' as they are on Linux
var apiVersionToAndroidVersion = {
  19: '4.4', // kitkat
  18: '4.3', // jelly bean MR2
  17: '4.2', // jelly bean MR1,
  16: '4.1', // jelly bean
  15: '4.0.3', // ice cream sandwich MR1
  14: '4.0' // ice cream sandwich
};

module.exports = {
  fixSeparators: fixSeparators,
  stripTrailingSeparators: stripTrailingSeparators,
  apiVersionToAndroidVersion: apiVersionToAndroidVersion
};
