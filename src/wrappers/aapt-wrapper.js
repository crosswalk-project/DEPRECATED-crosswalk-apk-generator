/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var stripTrailingSeparators = require('../path-helpers').stripTrailingSeparators;

/**
 * Wrapper for the Android SDK aapt tool.
 * @constructor
 *
 * @param {string} aaptPath - path to aapt
 * @param {CommandRunner} [commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} instance to use to run aapt in a shell
 */
var AaptWrapper = function (aaptPath, commandRunner) {
  // so we can use this function as a factory without new
  if (!(this instanceof AaptWrapper)) {
    return new AaptWrapper(aaptPath, commandRunner);
  }

  this.aapt = aaptPath;
  this.commandRunner = commandRunner || require('../command-runner')();
};

/*
 * Get the base aapt arguments as an array
 *
 * options: options for constructing the arguments
 *   options.androidManifest: AndroidManifest.xml location
 *   options.resDirs: resources directories
 *   options.assetsDir: assets directory
 *   options.buildJars: jars to put on the classpath
 */
var getBaseArgs = function (options) {
  var args = [
    '-m', // make package directories under location specified by -J
    '-M ' + options.androidManifest,
    '-A ' + options.assetsDir,
    '-f', // force overwrite
    '--auto-add-overlay' // automatically add resources which are only in overlays
  ];

  // add resource directories; NB aapt doesn't like trailing path
  // separators, so we strip them here
  for (var i = 0; i < options.resDirs.length; i += 1) {
    args.push('-S ' + stripTrailingSeparators(options.resDirs[i]));
  }

  // add the app's build jars to the classpath
  for (i = 0; i < options.buildJars.length; i += 1) {
    args.push('-I ' + options.buildJars[i]);
  }

  return args;
};

/**
 * Run aapt to generate R.java and output it to outDir
 *
 * @param {object} options - options to pass to "aapt package" to
 * create the R.java file
 * @param {string} options.srcDir - srcDir to put Java files into
 * (note we're generating an R.java file)
 * @param {string} options.androidManifest - AndroidManifest.xml path
 * @param {string[]} options.resDirs - resources directories
 * @param {string} options.assetsDir - assets directory
 * @param {string[]} options.buildJars - paths to jars to put on the
 * classpath
 * @param {string} [options.pkg] - optional custom package name to
 * output R.java file to
 *
 * @returns {external:Promise} resolves or rejects to the result of
 * running the command
 */
AaptWrapper.prototype.generateRJava = function (options) {
  var args = getBaseArgs(options);

  if (options.pkg) {
    args.push('--custom-package ' + options.pkg);
  }

  // set base output directory for the R.java file
  args.push('-J ' + options.srcDir);

  // build the command
  var cmd = this.aapt + ' package ' + args.join(' ');

  // generate R.java file
  return this.commandRunner.run(cmd);
};

/**
 * Package resources into an intermediary resource apk. This is not
 * a complete package, just an archive containing the resources which will
 * be in the final apk file (assets and resources).
 *
 * @param {object} options - options to pass to "aapt package" to
 * create the intermediate apk file
 * @param {string} options.resPackageApk - output location for the
 * resource apk file
 * @param {string} options.androidManifest - AndroidManifest.xml path
 * @param {string[]} options.resDirs - resources directories
 * @param {string} options.assetsDir - assets directory
 * @param {string[]} options.buildJars - paths to jars to put on the
 * classpath
 *
 * @returns {external:Promise} resolves or rejects to the result of
 * running the command
 */
/*
 * This is what make_apk.py does:
 *
 * ant -DAAPT_PATH=/home/ell/apps/android-sdk-linux/build-tools/18.0.1/aapt -DADDITIONAL_RES_DIRS='' -DADDITIONAL_RES_PACKAGES='' -DADDITIONAL_R_TEXT_FILES='' -DANDROID_SDK_JAR=/home/ell/apps/android-sdk-linux/platforms/android-18/android.jar -DANDROID_SDK_ROOT=/home/ell/apps/android-sdk-linux -DANT_TASKS_JAR=/home/ell/apps/android-sdk-linux/tools/lib/ant-tasks.jar -DAPK_NAME=xwalk_demo -DAPP_MANIFEST_VERSION_CODE=0 -DAPP_MANIFEST_VERSION_NAME="Developer Build" -DASSET_DIR=build/skeleton/assets -DCONFIGURATION_NAME=Release -DOUT_DIR=build/skeleton -DRESOURCE_DIR=build/skeleton/res -DSTAMP=build/package_resources.stamp -Dbasedir=. -buildfile ../../ref/crosswalk-2.31.29.0/xwalk_app_template/scripts/ant/apk-package-resources.xml
 *
 * This seems to create the same thing just using aapt (no ant call, though no resource crunching):
 *
 * /home/ell/apps/android-sdk-linux/build-tools/18.0.1/aapt package -I /home/ell/apps/android-sdk-linux/platforms/android-18/android.jar -M build/skeleton/AndroidManifest.xml -S build/skeleton/res -v -A build/skeleton/assets -F build/skeleton/Test_the_big_old_generator.ap_
 */
AaptWrapper.prototype.packageResources = function (options) {
  var args = getBaseArgs(options);

  var outApk = options.resPackageApk;

  // set output apk location
  args.push('-F ' + outApk);

  // remove .* and <dir>_* from ignore-assets pattern
  // it is set via the aapt.ignore-assets property in xwalk_app_template/scripts/ant/apk-package-resources.xml
  // default is "!.svn:!.git:.*:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*.scc:*~"
  args.push('--ignore-assets ' + '!.svn:!.git:!CVS:!thumbs.db:!picasa.ini:!*.scc:*~');

  // generate the apk file
  var cmd = this.aapt + ' package ' + args.join(' ');

  return this.commandRunner.run(cmd);
};

module.exports = AaptWrapper;
