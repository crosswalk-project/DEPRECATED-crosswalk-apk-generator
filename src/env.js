/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var path = require('path');
var _ = require('lodash');

var stripTrailingSeparators = require('./path-helpers').stripTrailingSeparators;

var BuildTools = require('./build-tools');

// map from Android API levels to version numbers; this is used
// to guess where tools will be on Windows, as the directories
// are named 'build-tools/android-<version>' rather than
// 'build-tools/<api level>' as they are on Linux
var apiVersionToAndroidVersion = {
  19: '4.4', // kitkat
  18: '4.3', // jelly bean MR2
  17: '4.2', // jelly bean MR1
  16: '4.1', // jelly bean
  15: '4.0.3', // ice cream sandwich MR1
  14: '4.0' // ice cream sandwich
};

// for an array of paths, sort the array by the name of the parent
// directory of each file, as it corresponds to an Android version number
//
// for example:
//
// files = ['build-tools/19.0.1/aapt', 'build-tools/19.0.0/aapt']
// will return
// ['build-tools/19.0.0/aapt', 'build-tools/19.0.1/aapt']
//
// and:
//
// files = ['build-tools/19.0.1/aapt', 'build-tools/android-4.4']
// will return
// ['build-tools/android-4.4/aapt', 'build-tools/19.0.1/aapt']
// as 4.4 is treated as '19.0.0'
//
// NB paths should contain paths which have forward slashes for the
// path separators (e.g. as returned by glob())
var selectLatestVersion = function (paths) {
  // first map to objects which keep the original path as well
  // as the version
  var pathsWithVersions = _.map(paths, function (aPath) {
    // get the version: it's the part of the path before the
    // basename (the last path element); if it starts with 'android-',
    // map the part after android- to an API level + '.0.0'
    var version = _.last(path.dirname(aPath).split('/'));

    if (/android-/.test(version)) {
      version = apiVersionToAndroidVersion[version.replace('android-')];
      version += '.0.0';
    }

    return {
      path: aPath,
      version: version
    };
  });

  // then sort them
  var sorted = _.sortBy(pathsWithVersions, 'version');

  // then map back to an array of path strings
  paths = _.pluck(sorted, 'path');

  // return the last one
  return _.last(paths);
};

/*
 * Locate binaries and scripts outside the Android SDK,
 * testing that they exist.
 *
 * config: a configuration object, as passed to checkEnv()
 *
 * returns a promise
 * if any item cannot be found, the returned promise is rejected
 * with an error which describes the missing piece;
 * otherwise, it resolves
 */
var locateFiles = function (finder, config) {
  config = config || {};

  var dfd = Q.defer();

  // test executables and files are all where we want them
  var tests = [
    // Java should be the Sun version, not the OpenJDK one,
    // hence the Java(TM) regex
    finder.checkExecutable(config.java, ['-version'], /Java\(TM\)/m),

    finder.checkExecutable(config.javac, ['-version']),
    finder.checkExecutable(config.ant, ['-version']),
    finder.checkExecutable(config.jarsigner, ['-help'], /Usage: jarsigner/, 1)
  ];

  // resolve when all tests are done
  Q.all(tests)
  .done(
    dfd.resolve,
    dfd.reject
  );

  return dfd.promise;
};

/*
 * Locate the bits of the Android SDK we need if not set by config;
 * we first try finding them by guessing where they are, then
 * by an exhaustive search if that fails; note that we prioritise
 * the binary names based on platform (i.e. look for "aapt.exe" first
 * if we're on Windows)
 *
 * usual locations:
 *   aapt: "build-tools/18.0.1/aapt"
 *   dx: "build-tools/18.0.1/dx"
 *   ant-tasks.jar: "tools/lib/ant-tasks.jar"
 *   android.jar: "platforms/android-18/android.jar"
 */
var locateAndroidPieces = function (finder, config) {
  // get the Android version for the API level;
  // this is used to find the tools where the directory
  // name is android-N.M rather than N.M.P
  var androidVersion = apiVersionToAndroidVersion[config.androidAPILevel];

  var androidPieces = {};

  if (!config.anttasksJar) {
    androidPieces.anttasksJar = {
      files: ['ant-tasks.jar', 'anttasks.jar'],
      guessDirs: [path.join('tools', 'lib')]
    };
  }

  if (!config.androidJar) {
    androidPieces.androidJar = {
      files: ['android.jar'],
      guessDirs: [
        path.join('platforms', 'android-' + config.androidAPILevel)
      ]
    };
  }

  if (!config.zipalign) {
    androidPieces.zipalign = {
      exe: 'zipalign',
      guessDirs: ['tools']
    };
  }

  // aapt and dx require sorting of the returned values by Android version
  if (!config.aapt) {
    androidPieces.aapt = {
      exe: 'aapt',
      guessDirs: [
        path.join('build-tools', config.androidAPILevel + '*'),
        path.join('build-tools', 'android-' + androidVersion)
      ],
      filter: selectLatestVersion
    };
  }

  if (!config.dx) {
    androidPieces.dx = {
      exe: 'dx',
      guessDirs: [
        path.join('build-tools', config.androidAPILevel + '*'),
        path.join('build-tools', 'android-' + androidVersion)
      ],
      filter: selectLatestVersion
    };
  }

  // we only do the lookup if any pieces haven't been specified
  var androidPiecesPromise = Q();
  var needAndroidPieces = _.keys(androidPieces).length;

  if (needAndroidPieces) {
    androidPiecesPromise = finder.locatePieces(
      config.androidSDKDir,
      androidPieces
    );
  }

  return androidPiecesPromise;
};

/*
 * Find pieces of the Xwalk app template (jar files, ant files, keystore)
 */
var locateXwalkPieces = function (finder, config) {
  var xwalkPieces = {};

  if (!config.xwalkRuntimeClientJar) {
    xwalkPieces.xwalkRuntimeClientJar = {
      files: ['xwalk_app_runtime_java.jar'],
      guessDirs: ['libs']
    };
  }

  if (!config.xwalkApkPackageAntFile) {
    xwalkPieces.xwalkApkPackageAntFile = {
      files: ['apk-package.xml'],
      guessDirs: [path.join('scripts', 'ant')]
    };
  }

  // extra components required for embedded mode
  if (!config.xwalkEmbeddedJar) {
    xwalkPieces.xwalkEmbeddedJar = {
      files: ['xwalk_core_embedded.dex.jar', 'xwalk_runtime_embedded.dex.jar'],
      guessDirs: ['libs']
    };
  }

  if (!config.xwalkCoreResources) {
    xwalkPieces.xwalkCoreResources = {
      resDirs: [path.join('gen', 'xwalk_core_java', 'res_grit')],
      libs: [path.join('libs_res', 'runtime')],
      pkg: 'org.xwalk.core'
    };
  }

  if (!config.chromiumUiResources) {
    xwalkPieces.chromiumUiResources = {
      resDirs: [
        path.join('gen', 'ui_java', 'res_crunched'),
        path.join('gen', 'ui_java', 'res_v14_compatibility'),
        path.join('gen', 'ui_java', 'res_grit')
      ],

      libs: [path.join('libs_res', 'ui')],

      pkg: 'org.chromium.ui'
    };
  }

  if (!config.chromiumContentResources) {
    xwalkPieces.chromiumContentResources = {
      resDirs: [
        path.join('gen', 'content_java', 'res_crunched'),
        path.join('gen', 'content_java', 'res_v14_compatibility'),
        path.join('gen', 'content_java', 'res_grit')
      ],

      libs: [path.join('libs_res', 'content')],

      pkg: 'org.chromium.content'
    };
  }

  if (!config.nativeLibs) {
    var nativeLibsDir = path.join('native_libs', 'armeabi-v7a', 'libs');

    if (config.arch === 'x86') {
      nativeLibsDir = path.join('native_libs', 'x86', 'libs');
    }

    xwalkPieces.nativeLibs = {
      directory: nativeLibsDir
    };
  }

  if (!config.xwalkAssets) {
    xwalkPieces.xwalkAssets = {
      directory: 'native_libs_res'
    };
  }

  // use the default xwalk keystore in the app template if it is
  // not set
  if (!config.keystore) {
    xwalkPieces.keystore = {
      files: ['xwalk-debug.keystore'],
      guessDirs: [path.join('scripts', 'ant')]
    };
  }

  // we only do the lookup if any pieces haven't been specified
  var xwalkPiecesPromise = Q({});
  var needXwalkPieces = _.keys(xwalkPieces).length;

  if (needXwalkPieces) {
    xwalkPiecesPromise = finder.locatePieces(
      config.xwalkAndroidDir,
      xwalkPieces
    );
  }

  return xwalkPiecesPromise;
};

/**
 * Constructs a representation of the runtime environment, based
 * on an initial set of options, and provides a command to build an apk
 * from an {@link App} instance.
 * NB a single Env object can be used to build apks for different
 * App instances, but based on the same {@link AppSkeleton}.
 * If you intend to create an apk which is to be deployed to the
 * Google Play Store, you must set keystore, keystoreAlias and
 * keystorePassword to reference your own JKS keystore. If not, the
 * xwalk debug keystore is used, which will not produce a valid
 * signed apk for submission to an app store.
 * @constructor
 *
 * @param {object} config - object mapping identifiers (e.g. "androidSDK") to
 * filesystem paths or other values
 * @param {string} config.androidSDKDir - directory location of Android SDK
 * @param {string} config.xwalkAndroidDir - location of a downloaded
 * xwalk-android distribution, containing the jar files and
 * xwalk_app_template required to build an apk for Crosswalk; see README.md
 * for more details about how to download this
 * @param {string} [config.androidAPILevel=Env.CONFIG_DEFAULTS.androidAPILevel]] -
 * Android API level to target (e.g. 18, 19); also used to find Android tools
 * @param {string} [config.java="java"] - location of java binary; NB this
 * should be a binary from the Sun Java distribution, not GNU Java
 * @param {string} [config.javac="javac"] - location of javac binary (part
 * of the Java JDK)
 * @param {string} [config.ant="ant"] - location of ant binary
 * @param {string} [config.jarsigner="jarsigner"] - location of the jarsigner
 * binary (part of the Java JDK)
 * @param {string} [config.sourceJavaVersion=Env.CONFIG_DEFAULTS.sourceJavaVersion] -
 * version string to pass to javac's "-source" option
 * @param {string} [config.targetJavaVersion=Env.CONFIG_DEFAULTS.targetJavaVersion] -
 * version string to pass to javac's "-target" option
 * @param {string} [config.arch=arm] - architecture to build for; "x86" or "arm"
 * @param {string} [config.aapt=derived from androidSDKDir] - location of the
 * aapt binary (part of the Android SDK)
 * @param {boolean} [config.embedded=Env.CONFIG_DEFAULTS.embedded] -
 * set to true to bundle Crosswalk with the output apk file, false
 * to use shared mode (requires XWalkRuntimeLib.apk to installed
 * on the device to run the application)
 * @param {string} [config.dx=derived from androidSDKDir] - location of the
 * dx binary (part of the Android SDK)
 * @param {string} [config.anttasksJar=derived from androidSDKDir] - location
 * of the anttasks.jar file inside the Android SDK
 * @param {string} [config.androidJar=derived from androidSDKDir] - location
 * of the android.jar file inside the Android SDK
 * @param {string} [config.xwalkRuntimeClientJar=derived from xwalkAndroidDir] -
 * location of the xwalk client jar, which is merged into the classes.dex
 * file included with the output apk file
 * @param {string} [config.xwalkEmbeddedJar=derived from xwalkAndroidDir] -
 * location of the xwalk_core_embedded.dex.jar, required if embedding xwalk
 * into the apk file
 * @param {string[]} [config.xwalkCoreResources=derived from xwalkAndroidDir] -
 * list of directories added to output apk; also parsed to generate an
 * R.java file in the org.xwalk.core package
 * @param {string[]} [config.chromiumUiResources=derived from xwalkAndroidDir] -
 * list of directories added to output apk; also parsed to generate an
 * R.java file in the org.chromium.ui package
 * @param {string[]} [config.chromiumContentResources=derived from xwalkAndroidDir] -
 * list of directories added to output apk; also parsed to generate an
 * R.java file in the org.chromium.content package
 * @param {string} [config.xwalkAssets=derived from xwalkAndroidDir] -
 * location of the the directory containing the xwalk.pak file and jsapi,
 * required if embedding xwalk in the apk
 * @param {string} [config.xwalkApkPackageAntFile=derived from xwalkAndroidDir] -
 * location of the apk-package.xml Ant build file, included in the
 * xwalk_app_template which is part of the xwalk-android download
 * @param {string} [config.nativeLibs=derived from xwalkAndroidDir] -
 * parent directory of the directory containing the libxwalkcore.so file
 * (e.g. 'native_libs/armeabi-v7a/libs')
 * @param {string} [config.keystore="xwalk-debug.keystore"] - the JKS
 * keystore containing the key to use for signing the apk; defaults
 * to the xwalk-debug.keystore in the xwalk_app_template
 * @param {string} [config.keystoreAlias=Env.CONFIG_DEFAULTS.keystoreAlias] -
 * the alias for the key inside the keystore, which is to be used for
 * signing the apk
 * @param {string} [config.keystorePassword=Env.CONFIG_DEFAULTS.keystorePassword] -
 * password for the keystore
 * @param {object} [deps] - optional helper objects
 * @param {CommandRunner} [deps.commandRunner] - defaults to
 * a plain {@link CommandRunner}
 * @param {AppSkeleton} [deps.appSkeleton] - defaults to a vanilla
 * {@link AppSkeleton}
 * @param {Finder} [deps.finder] - defaults to a vanilla
 * {@link Finder} instance
 *
 * @returns {external:Promise} rejects with error explaining missing
 * configuration, or resolves to a valid and configured
 * {@link Env} instance
 */
var Env = function (config, deps) {
  if (!(this instanceof Env)) {
    return new Env(config, deps);
  }

  deps = deps || {};

  /**
   * @member
   * @type CommandRunner
   * @instance
   */
  this._commandRunner = deps.commandRunner || require('./command-runner')();

  /**
   * @member
   * @type AppSkeleton
   * @instance
   */
  this._appSkeleton = deps.appSkeleton || require('./app-skeleton')();

  /**
   * @member
   * @type Finder
   * @instance
   */
  this._finder = deps.finder || require('./finder')();

  /**
   * @member
   * @type BuildTools
   * @instance
   */
  this._buildTools = null;

  return this.configure(config);
};

 /**
 * @desc Default values for environment properties.
 * Note that all the properties specified here are available
 * as instance variables with the same name on each {@link Env} instance.
 * For more details about what the properties refer to, see
 * the {@link Env} constructor.
 *
 * @member {object} Env.CONFIG_DEFAULTS
 *
 * @property {string} java - set to "java"
 * @property {string} javac - set to "javac"
 * @property {string} ant - set to "ant"
 * @property {string} jarsigner - set to "jarsigner"
 * @property {string} sourceJavaVersion - set to "1.5"
 * @property {string} targetJavaVersion - set to "1.5"
 * @property {string} arch - set to "arm"
 * @property {boolean} embedded - set to true
 * @property {string} androidAPILevel - "19"
 * @property {string} keystore - set to xwalk-android keystore
 * @property {string} keystoreAlias - set to "xwalkdebugkey"
 * @property {string} keystorePassword - set to "xwalkdebug"
 */
Env.CONFIG_DEFAULTS = {
  java: 'java',
  javac: 'javac',
  ant: 'ant',
  jarsigner: 'jarsigner',

  sourceJavaVersion: '1.5',
  targetJavaVersion: '1.5',
  arch: 'x86',
  embedded: true,

  androidSDKDir: null,
  androidAPILevel: null,

  // we can hopefully work these out from the androidSDK location
  dx: null,
  aapt: null,
  anttasksJar: null,
  androidJar: null,
  zipalign: null,

  xwalkAndroidDir: null,
  xwalkRuntimeClientJar: null,
  xwalkApkPackageAntFile: null,
  xwalkAssets: null,
  xwalkEmbeddedJar: null,
  xwalkCoreResources: null,
  chromiumContentResources: null,
  chromiumUiResources: null,
  nativeLibs: null,

  // for signing; defaults to the xwalk debug keystore, key and alias
  keystore: null,
  keystoreAlias: 'xwalkdebugkey',
  keystorePassword: 'xwalkdebug'
};

/*
 * Make a {@link BuildTools} object which proxies the command-line
 * tools for this {@link Env} instance.
 *
 * @returns {BuildTools} configured for this {@link Env}
 */
Env.prototype.getBuildTools = function () {
  if (!this._buildTools) {
    this._buildTools = BuildTools(this, this._commandRunner);
  }

  return this._buildTools;
};

/**
 * Build an apk for app, using [this.appSkeleton]{@link Env#appSkeleton} as
 * the template for the output files, and a {@link Locations} object to define
 * the output paths.
 *
 * @param {App} app - {@link App} instance to build the apk for
 * @param {Locations} locations - note that this would normally be
 * a {@link Locations} object constructed using the sanitisedName and pkg
 * properties of app, but it doesn't have to be
 *
 * @returns {external:Promise} resolves to the name of the final
 * output apk if successful, or rejects with an Error object
 */
Env.prototype.build = function (app, locations) {
  var dfd = Q.defer();

  // get a wrapper for the command line tools
  var buildTools = this.getBuildTools();

  var javaSrcDirs = app.javaSrcDirs;

  // add jars required to compile the app
  locations.addBuildJars(
    this.androidJar,
    this.xwalkRuntimeClientJar
  );

  // add jars which should be bundled with the app
  locations.addJars(
    this.xwalkRuntimeClientJar
  );

  // add jars which the app specifies for itself, both to the build
  // classpath and for inclusion in the output apk file
  locations.addJars.apply(locations, app.jars);
  locations.addBuildJars.apply(locations, app.jars);

  // if the app is in embedded mode, add jars and other resources
  // to support that
  if (this.embedded) {
    locations.addJars(this.xwalkEmbeddedJar);
    locations.addAssets(this.xwalkAssets);
    locations.addNativeLibs(this.nativeLibs);
    locations.addResources('xwalkCore', this.xwalkCoreResources);
    locations.addResources('chromiumUi', this.chromiumUiResources);
    locations.addResources('chromiumContent', this.chromiumContentResources);
  }

  // create an object for use in the templates which contains the
  // icon name, target SDK version, package etc.
  var appData = {
    name: app.name,
    version: app.version,
    sanitisedName: app.sanitisedName,
    pkg: app.pkg,
    icon: app.icon,
    permissions: app.getPermissions(),
    theme: app.theme,
    appRoot: app.appRoot,
    appLocalPath: app.appLocalPath,
    javaSrcDirs: javaSrcDirs,
    extensionsJsFiles: app.getExtensionsJsFiles(),

    // clone this as we're going to munge the paths in it
    extensions: _.clone(app.extensions),

    remoteDebugging: app.remoteDebugging,
    orientation: app.orientation,
    targetSdkVersion: this.androidAPILevel
  };

  // generate initial skeleton; this includes the Activity .java
  // file for the app, the manifest, res/, plus assets copied from
  // the appRoot directory; this is pure JS, with no external
  // tools involved
  this._appSkeleton.generate(appData, locations)
  .then(
    function () {
      // make the apk file; note that we make the R.java file
      // here rather than in the skeleton as it requires an
      // external tool (aapt)
      return buildTools.makeApk(locations);
    }
  )
  .done(
    function () {
      dfd.resolve(locations.finalApk);
    },

    dfd.reject
  );

  return dfd.promise;
};

/**
 * Check that all the required binaries, scripts and other environment
 * variables needed for a Crosswalk apk build are valid. Note that this
 * will set fallback values and try to infer values if they are not set
 * explicitly.
 *
 * @param {object} config - see the {@link Env} constructor for details
 * of the valid config properties
 *
 * @returns {external:Promise} resolves to {@link Env} instance (with all executables
 * and scripts located and confirmed), or rejects with the first error which
 * resulted from the checks being run
 *
 * @TODO cache result of pieces search and use it if available
*/
Env.prototype.configure = function (config) {
  config = config || {};
  var self = this;

  var dfd = Q.defer();
  var promise = dfd.promise;

  // fill any missing keys in config
  _.defaults(config, Env.CONFIG_DEFAULTS);

  // check there are no keys in config that aren't in defaults,
  // and that config has all the required keys
  var configKeys = _.keys(config);
  var defaultKeys = _.keys(Env.CONFIG_DEFAULTS);
  var diff = _.difference(configKeys, defaultKeys);

  if (diff.length > 0 || configKeys.length !== defaultKeys.length) {
    dfd.reject(new Error('Env configuration contains unrecognised keys:\n' +
                         diff.join('\n')));
    return promise;
  }

  // check for required variables
  if (!config.androidSDKDir) {
    dfd.reject(new Error('Env configuration: androidSDKDir location ' +
                         'must be specified'));
    return promise;
  }

  if (!config.xwalkAndroidDir) {
    dfd.reject(new Error('Env configuration: xwalkAndroidDir location ' +
                         'must be specified'));
    return promise;
  }

  // get androidAPILevel
  var androidAPILevelPromise;

  if (config.androidAPILevel) {
    androidAPILevelPromise = Q(parseInt(config.androidAPILevel, 10));
  }
  else {
    // find all the directories under "platforms" which match "android-*"
    // and convert into android API level numbers; then select the
    // last (latest) one
    androidAPILevelPromise = self._finder.globFiles(
      stripTrailingSeparators(config.androidSDKDir) + '/platforms/android-*/'
    )
    .then(
      function (directories) {
        var androidAPILevel = null;

        if (directories.length) {
          // get the basename for each (this ensures they can be alpha
          // sorted without path separators causing problems on Windows)
          directories = _.map(directories, path.basename);

          // ensure they are alpha-sorted
          var sorted = directories.sort();

          // take the part after "android-" of the last one in the sorted list
          androidAPILevel = _.last(sorted).match(/android-([\d\.]+)/);

          if (androidAPILevel) {
            androidAPILevel = androidAPILevel[1];
          }
        }

        if (!androidAPILevel) {
          // no platforms/ directories or the last path didn't match
          // "android-", so just take the highest-numbered API level we
          // know about; hopefully this won't happen
          androidAPILevel = _.last(_.keys(apiVersionToAndroidVersion).sort());
        }

        return Q(parseInt(androidAPILevel, 10));
      }
    );
  }

  androidAPILevelPromise
  .then(
    function (androidAPILevel) {
      config.androidAPILevel = androidAPILevel;

      // check that the two main directories exist
      return Q.all([
        self._finder.checkIsDirectory(config.androidSDKDir),
        self._finder.checkIsDirectory(config.xwalkAndroidDir)
      ]);
    }
  )
  .then(
    function () {
      // locate Android SDK pieces
      var androidPiecesPromise = locateAndroidPieces(self._finder, config);

      // locate xwalk pieces
      var xwalkPiecesPromise = locateXwalkPieces(self._finder, config);

      // locate executables and files
      var filesPromise = locateFiles(self._finder, config);

      return Q.all([androidPiecesPromise, xwalkPiecesPromise, filesPromise]);
    }
  )
  .done(
    function (results) {
      // the first result is the Android pieces we want to know about;
      // NB if this is empty, it doesn't overwrite the existing config
      var androidPieces = results[0];
      _.extend(config, androidPieces);

      // second result is the xwalk pieces
      var xwalkPieces = results[1];
      _.extend(config, xwalkPieces);

      // make properties available on the Env object itself
      _.extend(self, config);

      dfd.resolve(self);
    },

    dfd.reject
  );

  return promise;
};

module.exports = Env;
