/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// expose the API for users of the library
module.exports = {
  App: require('./src/app'),
  AppSkeleton: require('./src/app-skeleton'),
  ArchiveFetcher: require('./src/archive-fetcher'),
  BuildTools: require('./src/build-tools'),
  CommandRunner: require('./src/command-runner'),
  ConsoleLogger: require('./src/console-logger'),
  Downloader: require('./src/downloader'),
  Env: require('./src/env'),
  Finder: require('./src/finder'),
  Locations: require('./src/locations'),
  PathHelpers: require('./src/path-helpers'),
  Unpacker: require('./src/unpacker'),
  VersionsFetcher: require('./src/versions-fetcher'),
  Wrappers: {
    Aapt: require('./src/wrappers/aapt-wrapper'),
    ApkGen: require('./src/wrappers/apk-gen-wrapper'),
    ApkSign: require('./src/wrappers/apk-sign-wrapper'),
    Dx: require('./src/wrappers/dx-wrapper'),
    Javac: require('./src/wrappers/javac-wrapper')
  },

  // we also expose the version of Q included with this library,
  // as it's useful for synchronising and combining promises when
  // using the API
  Q: require('q')
};
