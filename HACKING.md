# The API

The intention is to provide clean APIs so that this project can be used as a library, as well as a set of command-line tools.

The main classes you need to know about for building apks:

*   _Env:_ Records data about the environment; acts as a BuildTools factory; the main entry point for starting a build.
*   _App:_ Representation of a Crosswalk application which can be built into an apk file.
*   _Locations:_ Defines where to place build artefacts (generate .java files, compiled .class files, AndroidManifest.xml). This is kept separate from the Env so that a single Env instance can potentially be used to build apks for different Apps.

Other classes in the API:

*   _AppSkeleton:_ Contains methods for copying the files required by an App, creating required directories, and running templates for the manifest and generated .java files.
*   _CommandRunner:_ Wraps execution of commands in the shell.
*   _Finder:_ Provides methods for finding executables and other files on a filesystem. It is used to locate binaries, scripts and jar files required for an apk build.
*   _BuildTools:_ Factory for the wrappers required in a standard apk build.
*   _ArchiveFetcher:_ Fetches and unpacks xwalk-android zip files.
*   _Downloader:_ Fetches files via HTTP.
*   _Unpacker:_ Unpacks zip, tar, tar.gz and tgz archives.

These latter classes are mostly utility and helper classes which you shouldn't need to use, unless you want to do fine-grained customisation or work on internals of the main classes.

The main classes are explained in more detail below.

## Promises

The API uses promises extensively, to enable better synchronisation between build steps, and to enable them to be run in parallel where practical. Many of the methods on the API return promises.

Internally, the [Q](https://github.com/kriskowal/q) library is used as the promises implementation. However, this is exposed on the API so that you can make use of it without having to import it into your project. You can access it as follows:

    // import the crosswalk-apk-generator API
    var Api = require('crosswalk-apk-generator');

    // the Q object is accessible from Api
    var Q = Api.Q;

An example of how to use it is given in the next section.

# Using the API to make an apk

The `src/xwalk-apkgen.js` module is a full example of how to use the API to build apks. This example is a minimal version of it; the full source is in test/functional/simple-api-example.js._

First, import the crosswalk-apk-generator API and set an output directory for the build:

    var Api = require('../../index');
    var outDir = 'build';

The `Locations` object contains information about all the paths required for build artefacts, relative to the `outDir` used to construct it.

Next, define the configuration for the application. The full range of configuration options (and what they are for) is described in the API docs for `src/app.js`; but you can create a simple build with four properties:

    var appConfig = {
      // display name for the app on the device;
      // the sanitisedName used to construct the Locations object later
      // is derived from this
      name: 'My test app',

      // package for the app's generated Java files; this works best if
      // you have at least one period character between two character
      // strings, and no digits
      pkg: 'my.test.app',

      // path to the directory containing your HTML5 app;
      // note that this must use the correct path separators for your
      // platform: Windows uses '\\' while Linux uses '/'
      appRoot: '/me/path/to/my/app',

      // relative path from appRoot of the entry HTML file for your app
      appLocalPath: 'index.html'
    };

Now define the configuration for the environment. Only two properties are required:

    var envConfig = {
      // path to the root of your Android SDK installation;
      // on Windows, use the path to the sdk directory inside
      // the installation, e.g. 'c:\\android-sdk\\sdk'
      androidSDKDir: '/me/apps/android-sdk-linux',

      // path to the xwalk_app_template directory; you can either
      // download and unpack this manually, or use the xwalk_android_dl
      // script to do so (part of this project; see the README for details);
      // note that path separators specific to your platform must be used
      xwalkAndroidDir: '/me/apps/xwalk-android/xwalk_app_template'
    };

Now we have the configuration, we can build the App and Env objects and run a build:

    // create a promise for a configured Env object
    var envPromise = Api.Env(envConfig);

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

        // create a Locations object for this App instance
        var locations = Api.Locations(app.sanitisedName, app.pkg, outDir);

        // show the finalised configuration
        console.log('ENV CONFIGURATION:');
        console.log(env.config);
        console.log('APP CONFIGURATION:');
        console.log(app.config);

        // run the build
        return env.build(app, locations);
      }
    )
    .done(
      // success
      function (finalApk) {
        console.log('\n*** DONE\n    output apk path is ' + finalApk);
      },

      // error handler
      function (err) {
        console.log('!!! ERROR');
        console.log(err.stack);
      }
    );

When you create the `Env` object, it will attempt to locate the required jarfiles, scripts and executables required for the build. If any are missing, the error handler passed to `done()` should highlight them.

Similarly, when you create the `App` object, the configuration is checked and any errors highlighted.

Once both are successfully created, the build can be invoked via the `Env.build()` method. If any errors occur now, the error handler is invoked; if the build is successful, you should see the `DONE` message.

# Functional tests

The tests in `test/functional` run the command-line tools and the API to build apk files. They can be used to do a quick smoke test of your setup. By default, the apk files built are for the ARM architecture, but you can change this by downloading a different version of the Crosswalk Android: see below for details.

Note that the demo applications are built in **embedded** mode, so you do not need to install the xwalk runtime library for them to work (see README.md for more details about shared vs. embedded mode). They can just be installed with the `adb` command line tool, e.g.

    adb install build/make_apk/X_make_apk_test_sh.apk

All of the built apk files have an "X" prefix, so they should be grouped together in your device's launcher after installation.

A script to run all of the functional test scripts is also available. Run this from the root directory of the project with:

    androidSDKDir=/path/to/android/sdk ./test/functional/all.sh

Note: this requires that you have `bash` installed on your system.

## Testing other architectures

If you want to run the functional tests, but also want to make apk files for a different architecture, you can do this by downloading a custom version of Crosswalk Android first. For example, to build for x86, do this before you run any of the functional tests:

    cd test/functional
    ../../bin/xwalk_android_dl -v 3.32.50.0 -a x86

Now, when you run the tests, they will use your custom version of Crosswalk Android, instead of downloading the default ARM version.

Note that the version number shown should be used, otherwise the `*.sh` scripts won't work. But the `*.js` scripts can be run individually against any downloaded Crosswalk Android distribution you have, by passing its location to the script (see below for details).

## make_apk.test.sh

This script downloads a recent Crosswalk Android zip distribution, unpacks it, then uses it to generate an apk file from a small demo app.

To run it, you'll need a checkout of the full source for this project. You will also need to have `bash` installed.

Then, from a command prompt:

    cd test/functional
    androidSDKDir=<path to your Android SDK> ./make_apk.test.sh

This will download a recent xwalk-android, unpack it, then build a small app from the `test/functional/demo-app` directory, putting the apk file in `build/make_apk/X_make_apk_test_sh.apk`.

## make-apk-with-extensions.test.sh

TODO

## simple-api-example.js

This example builds an apk file from an HTML5 application.

The example only needs `node` to run, but does require you to have downloaded and unpacked a Crosswalk Android zip file yourself (the script won't do it for you). You can use the `bin/xwalk_android_dl` tool to do this (see README.md for details).

Once you've got the pre-requisites in place, do:

    node simple-api-example.js <android SDK dir> <xwalk app template dir> <HTML5 app root>

The output apk file is written to `build/simple-api-example/X_simple_api_example_js.apk`.

## extensions-api-example.js

TODO

## embedded-api-example.js

TODO

# Unit tests

To run the unit test suite, from the root of the project do:

    grunt

This will lint the source files under `src` and run the unit tests in `test/unit`.

You can produce a coverage report with:

    grunt cov

The output coverage report file is placed in the `build` directory and time-stamped. It's an HTML page, so best viewed in a web browser.

# Documentation

The API documentation for the project is created with the grunt task:

    grunt docs

The output goes into the `build/docs` directory.
