# Introduction

[Crosswalk](https://crosswalk-project.org) is a web runtime for Android, Tizen, Linux and Windows. It enables a developer to write an HTML5 application and run it on any of Crosswalk's supported platforms.

crosswalk-apk-generator makes it easy to generate an Android apk from an existing HTML5 application, using familiar web developer tools, languages and workflow. The resulting apk, when run in tandem with the Crosswalk Android runtime library, looks and feels like a native app.

crosswalk-apk-generator has been tested on the following platforms:

*   Fedora Core 17 Linux (64bit x86) with node v0.10.17
*   Windows 7 Enterprise (64bit x86) with node v0.10.12

It currently supports Crosswalk-4 and Crosswalk-5.

# Installation

You will need **node** and **npm** installed first.

Then you can install crosswalk-apk-generator with:

    npm install crosswalk-apk-generator

Before you can use it, you'll also need to install [the pre-requisites required to build an Android package](#pre-requisites).

See the [Command-line tools](#command-line-tools) section for usage instructions.

# How Crosswalk works

To run an app on Android using Crosswalk, you need a Crosswalk apk package for the HTML5 application you want to run, installed on the Android device. This has to be generated for each app, and is installed using adb (part of the Android SDK).

Depending on the *mode* you use when building the package, the apk file may or may not be architecture-specific. See the [Embedded vs. shared mode section](#embedded-vs-shared-mode) for details.

# How crosswalk-apk-generator helps

Although scripts for packaging HTML5 apps already exist in [the Crosswalk Android project](https://github.com/crosswalk-project/crosswalk/tree/master/app/tools/android), the aim of this project is to improve the developer experience by:

1.  Replacing the existing Crosswalk Android scripts for apk generation (`make_apk.py` and `customize.py`, primarily, but also some of the Ant scripts).
2.  Providing a library to make integration of apk generation with external tools simpler.
3.  Designing the tools so it's possible to improve their performance and add new features in a systematic way.
4.  Documenting and providing feedback on what's happening when an apk is generated, so it's easier to fix things when they go wrong.

So far, the APIs and scripts provided by this project replicate most of the functionality of the existing Crosswalk Android scripts, with the following exceptions:

*   No support for the `--app-versionCode` option
*   No support for generating an apk from a Crosswalk manifest via a `--manifest` option
*   Icon png files are not crunched using aapt during the build, as they are by `make_apk.py`. However, the crosswalk.png images in the `res/drawable-*` directories have been optimised using [imagemin](https://github.com/ksky521/imagemin) to reduce their size. We leave it to the packager's discretion to optimise their png files if using custom icons.

However, they provide several benefits over the existing Crosswalk Android scripts:

*   More transparent: this library exposes all of the dependencies required to create a Crosswalk Android apk file, shows you what they are, and clearly tells you when they're missing or can't be found.
*   More modular: the design enables the code to be more easily reused by third parties, as it provides an API for apk generation which is independent of command-line scripts (albeit still dependent on external command-line tools).
*   Better documented: the code is thoroughly commented to enable other developers to see what's happening when an apk is generated; the scripts can also provide feedback about which commands are being run when.

# Pre-requisites

Unfortunately, building a Crosswalk Android apk still requires a lot of dependencies:

*   **Android SDK** for your platform from http://developer.android.com/sdk/index.html.

    Once you've got the Android SDK, run the SDK manager (`SDK Manager.exe` on Windows, `android` on Linux). Then install the **Android SDK Build-tools, version 19**. Note that while you *may* use other versions of the SDK build tools, these are the ones known to work.

*   **xwalk-android** distribution from https://download.01.org/crosswalk/releases/. Choose the right architecture for your Android device (x86 or arm).

    You can use the `xwalk_android_dl` script to fetch and unpack a Crosswalk Android distribution: see below for details.

*   **Java JDK**. Once installed, make sure you set the `JAVA_HOME` environment variable. It will also make life easier if you put the `javac` and `jarsigner` binaries on your PATH.

*   **Apache Ant**. Again, after installation, ensure that the `ant` binary is on your PATH.

*   If you want to distribute apks via an Android app store, you will need your own keystore. You can set this up using the Java `keytool` application. If you're only debugging your application, you can use the built-in xwalk-android keystore, which crosswalk-apk-generator will use by default.

Note that `xwalk_android_dl` has no dependencies other than `node` (and some third party node libraries).

# Command-line tools

## xwalk_android_dl: fetch and unpack xwalk-android

The `xwalk_android_dl` script downloads and unpacks a Crosswalk Android distribution, including the `xwalk_app_template.tar.gz` tarball (required to build a Crosswalk apk).

You can invoke it without any arguments to fetch the latest x86 beta of Crosswalk Android to the current directory:

    xwalk_android_dl

Though the beta channel is the default, you can download the latest version from a different channel with:

    xwalk_android_dl --channel canary

Pass the `--arch` option to download the latest version for a particular architecture (if not set, the default is `x86`):

    xwalk_android_dl --arch arm --channel canary

Alternatively, you can specify an architecture and/or channel and/or version, and the script will figure out the package to download. Note that in this example, a different output directory (`build`) is specified:

    xwalk_android_dl --version 2.31.23.0 \
      --arch arm --channel canary --outDir build

Finally, you can specify a package to download by absolute URL:

    xwalk_android_dl --url https://download.01.org/crosswalk/releases/android/canary/crosswalk-3.31.34.0.zip

Once the package has been downloaded and unpacked, the location of `crosswalkAndroidDir` is shown. You can use this path when invoking the `xwalk_apkgen` tool (see below) to tell it where to find the `xwalk_app_template` directory.

If you're not sure which versions are available, you can invoke the script with `--query` to see a list. For example, to see the versions in the stable channel for x86:

    xwalk_android_dl --query --channel stable --arch x86

Using the `--query` option with `--json` will output the query results in JSON format instead of the default human-readable format.

The script also supports proxies (though it's only been tested with plain http proxies, and not with https ones). To use a proxy, pass the `--proxy` option, for example:

    xwalk_android_dl --query --proxy https://myproxy.com:8080

Note that if you have set the standard `http_proxy` environment variable, the script will use it by default.

To see the full range of options, invoke the script with the `--help` option.

## xwalk_apkgen: create an apk

The `xwalk_apkgen` script (in the `bin` directory) builds a Crosswalk apk file from an existing HTML5 project. To run it, you will need all of the pre-requisites outlined above.

Apk generation can be configured in a variety of ways (with command-line options, and/or environment variables, and/or JSON files). To see all the available options, invoke `xwalk_apkgen` with the `--help` flag.

In most simple cases, you only need to specify a few options, like this:

    xwalk_apkgen --androidSDKDir <android SDK directory> \
      --xwalkAndroidDir <xwalk-android template directory> \
      --appRoot <path to HTML5 application directory> \
      --appLocalPath <main HTML file relative to app-root> \
      --name <app name> \
      --package <app Java package> \
      --version <app version> \
      --outDir <output directory>

For example, given this Linux environment:

*   Android SDK directory = "/home/me/android-sdk-linux"
*   xwalk-android template directory = "/home/me/xwalk-android/xwalk_app_template"
    (Note that this is the directory location displayed by `xwalk_android_dl`; see above for details.)
*   path to HTML5 application = "/home/me/projects/myapp"
*   main HTML file = "index.html"
*   application name = "My app"
*   Java package = "me.myname.myapp"
*   application version = "0.0.1"
*   output directory = "build"

the command would be:

    xwalk_apkgen --androidSDKDir /home/me/android-sdk-linux \
      --xwalkAndroidDir /home/me/xwalk-android/xwalk_app_template \
      --appRoot /home/me/projects/myapp \
      --appLocalPath index.html \
      --name "My app" \
      --package "me.myname.myapp" \
      --version 0.0.1 \
      --outDir build

This produces an apk file in the output directory you specified. The name of the output file is based on the `--name` you specified, with any path-sensitive characters replaced (whitespace, forward slashes etc.). In the example given, the final output apk would be in `build/My_app.apk`. All the intermediate files produced during the build will also be in the `build` directory.

Note that the output directory is _not_ automatically cleaned before the build runs (to prevent accidental deletion of files). The recommended approach is to remove the content of the build directory before each run, to ensure the results are "clean". If `outDir` does have files in it, the `xwalk_apkgen` script will overwrite any which relate to the apk build.

As an alternative, you could put your app options into an `app.config.json` JSON file like this:

    {
      "appRoot": "/home/me/projects/myapp",
      "appLocalPath": "index.html",
      "name": "My app",
      "package": "me.myname.myapp",
      "version": "0.0.1"
    }

and then, specifying the Android SDK directory using an environment variable, do the same build with:

    androidSDKDir=/home/me/android-sdk-linux xwalk_apkgen -o build \
      -x /home/me/xwalk-android/xwalk_app_template \
      --app-config app.config.json

(NB short versions of some command-line options are also available: see `--help` for details.)

# Embedded vs. shared mode

Crosswalk applications can run in one of two *modes*:

*   *Shared mode* (the default)

    An application in this mode uses a shared copy of the Crosswalk runtime library. This library has to be installed on the Android system via a platform-specific apk file before the application apk is installed. Note that in this case, the application apk is platform-independent, as it contains no native libraries.

    Note that the Crosswalk runtime library is not available from the Android store, so this mode is only suitable for use by developers, or in situations where the library can easily be made available on the target platform. If a shared mode application is installed on a device without the runtime library, the user will just see a message instructing them to install it.

    If you want to use shared mode, you can find the runtime library apk in the Crosswalk Android distribution. The file you need is `apks/XWalkRuntimeLib.apk`. Install it with:

        adb install <path to xwalk-android>/apks/XWalkRuntimeLib.apk

    (NB `adb` is the Android SDK installation tool; you will need it on your PATH for the above to work.)

    The generator will build an application in shared mode if you don't specify any architecture. Specify the architecture by setting the `arch` property (if using the API) or the `--arch` option (if using `xwalk_apkgen`).

*   *Embedded mode*

    An application in this mode includes the Crosswalk runtime inside its apk. Consequently, an embedded mode application is self-contained: it can be installed on an Android device without requiring the runtime library to be installed first. However, embedded mode apk files are platform-specific, unlike shared mode apk files: they will only work on the platform for which they were built.

    The default application mode can be modified by setting the `arch` property for the application to either `x86` or `arm`. This can be done in the App config if using the API, e.g.

    {
      "appRoot": "/home/me/projects/myapp",
      "appLocalPath": "index.html",
      "name": "My app",
      "package": "me.myname.myapp",
      "arch": "x86"
    }

or via the `--arch` command line flag if using `xwalk_apkgen`:

    xwalk_apkgen --androidSDKDir /home/me/android-sdk-linux \
      --xwalkAndroidDir /home/me/xwalk-android/xwalk_app_template \
      --appRoot /home/me/projects/myapp \
      --appLocalPath index.html \
      --name "My app" \
      --package "me.myname.myapp" \
      --outDir build \
      --arch x86

# Permissions

Application permissions can be specified by passing a `permissions` property as part of the App config, e.g.:

    {
      "appRoot": "/home/me/projects/myapp",
      "appLocalPath": "index.html",
      "name": "My app",
      "package": "me.myname.myapp",
      "permissions": ["ACCESS_NETWORK_STATE", "INTERNET"]
    }

At build time, appropriate permissions are inserted into the `AndroidManifest.xml` file as permissions on the component; e.g. the above would yield the following elements inside the main `<manifest>` element:

    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-permission android:name="android.permission.INTERNET"/>

The default permissions (if you don't specify any) are:

*   `ACCESS_FINE_LOCATION`
*   `ACCESS_NETWORK_STATE`
*   `CAMERA`
*   `INTERNET`
*   `MODIFY_AUDIO_SETTINGS`
*   `RECORD_AUDIO`
*   `WAKE_LOCK`
*   `WRITE_EXTERNAL_STORAGE`

[The full list of available permissions is on the Android developer website](http://developer.android.com/reference/android/Manifest.permission.html).

# Crosswalk extensions

crosswalk-apk-generator supports the inclusion of Java extensions in your apk package. These extensions can expose functionality to an application which is not available from Crosswalk itself. Examples might include using the Android APIs to access music files or photos on the device, or accessing sensors which are not exposed via Crosswalk APIs.

A Crosswalk extension is comprised of:

*   A Java class which subclasses [`XWalkExtensionClient`](https://github.com/crosswalk-project/crosswalk/blob/master/app/android/runtime_client/src/org/xwalk/app/runtime/extension/XWalkExtensionClient.java). This means overriding one or two methods, as shown in the example below.

        package my.extensions.app;

        import org.xwalk.app.runtime.extension.XWalkExtensionClient;
        import org.xwalk.app.runtime.extension.XWalkExtensionContextClient;

        public class Echo extends XWalkExtensionClient {
          public Echo(String name, String jsApiContent, XWalkExtensionContextClient context) {
            super(name, jsApiContent, context);
          }

          @Override
          public void onMessage(int instanceId, String message) {
            postMessage(instanceId, "From java: " + message);
          }

          @Override
          public String onSyncMessage(int instanceId, String message) {
            return "From java sync: " + message;
          }
        }

    Note that if you only require a synchronous API, you only need to override `onSyncMessage()`; similarly, if you only want an asynchronous API, just override `onMessage()`.

    You can either pre-bundle your Java classes into .jar files (see below); or include them in crosswalk-apk-generator's build by passing a `javaSrcDirs` property to the App configuration. This can either be done in an App's JSON configuration file:

        {
          "appRoot": "/home/me/myapp/app",
          "appLocalPath": "index.html",
          "name": "My app",
          "package": "me.myname.myapp",
          "javaSrcDirs": ["/home/me/myapp/extensions/java"],
          ...
        }

    Or as a comma-separated string on the `xwalk-apkgen` command line:

        xwalk_apkgen -o build \
        -a /home/me/android-sdk-linux \
        -x /home/me/xwalk-android/xwalk_app_template \
        --appRoot /home/me/myapp/app \
        --appLocalPath index.html \
        --name "My app" --package "me.myname.myapp" \
        --javaSrcDirs "/home/me/myapp/extensions/java" ...

*   Helper Java classes specific to your application. These should be either be included as jar files (see below) or via the `javaSrcDirs` property (see above).

*   Java jar files containing 3rd party code or your own pre-packaged class files. You can include these via a `jars` property in the App's JSON configuration file:

        {
          "appRoot": "/home/me/myapp/app",
          "appLocalPath": "index.html",
          "name": "My app",
          "package": "me.myname.myapp",
          "javaSrcDirs": ["/home/me/myapp/extensions/java"],
          "jars": [
            "/home/me/myapp/jars/commons-lang.jar",
            "/home/me/myapp/jars/commons-io.jar"
          ]
        }

    Or via a comma-separated list on the command line:

        xwalk_apkgen -o build \
        -a /home/me/android-sdk-linux \
        -x /home/me/xwalk-android/xwalk_app_template \
        --appRoot /home/me/myapp/app \
        --appLocalPath index.html \
        --name "My app" --package "me.myname.myapp" \
        --javaSrcDirs /home/me/myapp/extensions/java \
        --jars "/home/me/myapp/jars/commons-lang.jar,/home/me/myapp/jars/commons-io.jar" \
        ...

    Note that if you are building your project using Maven, Ivy or similar, you can just point at jar files and not set `javaSrcDirs`: compiling your Java classes as part of the apk build is not obligatory.

*   A JavaScript file which calls the Java class's methods, for example:

        var callbacks = [];

        extension.setMessageListener(function (msg) {
          // each callback only gets invoked once; we delete it after
          // calling it
          for (var i = 0; i < callbacks.length; i += 1) {
            callbacks[i](msg);
            delete callbacks[i];
          };
        });

        exports.echo = function (msg, callback) {
          callbacks.push(callback);
          extension.postMessage(msg);
        };

        exports.echoSync = function (msg) {
          return extension.internal.sendSyncMessage(msg);
        };

    *Note: The above is not a good design for an asynchronous API, as all currently-registered callbacks receive whatever happens to be the next posted message. However, this can only be worked around by adding a lot more complexity (e.g. including a message ID with each message posted to the extension, which is associated with the correct callback for the response). I haven't included that here as it would add too much complexity.*

    The JavaScript files for extensions can be maintained in any directory, but it makes most sense if they are separated from the client-side JavaScript code required by your HTML5 app. At build time, they are copied into a directory with a unique generated name, so they don't interfere with or overwrite your client-side code.

*   Configuration to associate JavaScript files with Java classes, and optionally specify extra permissions that extensions need. For example:

        {
          "echo": {
            "class": "my.extensions.app.Echo",
            "jsapi": "xwalk-extensions/js/echo.js",
            "permissions": [
              "...Android permission string...",
              "...Android permission string..."
            ]
          }
        }

    This configuration can either be included in the App configuration (if you're using the API), using the `extensions` property; or it can be put in a JSON file and passed to the `xwalk_apkgen` tool using the `--ext-config` option.

    If you use a file, the `jsapi` paths in the file are resolved relative to the location of the JSON file before use, so that the JavaScript files can be correctly located.

    At build time, a configuration file is generated in `assets/extensions-config.json`, based on your extensions configuration, but in the format required by Crosswalk. In addition, any permissions you defined for extensions are merged with any application-level permissions; these are then inserted in the generated `AndroidManifest.xml` file. See the **Permissions** section (above) for details about the valid permission strings.

## Comparison with make_apk.py

Note that this approach to extensions differs from the approach taken by the official Crosswalk `make_apk.py` script. The official script requires extensions to be placed in directories with a particular structure and naming scheme. It also requires that extensions be packaged into jar files before the apk package can be generated.

By contrast, crosswalk-apk-generator enables a more integrated workflow, allowing you to work on Java code alongside JavaScript code, compile that code, then package any output .class files and 3rd party jar dependencies with the apk in a single step. A complete example of how to structure an application with custom extensions (including the example above) is given in `test/functional/app-with-extensions`. You can build this application using the `test/functional/make-app-with-extensions.test.sh` script.

If desired, pre-built extensions (structured the way `make_apk.py` wants them) could still be added to an apk, by pointing crosswalk-apk-generator at the extension jar files, and writing a JSON configuration to "wire" their Java classes to JavaScript files. For example:

TODO how to use pre-packaged extensions

# Using your own keystore

TODO
http://developer.android.com/tools/publishing/app-signing.html provides instructions on using keytool

# Using the API

Use of the API is documented in HACKING.md.

# Contributing

## Bugs

TODO

## Patches

TODO

# Licence

[Apache v2](http://opensource.org/licenses/Apache-2.0); see the LICENCE-APACHE-V2 file in the source for details.

The app provided for testing purposes in `test/functional/demo-app` is a built version of the SweetSpot game from https://github.com/01org/webapps-sweetspot, released under the Apache v2 license.

The app for demonstrating Android Crosswalk extensions in `test/functional/app-with-extensions` includes Java jar files from the following projects:

*   Apache commons-io

    http://commons.apache.org/proper/commons-io/

    Licence: Apache v2

*   Apache commons-lang

    http://commons.apache.org/proper/commons-lang/

    Licence: Apache v2

*   Google gson

    https://code.google.com/p/google-gson/

    Licence: Apache v2

*   entagged

    http://entagged.sourceforge.net/developer.php

    Licence: LGPL

# Authors

Elliot Smith ([townxelliot](https://github.com/townxelliot))

The original authors of the `make_apk.py` script (which this work is based on) can be found by looking at [the Crosswalk project's AUTHORS file](https://github.com/crosswalk-project/crosswalk/blob/master/AUTHORS).
