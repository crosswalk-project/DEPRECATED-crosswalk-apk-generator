/*jslint node: true*/
/* turn off lint errors caused by http_proxy environment variable */
/* jshint -W106 */
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// script to download an xwalk-android distribution and unpack it
var fs = require('fs');
var nconf = require('nconf');
var _ = require('lodash');
var Q = require('q');

var logger = require('./console-logger')();
var Downloader = require('./downloader');
var HttpClient = require('./http-client');
var ArchiveFetcher = require('./archive-fetcher');
var VersionsFetcher = require('./versions-fetcher');
var generalUsage = require('./usage');

// configure
var opts = {
  urlTemplate: {
    default: 'https://download.01.org/crosswalk/releases/android-' +
             '<%= arch %>/<%= channel %>/crosswalk-<%= version %>-<%= arch %>.zip',
    describe: 'lodash template used to construct the package URL from ' +
              'the arch, channel and version options'
  },

  arch: {
    alias: 'a',
    default: VersionsFetcher.ARCHS[0],
    describe: 'architecture of xwalk-android to download ("' +
              VersionsFetcher.ARCHS.join('", "') +
              '")'
  },

  channel: {
    alias: 'c',
    default: 'beta',
    describe: 'channel to fetch package from ("' +
              VersionsFetcher.CHANNELS.join('", "') +
              '")'
  },

  version: {
    alias: 'v',
    describe: 'version number of the xwalk-android zip file to download; ' +
              'if not specified, the latest package is fetched'
  },

  url: {
    alias: 'u',
    describe: 'full URL of the xwalk-android zip file to download'
  },

  query: {
    alias: 'q',
    describe: 'query the list of available packages for the specified ' +
              'arch or arch+channel'
  },

  json: {
    default: false,
    describe: 'only applicable if using --query; return data about ' +
              'downloads for arch/channel as JSON'
  },

  outDir: {
    alias: 'o',
    default: '.',
    describe: 'directory to download zip file to'
  },

  tarballName: {
    default: 'xwalk_app_template.tar.gz',
    describe: 'name of the xwalk_app_template tarball inside the xwalk-android zip file'
  },

  proxy: {
    describe: 'HTTP proxy to use for queries and downloads (http:// proxies only)',
    defaultDescription: '$http_proxy environment variable'
  },

  help: {
    alias: 'h',
    describe: 'show this help message and exit'
  }
};

nconf.argv(opts);

// parameters to work with
var params = {
  arch: nconf.get('arch'),
  channel: nconf.get('channel'),
  version: nconf.get('version')
};

// proxy configuration
var proxy = nconf.get('proxy') || process.env.http_proxy;

if (proxy) {
  logger.log('using proxy: ' + proxy);
}

// generic error handler
var errorHandler = function (err) {
  logger.error('ERROR; action was aborted; error was:');
  logger.error(err.message);
  logger.error(err.stack);
  process.exit(1);
};

// show parameters used for the fetch or query
var showParams = function (params) {
  if (!nconf.get('url')) {
    logger.log('  architecture = ' + params.arch);
    logger.log('  channel = ' + params.channel);
  }

  if (params.version) {
    logger.log('  version = ' + params.version);
  }

  if (params.url) {
    logger.log('  url = ' + params.url);
  }
};

// build objects
var httpClient = HttpClient({proxy: proxy});
var versionsFetcher = VersionsFetcher({httpClient: httpClient});
var downloader = Downloader({httpClient: httpClient});
var archiveFetcher = ArchiveFetcher({
  downloader: downloader,
  logger: logger
});

// fetch an xwalk-android zip file
var fetch = function () {
  // derive the tarballName and outDir
  var tarballName = nconf.get('tarballName');
  var outDir = nconf.get('outDir');

  var paramsDfd = Q.defer();

  // work out what we're going to download

  // URL is set as an option
  var archiveUrl = nconf.get('url');

  // no url option, but we've got the version, which is enough to build a URL
  if (!archiveUrl && params.version) {
    archiveUrl = _.template(nconf.get('urlTemplate'), params);
  }

  // we already know the archiveUrl
  if (archiveUrl) {
    params.url = archiveUrl;
    paramsDfd.resolve(params);
  }
  // no version specified and no url option, so get the latest version,
  // based on arch and channel
  else {
    versionsFetcher.getDownloads(params.arch, params.channel)
    .done(
      function (results) {
        params.version = results.files[0].version;
        params.url = results.files[0].url;
        return paramsDfd.resolve(params);
      },

      function (err) {
        logger.error('ERROR while retrieving available versions');
        errorHandler(err);
      }
    );
  }

  paramsDfd.promise
  .then(
    function (params) {
      // we now know the download URL, so we can figure out
      // where the downloaded archive is going to end up; this
      // is so we can remove it if this script is manually interrupted;
      // note that the Downloader will remove files which are
      // only partially-downloaded (due to errors) itself
      var outputFile = downloader.getDownloadLocation(params.url, outDir);

      // to capture Ctrl-C key presses so we can clean up broken output files
      process.on('SIGINT', function () {
        if (fs.existsSync(outputFile)) {
          fs.unlink(outputFile);
        }

        process.exit();
      });

      logger.log('fetching xwalk-android using parameters:');
      showParams(params);
      return archiveFetcher.fetch(params.url, tarballName, outDir);
    }
  )
  .done(
    function (xwalkAndroidDir) {
      logger.log('xwalk zip file and app template downloaded and unpacked successfully');
      logger.log('\nxwalkAndroidDir (xwalk_app_template directory inside ' +
                 'unpacked xwalk-android):\n' + xwalkAndroidDir);
      process.exit(0);
    },

    errorHandler
  );
};

var getVersions = function () {
  versionsFetcher.getDownloads(nconf.get('arch'), nconf.get('channel'))
  .done(
    function (results) {
      if (nconf.get('json')) {
        logger.log(JSON.stringify(results, null, 2));
      }
      else {
        logger.log('available xwalk-android versions for:');
        showParams(params);
        logger.log('----------------------------------------');

        var releaseDate;

        _.each(results.files, function (file) {
          releaseDate = JSON.stringify(file.lastModified);
          releaseDate = releaseDate
                        .replace('T', ' ')
                        .replace('.000Z', '')
                        .replace(/"/g, '');

          logger.log('* version: ' + file.version +
                     '; released: ' + releaseDate + '\n' +
                     '  url: ' + file.url);
        });
      }

      process.exit(0);
    },

    errorHandler
  );
};

// MAIN

// help
if (nconf.get('help')) {
  var msg = generalUsage('Download and unpack an xwalk-android tarball', opts);
  logger.log(msg);
  process.exit(0);
}
// query: show all versions for arch and channel
else if (nconf.get('query')) {
  getVersions();
}
// fetch
else {
  fetch();
}
