/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

/**
 * Wrapper for the Android SDK dx tool.
 * @constructor
 *
 * @param {string} dxPath - path to the dx tool inside the Android SDK
 * @param {CommandRunner} [commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} instance to use to run dx in the shell
 */
var DxWrapper = function (dxPath, commandRunner) {
  if (!(this instanceof DxWrapper)) {
    return new DxWrapper(dxPath, commandRunner);
  }

  this.dx = dxPath;
  this.commandRunner = commandRunner || require('../command-runner')();
};

/**
 * Compile .class and .jar files into a dex format archive via the dx
 * CLI tool.
 *
 * @param {object} options
 * @param {string} options.dexFile - output .dex file file
 * @param {string} options.classesDir - directory containing .class files
 * @param {string[]} options.jars - paths of jars to be included in
 * the output .dex file
 */
/*
 * list of dx options:
 *
 * dx --dex [--debug] [--verbose] [--positions=<style>] [--no-locals]
 * [--no-optimize] [--statistics] [--[no-]optimize-list=<file>] [--no-strict]
 * [--keep-classes] [--output=<file>] [--dump-to=<file>] [--dump-width=<n>]
 * [--dump-method=<name>[*]] [--verbose-dump] [--no-files] [--core-library]
 * [--num-threads=<n>] [--incremental] [--force-jumbo]
 * [<file>.class | <file>.{zip,jar,apk} | <directory>] ...
 *  Convert a set of classfiles into a dex file, optionally embedded in a
 *  jar/zip. Output name must end with one of: .dex .jar .zip .apk. Positions
 *  options: none, important, lines.
 */
DxWrapper.prototype.compile = function (options) {
  var args = [
    '--dex',
    '--output ' + options.dexFile,
    options.classesDir
  ];

  for (var i = 0; i < options.jars.length; i += 1) {
    args.push(options.jars[i]);
  }

  var cmd = this.dx + ' ' + args.join(' ');

  var msg = 'Compiling .class files with dx to generate .dex ' +
            'file in ' + options.dexFile;

  return this.commandRunner.run(cmd, msg);
};

module.exports = DxWrapper;
