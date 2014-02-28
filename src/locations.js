/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

// hash function to create a unique directory name for extension js files
var counter = 1;

var hash = function () {
  var randomString = 'xxxxxxxx'.replace(/x/g, function () {
    var r = Math.random() * 16 | 0;
    return r.toString(16);
  });

  var id = randomString + '-' + (new Date()).getTime() + '-' + counter;

  counter += 1;

  return id;
};

// convert an arguments object into an array
var argsToArray = function (args) {
  return Array.prototype.slice.call(args, 0);
};

/**
 * <p>Class to construct destination file and directory names for a generic
 * app name and package, with respect to a specified destination directory.
 * This also holds information about other resources required for the
 * build (e.g. extra jar files needed for build, jar files to embed
 * in the apk).</p>
 *
 * <p>This is then used by {@link AppSkeleton} and {@link BuildTools} to
 * determine the output locations for generated files.</p>
 * @constructor
 *
 * @param {string} name - sanitised version of the app name, valid for use in
 * file names
 * @param {string} pkg - name of the Java package to put the activity into
 * @param {string} arch - architecture to create output paths for (e.g.
 * 'x86' or 'arm'); this is primarily appended to name to produce the
 * output apk filenames, e.g. MyApp.x86.apk
 * @param {string} [destDir="/tmp/xwalk-apk-gen"] - destination directory
 * for output application skeleton files and apks
 *
 * @throws Error if name or pkg are not set
 */
var Locations = function (name, pkg, arch, destDir) {
  if (!(this instanceof Locations)) {
    return new Locations(name, pkg, arch, destDir);
  }

  if (typeof name !== 'string') {
    throw new Error('name should be a string');
  }
  else if (typeof pkg !== 'string') {
    throw new Error('pkg should be a string');
  }
  else if (typeof arch !== 'string') {
    throw new Error('arch should be a string');
  }

  /**
   * @member
   * @type string
   * @instance
   */
  this.destDir = null;
  if (typeof destDir === 'string') {
    this.destDir = path.resolve(destDir);
  }
  else {
    this.destDir = path.join(require('os').tmpdir(), 'xwalk-apk-gen');
  }

  // jars from the xwalk_app_template are added by the Env at build time
  // to this.buildJars and this.jars

  /**
   * @desc jars needed for the build
   * @member
   * @type string[]
   * @instance
   */
  this.buildJars = [];

  /**
   * @desc jars to bundle with the app; these are incorporated into
   * the classes.dex output file
   * @member
   * @type string[]
   * @instance
   */
  this.jars = [];

  /**
   * @desc extra files and directories to bundle with the app;
   * these are copied into the assets/ directory, keeping their
   * tree structure
   * @member
   * @type string[]
   * @instance
   */
  this.assets = [];

  /**
   * @desc extra directories containing resources which need to
   * be added to the application, mainly for the purpose of
   * embedding the Crosswalk runtime; these resources also require
   * R.java files. The structure is:
   * {
   *   'resourceIdentifier': {
   *     'directories': [],
   *     'package: 'package.name'
   *   }
   * }
   * @member
   * @type object
   * @instance
   */
  this.resources = {};

  /**
   * @desc native libraries to be included in the apk file; these are
   * passed to the apkgen ant task
   * @member
   * @type string[]
   * @instance
   */
  this.nativeLibs = [];

  /**
   * @desc directory for compiled classes
   * @member
   * @type string
   * @instance
   */
  this.classesDir = path.join(this.destDir, 'classes');

  /**
   * @desc path to the generated .dex file, e.g. 'classes.dex'
   * @member
   * @type string
   * @instance
   */
  this.dexFile = path.join(this.destDir, 'classes.dex');

  /**
   * @desc location for the generated .ap_ intermediary resource package file
   * @member
   * @type string
   * @instance
   */
  this.resPackageApk = path.join(this.destDir, name + '.' + arch + '.ap_');

  /**
   * @desc location for the unsigned apk
   * @member
   * @type string
   * @instance
   */
  this.unsignedApk = path.join(this.destDir, name + '-unsigned.' + arch + '.apk');

  /**
   * @desc location for the signed (but unaligned) apk
   * @member
   * @type string
   * @instance
   */
  this.signedApk = path.join(this.destDir, name + '-signed.' + arch + '.apk');

  /**
   * @desc location for the final apk (signed and aligned)
   * @member
   * @type string
   * @instance
   */
  this.finalApk = path.join(this.destDir, name + '.' + arch + '.apk');

  /**
   * @desc location for resource files; this will have a generated
   * R.java file associated with it
   * @member
   * @type string[]
   * @instance
   */
  this.resDir = path.join(this.destDir, 'res');

  /**
   * @desc directory for assets; all the assets from appRoot are
   * copied here
   * @member
   * @type string
   * @instance
   */
  this.assetsDir = path.join(this.destDir, 'assets');

  /**
   * @desc directory for extension js files; this has a unique hash
   * to avoid accidentally overwriting any existing directories
   * @member
   * @type string
   * @instance
   */
  this.extensionsJsDir = path.join(this.assetsDir, hash() + 'xwalk-extensions');

  /**
   * @desc location for the output extensions-config.json file
   * @member
   * @type string
   * @instance
   */
  this.extensionsConfig = path.join(this.assetsDir, 'extensions-config.json');

  /**
   * @desc directory for .java files
   * @member
   * @type string
   * @instance
   */
  this.srcDir = path.join(this.destDir, 'src');

  // map the Java package name to a directory structure
  var pathParts = [this.srcDir].concat(pkg.split('.'));

  /**
   * @desc directory for the activity Java file
   * @member
   * @type string
   * @instance
   */
  this.javaPackageDir = path.join.apply(null, pathParts);

  /**
   * @desc AndroidManifest.xml file path
   * @member
   * @type string
   * @instance
   */
  this.androidManifest = path.join(this.destDir, 'AndroidManifest.xml');

  /**
   * @desc directory for default icon (res/drawable)
   * @member
   * @type string
   * @instance
   */
  this.defaultDrawableDir = path.join(this.resDir, 'drawable');

  /**
   * @desc other res/drawable-* directories; maps resolution strings ('xhdpi',
   * 'hdpi', 'mdpi', 'ldpi') to paths
   * @member
   * @type object
   * @instance
   */
  this.drawableDirs = {};
  var drawableDirKeys = ['xhdpi', 'hdpi', 'mdpi', 'ldpi'];

  var key;
  for (var i = 0; i < drawableDirKeys.length; i += 1) {
    key = drawableDirKeys[i];
    this.drawableDirs[key] = path.join(this.resDir, 'drawable-' + key);
  }
};

/**
 * Add jar files to be included in the apk output; multiple path arguments
 * can be passed.
 * @param {...string} path - path to jar to add
 */
Locations.prototype.addJars = function () {
  this.jars = this.jars.concat(argsToArray(arguments));
};

/**
 * Add jar files required to compile the classes for the App; multiple
 * path arguments can be passed.
 * @param {...string} path - path to jar to add for build
 */
Locations.prototype.addBuildJars = function () {
  this.buildJars = this.buildJars.concat(argsToArray(arguments));
};

/**
 * Add asset files and directories for the App; multiple path arguments
 * can be passed.
 * @param {...string} path - path to directory or file to add to the output
 * assets/ directory
 */
Locations.prototype.addAssets = function () {
  this.assets = this.assets.concat(argsToArray(arguments));
};

/**
 * Add a group of related resources. These are identified with a unique
 * string (for reference purposes only), a set of directories containing
 * the resources, and a package that the resources R.java file should
 * be placed inside.
 * @param {string} id - arbitrary identifier for the group of
 * resources
 * @param {object} properties - an object like:
 * {
 *   resDirs: [], // resource directory paths; these are included in the apk
 *   libs: [], // extra library paths required to make R.java
 *   pkg: 'package.name' // package to output R.java file to
 * }
 */
Locations.prototype.addResources = function (id, properties) {
  this.resources[id] = properties;
};

/**
 * Add a native library to be included in the apk file. This is used
 * to set the NATIVE_LIBS_DIR property before the apk-package.xml
 * Ant buildfile is invoked.
 * @param {...string} path - path to directory to add to the
 * NATIVE_LIBS_DIR property
 */
Locations.prototype.addNativeLibs = function () {
  this.nativeLibs = this.nativeLibs.concat(argsToArray(arguments));
};

module.exports = Locations;
