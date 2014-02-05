/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var _ = require('lodash');
var path = require('path');

// replace invalid characters in the string value;
// if mode === 'package', we don't replace periods
var replaceInvalidChars = function (value, mode) {
  var invalidCharsRegex = /[\\\/:\*\?'"<>\|-\s\!]/g;
  value = value.replace(invalidCharsRegex, '_');

  if (mode !== 'package') {
    value = value.replace(/\./g, '_');
  }

  // replace sequences of two or more underscores with a single underscore
  value = value.replace(/_{2,}/g, '_');

  // remove any trailing underscores
  value = value.replace(/_$/, '');

  return value;
};

/**
 * Representation of an Android xwalk application which can be wrapped
 * in an apk by {@link Env#build}
 * @constructor
 *
 * @param {object} config - App configuration object; NB either
 * appUrl OR (appRoot + appLocalPath)
 * is REQUIRED
 * @param {string} config.name - name of the application; this will be
 * displayed with the app's icon on the device
 * @param {string} config.pkg - package name; your domain name, reversed,
 * plus a unique identifier for the app, is the usual pattern for
 * this, e.g. <em>org.townx.mytestapp</em>
 * @param {string} [config.appUrl] - URL of the application (NOT USED YET)
 * @param {string} [config.appRoot] - root directory of the application,
 * containing all the HTML, CSS, JS and other assets for the application;
 * all the files under this directory will be incorporated into the apk file
 * @param {string} [config.appLocalPath] - location of the application
 * entry HTML page, relative to appRoot
 * @param {string} [config.sanitisedName] - a clean version of the name
 * which can be used for a filename; if not set, it defaults to
 * config.name passed through replaceInvalidChars()
 * @param {string|object} [config.icon] - paths to the icon files
 * for each resolution, e.g.
 * <code>{xhdpi: '...', hdpi: '...', mdpi: '...', ldpi: '...'}</code>;
 * alternatively, a file path which is used for all
 * resolutions; the default is to use the crosswalk.png files in the
 * res/drawable-* directories;
 * NB if supplying multiple files, they should all have the
 * same basename (e.g. myicon.png);
 * see [the Android SDK docs]{@link http://developer.android.com/guide/practices/screens_support.html#support}
 * for details
 * @param {String} [extensions] - object representing extensions,
 * in this format:
 * {
 *   'extensionName':
 *   {
 *     class: 'bar.foo.classname', // Java class name
 *     jsapi: 'foo.js',            // js file which exposes the Java API
 *     permissions: ['android permission string'] // see config.permissions
 *   },
 *   ...
 * }
 * it's best if extensionName is a valid JavaScript variable name;
 * the Java classes required by extensions should be added to the app via the
 * config.jars property (if they are compiled already) or via the
 * config.javaSrcDirs property (if they need to be compiled as part
 * of the build);
 * any permissions you define are merged with config.permissions
 * @param {String[]} [javaSrcDirs] - directories containing .java files
 * which should be compiled and incorporated with the other Java resources
 * in the classes.dex output file
 * @param {String[]} [jars] - paths to jar files to include in the Java
 * resources file classes.dex
 * @param {boolean} [config.remoteDebugging=App.CONFIG_DEFAULTS.remoteDebugging] -
 * set to true to enable remote debugging on the device
 * @param {boolean} [config.fullscreen=App.CONFIG_DEFAULTS.fullscreen] -
 * set to false to run the app in windowed mode
 * @param {string} [config.theme=App.CONFIG_DEFAULTS.theme] - Android
 * theme string, for use in AndroidManifest.xml; this should NOT be
 * set to a fullscreen theme, as this is added automatically if
 * config.fullscreen === true (by appending '.Fullscreen' to config.theme)
 * @param {string[]} [config.permissions=App.CONFIG_DEFAULTS.permissions] -
 * array of Android permissions to set in AndroidManifest.xml; each
 * member ITEM in the array is used to create an element in the manifest like:
 * <code>&lt;uses-permission android:name="android.permission.ITEM"/&gt;</code>
 * see {@link App.CONFIG_DEFAULTS} for details
 * @param {boolean} [config.embedded=App.CONFIG_DEFAULTS.embedded] -
 * set to true to bundle Crosswalk with the output apk file, false
 * to use shared mode (requires XWalkRuntimeLib.apk to installed
 * on the device to run the application)
 * @param {object} [deps] - dependent objects this instance requires
 * @param {Finder} [deps.finder=vanilla Finder] - {@link Finder} object
 * for testing directory and file locations
 *
 * @returns {external:Promise} rejects with an error if one or more
 * validation issues occur, or resolves to the configured {@link App} if
 * validation succeeds
 */
var App = function (config, deps) {
  // enable use of this function as a factory without "new"
  if (!(this instanceof App)) {
    return new App(config, deps);
  }

  deps = deps || {};
  this.finder = deps.finder || require('./finder')();

  return this.configure(config);
};

/**
 * @desc Default values for application properties.
 * Note that all the properties specified here are available
 * as instance variables with the same name on each {@App instance}.
 * For more details about what the properties refer to, see
 * the {@link App} constructor.
 *
 * @member {object} App.CONFIG_DEFAULTS
 *
 * @property {string[]} permissions - set to
 * ['ACCESS_NETWORK_STATE', 'CAMERA', 'INTERNET', 'RECORD_AUDIO',
 * 'WAKE_LOCK', 'WRITE_EXTERNAL_STORAGE']
 * @property {string} theme - set to 'Theme.Holo.Light.NoActionBar'
 * @property {boolean} fullscreen - set to true
 * @property {boolean} remoteDebugging - set to false
 * @property {boolean} embedded - set to false
 */
App.CONFIG_DEFAULTS = {
  name: null,
  sanitisedName: null,
  pkg: null,
  icon: '',
  fullscreen: true,
  theme: 'Theme.Holo.Light.NoActionBar',
  permissions: [
    'ACCESS_FINE_LOCATION',
    'ACCESS_NETWORK_STATE',
    'CAMERA',
    'INTERNET',
    'MODIFY_AUDIO_SETTINGS',
    'RECORD_AUDIO',
    'WAKE_LOCK',
    'WRITE_EXTERNAL_STORAGE'
  ],
  appUrl: null,
  appRoot: null,
  appLocalPath: null,
  remoteDebugging: false,
  jars: [],
  javaSrcDirs: [],
  extensions: null,
  embedded: true
};

/**
 * Get an array of JS file names from the extensions property.
 *
 * @returns {String[]} js file paths
 */
App.prototype.getExtensionsJsFiles = function () {
  var files = [];

  if (this.extensions) {
    _.each(this.extensions, function (ext) {
      files.push(ext.jsapi);
    });
  }

  return files;
};

/**
 * Get an array of permissions for the app; this amalgamates the
 * permissions specified for the app with permissions specified for
 * any extensions it uses.
 *
 * @returns {String[]} Android permissions strings
 */
App.prototype.getPermissions = function () {
  var permissions = this.permissions;

  if (this.extensions) {
    _.each(this.extensions, function (ext) {
      permissions = _.union(permissions, ext.permissions || []);
    });
  }

  return permissions;
};

/**
 * Configure the application with the options in config.
 *
 * @param {object} config - object containing configuration properties;
 * see the {@link App} constructor for details
 *
 * @returns {external:Promise} rejects with an error
 * if one or more validation issues occur, or resolves to the configured
 * {@link App} if validation succeeds
 *
 * @TODO move appRoot and appUrl tests out of here and into Env?
 */
App.prototype.configure = function (config) {
  var self = this;
  var dfd = Q.defer();
  var promise = dfd.promise;

  if (!config) {
    dfd.reject(new Error('App config must be set'));
    return promise;
  }

  // set default values for any missing keys
  _.defaults(config, App.CONFIG_DEFAULTS);

  if (config.fullscreen) {
    config.theme += '.Fullscreen';
  }

  // check keys
  var errors = [];

  if (!config.name) {
    errors.push('name must be set');
  }

  if (!config.pkg) {
    errors.push('pkg must be set');
  }

  if (!(/.+\..+/.test(config.pkg))) {
    errors.push('pkg must contain at least two character sequences ' +
                'separated by a period (.) character, e.g. "foo.bar"');
  }

  // check no sequence within pkg has a period followed by a digit
  // or starts with a digit
  if (/(\.\d|^\d)/.test(config.pkg)) {
    errors.push('pkg must not start with a digit (e.g. "1.org" is BAD) and ' +
                'must have no sequences where a digit follows a period ' +
                'character (e.g. "foo.123" is BAD)');
  }

  var appUrlSet = config.appUrl &&
                  !(config.appLocalPath || config.appRoot);

  var appRootSet = !config.appUrl &&
                   config.appLocalPath &&
                   config.appRoot;

  if (!appUrlSet && !appRootSet) {
    errors.push('one of appUrl OR (appLocalPath AND appRoot) must be set');
  }

  // test that the app can be located
  var appLocated = Q.resolve([true, true]);

  if (appRootSet) {
    appLocated = Q.all([
      this.finder.checkIsDirectory(config.appRoot),
      this.finder.checkIsFile(path.join(config.appRoot, config.appLocalPath))
    ]);
  }

  appLocated.then(
    function (results) {
      var appRootOK = results[0];
      var appLocalPathOK = results[1];

      if (!appRootOK) {
        errors.push('app root ' + config.appRoot + ' is not a directory; ' +
                    'check appRoot');
      }
      else if (!appLocalPathOK) {
        errors.push('expected HTML file at ' + config.appLocalPath +
                    ' does not exist under ' + config.appRoot +
                    '; check appRoot and appLocalPath');
      }

      // throw exception now if errors occurred
      if (errors.length) {
        dfd.reject(new Error('one or more App configuration errors occurred\n' +
                             errors.join('\n')));
      }
      else {
        // clean up the name and pkg properties if set
        config.sanitisedName = config.sanitisedName ||
                               replaceInvalidChars(config.name);
        config.pkg = replaceInvalidChars(config.pkg, 'package');

        // the javaSrcDirs and jars properties for App need converting to
        // arrays if they were passed in as strings
        if (_.isString(config.javaSrcDirs)) {
          config.javaSrcDirs = config.javaSrcDirs.split(',');
        }

        if (_.isString(config.jars)) {
          config.jars = config.jars.split(',');
        }

        // make properties available on the App object
        _.extend(self, config);

        dfd.resolve(self);
      }
    },

    dfd.reject
  );

  return promise;
};

module.exports = App;
