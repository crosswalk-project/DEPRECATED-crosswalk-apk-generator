/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// fetch the latest beta xwalk-android version ONLY;
// this is used by the other test scripts to figure out where
// xwalkAndroidDir is
var versionsFetcher = require('../../src/versions-fetcher')();
var consoleLogger = require('../../src/console-logger')();

var channel = process.argv[3] || 'beta';

versionsFetcher.getDownloads(channel)
.done(
  function (results) {
    if (results.files.length === 0) {
      consoleLogger.error('NO RESULTS RETURNED!');
      process.exit(1);
    }
    else {
      consoleLogger.write(results.files[0].version);
      process.exit(0);
    }
  },

  function (err) {
    consoleLogger.error('ERROR FETCHING LATEST VERSION');
    consoleLogger.error(err.message);
    consoleLogger.error(err.stack);
    process.exit(1);
  }
);
