/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

/*
 * Use the crosswalk-apk-generator API to generate an apk file for an
 * HTML5 app with Crosswalk extensions (the one in app-with-extensions/).
 *
 * The extensions are:
 *
 * - DateTimeFormatter
 *   A trivial datetime formatter which uses Java's commons-lang to format
 *   a date passed in via the JavaScript API.
 *
 * - AudioFileLister
 *   A more complex extension which returns ID3 metadata and URIs for
 *   mp3 files on the device. These are then used to build a rudimentary
 *   audio player UI.
 *
 * Note that you will need to have all the pre-requisites listed
 * in the README to run this, including a downloaded xwalk-android
 * zip file (use xwalk_android_dl to get it).
 */
var path = require('path');
var fs = require('fs');

var usage = 'Usage:\nnode ' + path.basename(process.argv[1]) +
            ' <android SDK dir> <xwalk app template dir>'

// load the crosswalk-apk-generator API
var Api = require('../../index');
var logger = Api.ConsoleLogger();

// for simplicity, parse options from the command line; but you
// can use whatever sources you wish
var numArgs = process.argv.length;

if (numArgs < 4) {
  logger.log(usage);
  process.exit(1);
}

var androidSDKDir = process.argv[numArgs - 3]; // third from last arg
var xwalkAndroidDir = process.argv[numArgs - 2]; // second from last arg
var arch = process.argv[numArgs - 1]; // last arg

// set the output directory path
var outDir = path.join(__dirname, 'build/extensions-api-example');

// environment configuration
var envConfig = {
  // path to the root of your Android SDK installation;
  // on Windows, use the path to the sdk directory inside
  // the installation, e.g. 'c:\\android-sdk\\sdk'
  androidSDKDir: androidSDKDir,

  // path to the xwalk_app_template directory; you can either
  // download and unpack this manually, or use the xwalk_android_dl
  // script (part of this project; see the README for details)
  xwalkAndroidDir: xwalkAndroidDir,

  arch: arch
};

// application configuration
var extJsDir = path.join(__dirname, 'app-with-extensions/xwalk-extensions/js');

var appConfig = {
  // display name for the app on the device
  name: 'X extensions api example js',

  // package for the app's generated Java files
  pkg: 'extensions.api.example',

  // path to the directory containing the HTML5 app with extensions
  appRoot: path.join(__dirname, 'app-with-extensions/app'),

  // relative path from appRoot
  appLocalPath: 'index.html',

  // extra Java files to compile
  javaSrcDirs: [
    // Java files for extensions
    path.join(__dirname, 'app-with-extensions/xwalk-extensions/java')
  ],

  // jars which get added to the build path and included in the final
  // output apk file
  jars: [
    // for DateTimeFormatter extension
    path.join(__dirname, 'app-with-extensions/jars/commons-lang3-3.1.jar'),

    // for AudioFileLister extension
    path.join(__dirname, 'app-with-extensions/jars/commons-io-2.4.jar'),
    path.join(__dirname, 'app-with-extensions/jars/gson-2.2.4.jar'),
    path.join(__dirname, 'app-with-extensions/jars/entagged-audioformats-0.15.jar')
  ],

  extensions: {
    dateTimeFormatter: {
      'class': 'my.extensions.app.DateTimeFormatter',
      'jsapi': path.join(extJsDir, 'dateTimeFormatter.js')
    },

    audioFileLister: {
      'class': 'my.extensions.app.AudioFileLister',
      'jsapi': path.join(extJsDir, 'audioFileLister.js')
    },

    echo: {
      'class': 'my.extensions.app.Echo',
      'jsapi': path.join(extJsDir, 'echo.js')
    }
  },

  remoteDebugging: true,

  version: '1.0.0'
};

// create a promise for a configured Env object
var envPromise = Api.Env(envConfig, {commandRunner: Api.CommandRunner()});

// create a promise for a configured App object
var appPromise = Api.App(appConfig);

// use the Q promises library to synchronise the promises, so we
// can create the objects in "parallel"
Api.Q.all([envPromise, appPromise])
.then(
  function (objects) {
    // once the App and Env are constructed, use the Env instance
    // to do a build for the App instance
    var env = objects[0];
    var app = objects[1];

    // set up the locations data for this App
    // create a Locations object, which sets up paths for build artefacts
    var locations = Api.Locations(app, env, outDir);

    // show the finalised configuration
    logger.log('ENV CONFIGURATION:');
    logger.logPublicProperties(env);
    logger.log('APP CONFIGURATION:');
    logger.logPublicProperties(app);

    logger.spinStart();

    // run the build
    return env.build(app, locations);
  }
)
.done(
  // success
  function (finalApk) {
    logger.spinStop();
    logger.log('\n*** DONE\n    output apk path is ' + finalApk);
  },

  // any errors should fall down to this handler
  function (err) {
    logger.spinStop();
    logger.log('!!! ERROR');
    logger.log(err.stack);
  }
);
