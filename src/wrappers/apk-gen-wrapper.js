/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');
var _ = require('lodash');

/**
 * Wrapper for calling Ant with the apk-package.xml buildfile (part of the
 * xwalk-android distribution).
 * @constructor
 *
 * @param {string} antPath - path to ant
 * @param {string} androidSDKDir - path to the Android SDK root
 * directory; NB this should point to the sdk/ directory inside the root
 * if running on Windows
 * @param {string} anttasksJar - path to the anttasks.jar inside the
 * Android SDK
 * @param {string} xwalkApkPackageAntFile - path to the
 * apk-package.xml buildfile inside the xwalk_app_template
 * directory (usually under scripts/ant)
 * @param {CommandRunner} [commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} instance to use to run ant in a shell
 *
 * @TODO ensure ant uses the same java executable as specified in Env
 */
var ApkGenWrapper = function (antPath, androidSDKDir, anttasksJar, xwalkApkPackageAntFile, commandRunner) {
  if (!(this instanceof ApkGenWrapper)) {
    return new ApkGenWrapper(antPath, androidSDKDir, anttasksJar, xwalkApkPackageAntFile, commandRunner);
  }

  this.ant = antPath;
  this.androidSDKDir = androidSDKDir;
  this.anttasksJar = anttasksJar;
  this.xwalkApkPackageAntFile = xwalkApkPackageAntFile;
  this.commandRunner = commandRunner || require('../command-runner')();
};

/**
 * <p>Run the apkbuilder Ant task to package the resources apk file and
 * classes.dex file to produce a full (unsigned) apk file.</p>
 *
 * <p>This method mirrors what the make_apk.py script does:</p>
 *
 * <pre>
 *   src_dir = '-DSOURCE_DIR=' + os.path.join(sanitized_name, 'src')
 *   apk_path = '-DUNSIGNED_APK_PATH=' + os.path.join('out', 'app-unsigned.apk')
 *   cmd = ['python', 'scripts/gyp/ant.py',
 *       '-DANDROID_SDK_ROOT=%s' % sdk_root_path,
 *       '-DANT_TASKS_JAR=%s' % ant_tasks_jar_path,
 *       '-DAPK_NAME=%s' % sanitized_name,
 *       '-DCONFIGURATION_NAME=Release',
 *       '-DOUT_DIR=out',
 *       src_dir,
 *       apk_path,
 *       '-Dbasedir=.',
 *       '-buildfile',
 *       'scripts/ant/apk-package.xml']
 * RunCommand(cmd)
 * </pre>
 *
 * <p>In the first instance, we're replicating the call to the Ant task,
 * as there is a big pile of code to deal with. It would be nice
 * to remove this requirement and invoke apkbuilder directly, though
 * that's not possible as Google have deprecated it in favour of the
 * ant buildfile. Even though the ant approach mandates the existence
 * of an apk file with the correct name (here, it's <app name>.ap_) and
 * is less flexible and harder to follow.</p>
 *
 * @param {object} options
 * @param {string} options.destDir - base directory for the Ant build
 * @param {string} options.resPackageApk - path to the intermediate apk
 * package containing resources (see {@link AaptWrapper#packageResources};
 * note that this MUST have the suffix .ap_, as the Ant script depends
 * on this
 * @param {string} options.srcDir - directory containing apk source .java files
 * @param {string} options.unsignedApk - output location for the
 * unsigned apk file
 * @param {string} options.nativeLibs - path to extra native library
 * directory to include in the package
 */
/* make_apk.py produces a command-line like this:
 *
 * ant -DANDROID_SDK_ROOT=/home/ell/apps/android-sdk-linux -DANT_TASKS_JAR=/home/ell/apps/android-sdk-linux/tools/lib/ant-tasks.jar -DAPK_NAME=Test_the_big_old_generator -DCONFIGURATION_NAME=Release -DOUT_DIR=skeleton -DSOURCE_DIR=skeleton/src -DUNSIGNED_APK_PATH=build/app-unsigned.apk -Dbasedir=build -buildfile ../../ref/crosswalk-2.31.29.0/xwalk_app_template/scripts/ant/apk-package.xml
 */
ApkGenWrapper.prototype.packageUnsigned = function (options) {
  // the APK_NAME property needs to be set to the path of the .ap_
  // temporary apk file (just resources), relative to options.destDir;
  // this is unpleasant but unavoidable as the Ant task sets the apk
  // suffix and location itself
  var apkName = path.relative(options.destDir, options.resPackageApk);
  apkName = apkName.replace(/\.ap_/, '');

  var args = [
    '-Dbasedir=' + options.destDir,
    '-DANDROID_SDK_ROOT=' + this.androidSDKDir,
    '-DANT_TASKS_JAR=' + this.anttasksJar,
    '-DAPK_NAME=' + apkName,
    '-DCONFIGURATION_NAME=Release',
    '-DOUT_DIR=' + options.destDir,
    '-DSOURCE_DIR=' + path.relative(options.destDir, options.srcDir),
    '-DUNSIGNED_APK_PATH=' + options.unsignedApk
  ];

  if (options.nativeLibs) {
    _.each(options.nativeLibs, function (nativeLib) {
      args.push('-DNATIVE_LIBS_DIR=' + path.relative(options.destDir, nativeLib));
    });
  }

  args.push('-buildfile ' + this.xwalkApkPackageAntFile);

  var cmd = this.ant + ' ' + args.join(' ');
  var msg = 'Creating unsigned apk in ' + options.unsignedApk;

  return this.commandRunner.run(cmd, msg);
};

module.exports = ApkGenWrapper;
