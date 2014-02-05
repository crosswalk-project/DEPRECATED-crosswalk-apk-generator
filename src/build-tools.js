/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var _ = require('lodash');

var Aapt = require('./wrappers/aapt-wrapper');
var Javac = require('./wrappers/javac-wrapper');
var Dx = require('./wrappers/dx-wrapper');
var ApkGen = require('./wrappers/apk-gen-wrapper');
var ApkSign = require('./wrappers/apk-sign-wrapper');

/**
 * Wrapper for external tools from the Android SDK, Ant and Java JDK.
 * Provides a method for a one step build of an apk for an App instance.
 * @constructor
 *
 * @param {Env} env - fully configured Env instance
 * @param {CommandRunner} commandRunner - CommandRunner instance to run
 * command line tools
 */
var BuildTools = function (env, commandRunner) {
  if (!(this instanceof BuildTools)) {
    return new BuildTools(env, commandRunner);
  }

  // *** set up command wrappers

  /**
   * @desc wrapper for the aapt command line tool from the Android SDK
   * @member
   * @type AaptWrapper
   * @instance
   */
  this.aaptWrapper = env.aaptWrapper || Aapt(env.aapt, commandRunner);

  /**
   * @desc wrapper for javac binary
   * @member
   * @type JavacWrapper
   * @instance
   */
  this.javacWrapper = env.javacWrapper || Javac(
    env.javac,
    env.sourceJavaVersion,
    env.targetJavaVersion,
    commandRunner
  );

  /**
   * @desc wrapper for the dx command line tool from the Android SDK
   * @member
   * @type DxWrapper
   * @instance
   */
  this.dxWrapper = env.dxWrapper || Dx(env.dx, commandRunner);

  /**
   * @desc wrapper for ant calling the apk-package buildfile
   * @member
   * @type ApkGenWrapper
   * @instance
   */
  this.apkGenWrapper = env.apkGenWrapper || ApkGen(
    env.ant,
    env.androidSDKDir,
    env.anttasksJar,
    env.xwalkApkPackageAntFile,
    commandRunner
  );

  /**
   * @desc wrapper for jarsigner, and zipalign from the Android SDK
   * @member
   * @type ApkSignWrapper
   * @instance
   */
  this.apkSignWrapper = env.apkSignWrapper || ApkSign(
    env.jarsigner,
    env.zipalign,
    env.keystore,
    env.keystorePassword,
    env.keystoreAlias,
    commandRunner
  );
};

/**
 * Make an apk by calling each of the required 3rd party command
 * line tools in turn, referencing a {@link Locations} object
 * containing the input and output locations to use.
 *
 * The steps are:
 *
 * <ul>
 *   <li>call aapt to create an R.java file</li>
 *   <li>compile R.java and other .java files with javac</li>
 *   <li>create a temporary apk file containing resources by running
 *   an ant task</li>
 *   <li>compile all .class files and .jar files to a .dex file using dx</li>
 *   <li>create an unsigned apk file with all previous resources</li>
 *   <li>sign the apk file with jarsigner</li>
 *   <li>align the content of the signed apk file using zipalign</li>
 * </ul>
 *
 * @param {Locations} locations
 *
 * @returns {external:Promise} resolves to a string representing the
 * path to the final apk file or rejects with an error, depending on
 * the result of the build steps
 */
BuildTools.prototype.makeApk = function (locations) {
  var self = this;
  var dfd = Q.defer();

  Q.resolve()
  .then(
    function () {
      var rJavaPromises = [];

      var resDirs = [locations.resDir];
      _.each(locations.resources, function (resourceInfo) {
        resDirs = resDirs.concat(resourceInfo.libs, resourceInfo.resDirs);
      });

      var rJavaOpts = {
        androidManifest: locations.androidManifest,
        buildJars: locations.buildJars,
        srcDir: locations.srcDir, // output src directory
        assetsDir: locations.assetsDir,
        resDirs: resDirs
      };

      // generate the main R.java file
      var mainRJava = self.aaptWrapper.generateRJava(rJavaOpts);
      rJavaPromises.push(mainRJava);

      // generate 3 R.java files for extra embedded resources
      _.each(locations.resources, function (resourceInfo) {
        var opts = _.extend(rJavaOpts, {
          pkg: resourceInfo.pkg
        });

        rJavaPromises.push(self.aaptWrapper.generateRJava(opts));
      });

      return Q.all(rJavaPromises);
    }
  )
  .then(
    function () {
      // compile R.java and *Activity.java
      return self.javacWrapper.compile({
        classesDir: locations.classesDir,
        buildJars: locations.buildJars,
        srcDir: locations.srcDir
      });
    }
  )
  .then(
    function () {
      var resDirs = [locations.resDir];

      _.each(locations.resources, function (resourceInfo) {
        resDirs = resDirs.concat(resourceInfo.libs, resourceInfo.resDirs);
      });

      // make an intermediate apk for resources
      var packageResourcesPromise = self.aaptWrapper.packageResources({
        androidManifest: locations.androidManifest,
        resDirs: resDirs,
        assetsDir: locations.assetsDir,
        buildJars: locations.buildJars,
        resPackageApk: locations.resPackageApk
      });

      // compile classes.dex
      var dxCompilePromise = self.dxWrapper.compile({
        dexFile: locations.dexFile,
        classesDir: locations.classesDir,
        jars: locations.jars
      });

      // we can do these steps in parallel
      return Q.all([packageResourcesPromise, dxCompilePromise]);
    }
  )
  .then(
    function () {
      // create unsigned apk via Ant with buildfile apk-package.xml
      // TODO mark the signed package as "-debug" if using the xwalk keystore
      // TODO include the Android apk version in the output filename
      return self.apkGenWrapper.packageUnsigned({
        destDir: locations.destDir,
        resPackageApk: locations.resPackageApk,
        srcDir: locations.srcDir,
        unsignedApk: locations.unsignedApk,
        nativeLibs: locations.nativeLibs
      });
    }
  )
  .then(
    function () {
      // sign and zipalign the apk
      return self.apkSignWrapper.signPackage({
        unsignedApk: locations.unsignedApk,
        signedApk: locations.signedApk,
        finalApk: locations.finalApk
      });
    }
  )
  .done(
    function () {
      // resolve to the location of the output apk file
      dfd.resolve(locations.finalApk);
    },

    dfd.reject
  );

  return dfd.promise;
};

module.exports = BuildTools;
