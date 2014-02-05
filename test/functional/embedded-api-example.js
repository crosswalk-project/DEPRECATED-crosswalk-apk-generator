/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

/*
 * Use the crosswalk-apk-generator API to generate an apk file for an
 * HTML5 app, with xwalk embedded in it.
 *
 * The script assumes that the main entry file for your HTML5 app
 * is called index.html. It will produce an output apk file in
 * ./build/embedded-api-example/Embedded_app.apk
 *
 * Note that you will need to have all the pre-requisites listed
 * in the README to run this, including a downloaded xwalk-android
 * zip file (use xwalk_android_dl to get it).
 */
var path = require('path');

var usage = 'Usage:\nnode ' + path.basename(process.argv[1]) +
            ' <android SDK dir> <xwalk app template dir> <arch> <HTML5 app root>'

// load the crosswalk-apk-generator API
var Api = require('../../index');

// for simplicity, parse options from the command line; but you
// can use whatever sources you wish
var numArgs = process.argv.length;

if (numArgs < 5) {
  console.log(usage);
  process.exit(1);
}

var androidSDKDir = process.argv[numArgs - 4]; // fourth from last arg
var xwalkAndroidDir = process.argv[numArgs - 3]; // third from last arg
var arch = process.argv[numArgs - 2]; // second from last arg
var appRoot = process.argv[numArgs - 1]; // last arg

// set the output directory path
var outDir = path.resolve(path.join(__dirname, 'build/embedded-api-example'));

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
var appConfig = {
  // display name for the app on the device
  name: 'X embedded api example js',

  // package for the app's generated Java files; this works best if
  // you have at least one period character between two character
  // strings, and no digits
  pkg: 'embedded.api.example',

  // path to the directory containing your HTML5 app
  appRoot: appRoot,

  // relative path from appRoot of the entry HTML file for your app
  appLocalPath: 'index.html',

  // make an embedded mode apk
  embedded: true,

  remoteDebugging: true
};

// create a promise for a configured Env object
var envPromise = Api.Env(envConfig, {commandRunner: Api.CommandRunner(true)});

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
    var locations = Api.Locations(app.sanitisedName, app.pkg, env.arch, outDir);

    // show the finalised configuration
    console.log('ENV CONFIGURATION:');
    console.log(env);
    console.log('APP CONFIGURATION:');
    console.log(app);

    // run the build
    return env.build(app, locations);
  }
)
.done(
  // success
  function (finalApk) {
    console.log('\n*** DONE\n    output apk path is ' + finalApk);
  },

  // any errors should fall down to this handler
  function (err) {
    console.log('!!! ERROR');
    console.log(err.stack);
  }
);
