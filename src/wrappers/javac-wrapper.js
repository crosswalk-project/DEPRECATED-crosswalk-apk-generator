/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var glob = require('glob');
var path = require('path');
var _ = require('lodash');

var fixSeparators = require('../path-helpers').fixSeparators;

/**
 * Wrapper for javac (Java compilation tool in the Java Development Kit).
 * @see http://docs.oracle.com/javase/7/docs/technotes/tools/
 * @constructor
 *
 * @param {string} javacPath - path to the javac command (OS-specific path
 * separators should be used)
 * @param {string} sourceVersion - Java version of source files, e.g. '1.5'
 * @param {string} targetVersion - Java version to target for the output
 * .class files, e.g. '1.5'
 * @param {CommandRunner} [commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} instance to use to run javac in a shell
 * @param {string} [platform=os.platform()] - platform javac is running
 * on (used to set the classpath separator: ';' for Windows, ':' otherwise)
 */
var JavacWrapper = function (javacPath, sourceVersion, targetVersion, commandRunner, platform) {
  // enable use of this function as a factory without "new"
  if (!(this instanceof JavacWrapper)) {
    return new JavacWrapper(javacPath, sourceVersion, targetVersion, commandRunner, platform);
  }

  // set defaults for missing args
  this.commandRunner = commandRunner || require('../command-runner')();
  platform = platform || require('os').platform();

  this.javac = javacPath;

  // classpath separator is os-specific
  this.cpSeparator = (/^win/.test(platform) ? ';' : ':');

  this.sourceVersion = sourceVersion;
  this.targetVersion = targetVersion;
};

/**
 * <p>Compile .java files in a source directory to .class files in a specified
 * directory, keeping the package structure.</p>
 *
 * <p>This mirrors what the javac.py script in the Crosswalk
 * xwalk_app_template does, i.e.:</p>
 *
 * <pre>
 * javac_cmd = [
 *      'javac',
 *      '-g',
 *      '-source', '1.5',
 *      '-target', '1.5',
 *      '-classpath', os.pathsep.join(classpath),
 *      '-d', output_dir,
 *      '-Xlint:unchecked',
 *      '-Xlint:deprecation',
 *      ] + java_files
 * </pre>
 *
 * <p>The dx tool requires the Java target version to 1.6 or lower, so I'm using
 * -target to ensure that I compile to 1.5.</p>
 *
 * <p>Note that this produces warnings if you're using a newer JDK than 1.5,
 * as you should really set the bootclasspath to the rt.jar for the older Java
 * version.</p>
 *
 * @param {object} options - options for the javac call
 * @param {string} options.srcDir - directory containing .java files; note
 * that this is searched recursively for files matching *.java
 * @param {string} options.classesDir - output location for .class files
 * @param {string[]} [options.buildJars] - paths of jar files to put on the
 * classpath for the compilation command
 *
 * @returns {external:Promise} resolves if compilation succeeded,
 * or rejects if the source file search fails or compilation fails
 *
 * @TODO check the Java version in Env.configure() to ensure
 * the version required matches the version available.
 */
/* The command which works for me (albeit with one warning):
 * javac -g -d build/skeleton/classes -Xlint:unchecked -Xlint:deprecation -classpath /home/ell/2_crosswalk-apk-generator/ref/xwalk_app_template/libs/xwalk_app_runtime_activity_java.jar:/home/ell/2_crosswalk-apk-generator/ref/xwalk_app_template/libs/xwalk_app_runtime_client_java.jar:/home/ell/apps/android-sdk-linux/platforms/android-18/android.jar build/skeleton/src/org01/apkgen/*.java
 */
JavacWrapper.prototype.compile = function (options) {
  var self = this;

  var dfd = Q.defer();

  var args = [
    '-g',
    '-d ' + options.classesDir,
    '-source ' + this.sourceVersion,
    '-target ' + this.targetVersion,
    '-Xlint:unchecked',
    '-Xlint:deprecation'
  ];

  if (options.buildJars && options.buildJars.length) {
    args.push('-classpath ' + options.buildJars.join(this.cpSeparator));
  }

  glob(path.join(options.srcDir, '**/*.java'), function (err, files) {
    if (err) {
      dfd.reject(err);
    }
    else {
      files = _.map(files, function (filename) {
        return fixSeparators(filename);
      });

      args = args.concat(files);

      var cmd = self.javac + ' ' + args.join(' ');

      self.commandRunner.run(cmd)
      .then(dfd.resolve, dfd.reject);
    }
  });

  return dfd.promise;
};

module.exports = JavacWrapper;
