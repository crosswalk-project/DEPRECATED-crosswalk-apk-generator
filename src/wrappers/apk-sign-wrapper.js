/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

 /**
 * Wrapper for the command-line tools which sign and align
 * an apk (jarsigner from the JDK, and zipalign from the Android SDK).
 * @constructor
 *
 * @param {string} jarsignerPath - path to jarsigner command
 * @param {string} zipalignPath - path to zipalign command
 * @param {string} keystore - path to JKS keystore; see
 * {@link http://docs.oracle.com/javase/tutorial/security/toolsign/step3.html}
 * for more information about creating a keystore
 * @param {string} keystorePassword - password for keystore
 * @param {string} keystoreAlias - alias of the key in the keystore
 * to be used for signing the apk file
 * @param {CommandRunner} [commandRunner=non-verbose CommandRunner] -
 * {@link CommandRunner} instance to use to run commands in the shell
 * @param {object} [shell=shelljs module] - shell object to use
 * for copying/moving/renaming files; defaults to the
 * {@link external:shelljs} module
 */
var ApkSignWrapper = function (jarsignerPath, zipalignPath, keystore, keystorePassword, keystoreAlias, commandRunner, shell) {
  if (!(this instanceof ApkSignWrapper)) {
    return new ApkSignWrapper(jarsignerPath, zipalignPath, keystore, keystorePassword, keystoreAlias, commandRunner, shell);
  }

  // TODO validate arguments

  this.jarsigner = jarsignerPath;
  this.zipalign = zipalignPath;
  this.keystore = keystore;
  this.keystorePassword = keystorePassword;
  this.keystoreAlias = keystoreAlias;
  this.commandRunner = commandRunner || require('../command-runner')();
  this.shell = shell || require('shelljs');
};

/**
 * <p>Sign an apk file; NB jarsigner signs the apk file in place, so we
 * first copy the unsignedApk path to its signedApk path; then
 * sign the apk file in the location signedApk. This leaves the
 * unsignedApk file in place, untouched.</p>
 *
 * <p>This method mirrors what make_apk.py does:</p>
 *
 * <pre>
 * jarsigner -sigalg MD5withRSA -digestalg SHA1 -keystore $KEYSTORE \
 * -storepass $PASSWORD $PATH_TO_APK $ALIAS
 * </pre>
 *
 * @param {string} unsignedApk - path to the unsigned apk
 * @param {string} signedApk - path for the output apk
 *
 * @returns {external:Promise} resolves or rejects depending
 * on the result of running the jarsigner command
 */
ApkSignWrapper.prototype.apksign = function (unsignedApk, signedApk) {
  // copy the unsigned apk to the location for the signed apk;
  // the signed apk is signed in place
  if (this.shell.test('-f', signedApk)) {
    this.shell.rm(signedApk);
  }

  this.shell.cp(unsignedApk, signedApk);

  var args = [
    '-sigalg SHA1withRSA',
    '-digestalg SHA1',
    '-keystore ' + this.keystore,
    '-storepass ' + this.keystorePassword,
    signedApk,
    this.keystoreAlias
  ];

  var cmd = this.jarsigner + ' ' + args.join(' ');

  return this.commandRunner.run(cmd);
};

/**
 * <p>Align the apk using the zipalign tool from the Android SDK.</p>
 *
 * <p>This method mirrors what make_apk.py does:</p>
 *
 * <pre>
 * zipalign -f 4 build/app-signed.apk build/app-aligned.apk
 * </pre>
 *
 * @param {string} signedApk - location of the signed but unaligned
 * apk file
 * @param {string} finalApk - path to put the signed AND aligned
 * apk file to
 *
 * @returns {external:Promise} resolves or rejects, depending on
 * the result of running the zipalign command
 */
ApkSignWrapper.prototype.apkalign = function (signedApk, finalApk) {
  var args = [
    '-f 4', // align at 4 byte boundaries
    signedApk,
    finalApk
  ];

  var cmd = this.zipalign + ' ' + args.join(' ');

  return this.commandRunner.run(cmd);
};

/**
 * Sign and align an apk file.
 *
 * @param {object} options
 * @param {string} options.unsignedApk - location of the unsigned apk file
 * @param {string} options.signedApk - output location of the signed
 * (unaligned) apk file
 * @param {string} options.finalApk - output location for the signed
 * and aligned apk file
 *
 * @returns {external:Promise} resolves if the sign and align both
 * succeed, otherwise rejects with an error
 */
ApkSignWrapper.prototype.signPackage = function (options) {
  var self = this;

  var promise = this.apksign(options.unsignedApk, options.signedApk);

  promise = promise.then(
    function () {
      return self.apkalign(options.signedApk, options.finalApk);
    }
  );

  return promise;
};

module.exports = ApkSignWrapper;
