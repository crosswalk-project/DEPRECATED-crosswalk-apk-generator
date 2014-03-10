/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var start = new Date();

var fs = require('fs');
var path = require('path');

var nconf = require('nconf');
var Q = require('q');
var _ = require('lodash');

var CommandRunner = require('./command-runner');
var Locations = require('./locations');
var Env = require('./env');
var App = require('./app');
var genericUsage = require('./usage');

// show usage message
var usage = function (cliOpts) {
  var msg = 'Generate a Crosswalk apk from an HTML5 app\nOptions ' +
            'can be set with environment variables, using command ' +
            'line options, or via JSON config files (see General ' +
            'options below).';

  console.log(genericUsage(msg, cliOpts));
};

/*
 * parse environment variables, then command line options,
 * then properties from JSON files set with --app-config and/or
 * --env-config; environment variables have precedence over properties
 * set on the command line, which in turn take precedence over file
 * properties
 *
 * note that although were using nconf to parse the cli options,
 * the actual validation of the properties for App and Env occurs in
 * those classes; also note that the "section" property is not used
 * by nconf, only internally by this script
 *
 * the default is from nconf, but defaultDescription is used in some
 * cases to describe a default value which is going to be derived
 * from the environment (e.g. the default keystore is the one
 * in whichever xwalk-android you downloaded and is not known until
 * processing starts)
 */
var cliOpts = {
  // runtime
  'outDir': {
    alias: 'o',
    default: 'build',
    describe: 'output directory for apk and other build files'
  },

  'verbose': {
    alias: 'v',
    default: false,
    describe: 'set to true to show shell commands'
  },

  // config files; these work as shortcuts for defining app,
  // env or extension configuration
  'app-config': {
    describe: 'configuration JSON file for (app) options'
  },

  'env-config': {
    describe: 'configuration JSON file for (env) options'
  },

  'ext-config': {
    describe: 'configuration JSON file for Crosswalk extensions'
  },

  // env required (if no env-config file)
  'androidSDKDir': {
    alias: 'a',
    describe: 'root directory of the Android SDK installation',
    section: 'Environment (env)'
  },

  'xwalkAndroidDir': {
    alias: 'x',
    describe: 'xwalk_app_template directory inside an ' +
              'xwalk-android download',
    section: 'Environment (env)'
  },

  // env optional
  'androidAPILevel': {
    alias: 'android-api-level',
    describe: 'level of the Android API to use (e.g. 18, 19)',
    section: 'Environment (env)',
    default: Env.CONFIG_DEFAULTS.androidAPILevel
  },

  'keystore': {
    alias: 'keystore-path',
    describe: 'path to the JKS keystore to use for apk signing',
    section: 'Environment (env)',
    defaultDescription: 'debug keystore in xwalk-android download'
  },

  'keystoreAlias': {
    alias: 'keystore-alias',
    describe: 'alias for the signing key entry in the keystore',
    section: 'Environment (env)',
    default: Env.CONFIG_DEFAULTS.keystoreAlias
  },

  'keystorePassword': {
    alias: 'keystore-passcode',
    describe: 'password for the signing key entry in the keystore',
    section: 'Environment (env)',
    default: Env.CONFIG_DEFAULTS.keystorePassword
  },

  'arch': {
    describe: 'Architecture to build for (x86 or arm)',
    section: 'Environment (env)',
    default: Env.CONFIG_DEFAULTS.arch
  },

  // app required (if no app-config file)
  'appRoot': {
    alias: 'app-root',
    describe: 'root directory containing application files',
    section: 'Application (app)'
  },

  'appLocalPath': {
    alias: 'app-local-path',
    describe: 'path from app root to main HTML file for app',
    section: 'Application (app)'
  },

  'name': {
    describe: 'application name',
    section: 'Application (app)'
  },

  'pkg': {
    alias: 'package',
    describe: 'package for application Java classes',
    section: 'Application (app)'
  },

  'version': {
    describe: 'application version string (e.g. "1.0.0")',
    section: 'Application (app)'
  },

  // app optional
  'orientation': {
    describe: 'orientation for the application (e.g. "portrait", "landscape")',
    section: 'Application (app)'
  },

  'icon': {
    describe: 'path to the icon file for the application',
    section: 'Application (app)',
    defaultDescription: 'Crosswalk default icon'
  },

  'fullscreen': {
    describe: 'run app in fullscreen on the device',
    section: 'Application (app)',
    default: App.CONFIG_DEFAULTS.fullscreen
  },

  'remoteDebugging': {
    alias: 'enable-remote-debugging',
    describe: 'add code to switch on debugging for the app on the device',
    section: 'Application (app)',
    default: App.CONFIG_DEFAULTS.remoteDebugging
  },

  'javaSrcDirs': {
    describe: 'comma-separated list of Java source directories to compile',
    section: 'Application (app)',
    default: App.CONFIG_DEFAULTS.javaSrcDirs
  },

  'jars': {
    describe: 'comma-separated list of jars to bundle into the apk file',
    section: 'Application (app)',
    default: App.CONFIG_DEFAULTS.jars
  },

  'mode': {
    describe: '"shared" to use the shared xwalk runtime library; "embedded" ' +
              'to bundle the library with the app (NB this is retained for ' +
              'backwards compatibility with make_apk.py)',
    section: 'Application (app)',
    default: (App.CONFIG_DEFAULTS.embedded === true ? 'embedded' : 'shared')
  },

  'embedded': {
    describe: 'set to true to enable embedded mode',
    section: 'Application (app)'
  },

  // help
  'help': {
    alias: 'h',
    describe: 'show this help message and exit'
  }
};

nconf.env().argv(cliOpts);

if (nconf.get('help')) {
  usage(cliOpts);
  process.exit(0);
}

// application config
var configFile = nconf.get('app-config');

if (configFile) {
  nconf.file('appConfig', {file: configFile});
}

// env config
configFile = nconf.get('env-config');

if (configFile) {
  nconf.file('envConfig', {file: configFile});
}

// if ext-config is set, read the JSON file in
configFile = nconf.get('ext-config');

var extensions = null;
if (configFile) {
  extensions = JSON.parse(fs.readFileSync(configFile));

  // resolve all jsapi paths wrt the location of the extensions
  // config JSON file
  _.each(extensions, function (ext) {
    ext.jsapi = path.join(path.dirname(configFile), ext.jsapi);
  });
}

// we need an absolute location for outDir to avoid errors when
// running Ant
var outDir = path.resolve(nconf.get('outDir'));

var verbose = nconf.get('verbose');
/*** end of property parsing ***/

// get the properties for App
var appConfig = {};
_.each(App.CONFIG_DEFAULTS, function (value, key) {
  appConfig[key] = nconf.get(key);
});

// set the extensions key for appConfig
appConfig.extensions = extensions;

// set the mode for the app
appConfig.embedded = nconf.get('embedded');
if (appConfig.embedded === undefined) {
  appConfig.embedded = (nconf.get('mode') === 'embedded');
}

// get properties for Env
var envConfig = {};
_.each(Env.CONFIG_DEFAULTS, function (value, key) {
  envConfig[key] = nconf.get(key);
});

// START
console.log('\n*** STARTING BUILD');

var commandRunner = CommandRunner(verbose);

console.log('\n*** CHECKING ENVIRONMENT...');

// App and Env are created asynchronously in parallel
Q.all([
  App(appConfig),
  Env(envConfig, {commandRunner: commandRunner})
])
.then(
  function (objects) {
    var app = objects[0];
    var env = objects[1];

    var locations = Locations(app.sanitisedName, app.pkg, env.arch, outDir);

    // configuration done
    console.log('\n*** APPLICATION:');
    console.log(app);
    console.log('\n*** ENVIRONMENT:');
    console.log(env);
    console.log('\n*** LOCATIONS:');
    console.log(locations);

    // make the apk for this environment
    console.log('\n*** CREATING APPLICATION SKELETON IN ' + outDir);

    return env.build(app, locations);
  }
)
.done(
  function (finalApk) {
    var end = new Date();
    var msecs = end.getTime() - start.getTime();
    var secs = (msecs / 1000);
    console.log('\n*** DONE\n*** BUILD TIME: ' + secs + ' seconds\n' +
                '*** Final output apk:\n    ' + finalApk);
  },

  function (e) {
    console.error('!!!!!!! error occurred');
    console.log();
    console.error(e.stack);
    console.log();
    console.log('show options by calling this script with the --help option');
    process.exit(1);
  }
);
