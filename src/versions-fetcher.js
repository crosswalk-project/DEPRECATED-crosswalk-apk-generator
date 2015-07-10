/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var _  = require('lodash');
var Q = require('q');

/**
 * Fetcher which queries available versions of Crosswalk Android.
 *
 * @param {object} deps - dependencies.
 * @param {object} [deps.urlFetchFn=fetch.fetchUrl] - function with
 * signature urlFetchFn(url, options, cb); cb has the signature
 * cb(error, meta, body); defaults to {@link external:fetch.fetchUrl}
 */
var VersionsFetcher = function (deps) {
  if (!(this instanceof VersionsFetcher)) {
    return new VersionsFetcher(deps);
  }

  deps = deps || {};

  this.httpClient = deps.httpClient || require('./http-client')();
};

/**
 * @desc Valid channels for Crosswalk Android.
 * @member {object} VersionsFetcher.CHANNELS
 */
VersionsFetcher.CHANNELS = ['stable', 'beta', 'canary'];

/**
 * @desc URL of Crosswalk Android release page.
 * @member {object} VersionsFetcher.DOWNLOADS_URL
 */
VersionsFetcher.RELEASES_URL = 'https://download.01.org/crosswalk/releases/';

/**
 * @desc Template for creating URLs for Crosswalk Android channels pages
 * for a specific architecture (x86 or arm).
 * @member {object} VersionsFetcher.ARCH_URL_TPL
 */
VersionsFetcher.CHANNELS_URL_TPL = VersionsFetcher.RELEASES_URL +
                                   'crosswalk/android/<%= channel %>/';

/**
 * @desc Template for creating URLs for Crosswalk Android release pages
 * for a specific architecture (x86 or arm) and channel (stable, beta,
 * canary).
 * @member {object} VersionsFetcher.CHANNEL_URL_TPL
 */
VersionsFetcher.DOWNLOADS_URL_TPL = VersionsFetcher.CHANNELS_URL_TPL;

// private helper functions
var validate = function (data) {
  var dfd = Q.defer();

  var errors = [];

  if (data.hasOwnProperty('channel') &&
      !_.contains(VersionsFetcher.CHANNELS, data.channel)) {
    errors.push('invalid channel specified');
  }

  if (errors.length > 0) {
    dfd.reject(new Error('validation errors:\n' + errors.join('\n')));
  }
  else {
    dfd.resolve();
  }

  return dfd.promise;
};

// match lines with [DIR] images, and extract name, href and date/time
var lineRegEx = /<img[^>]* alt=\"\[DIR\]\">[^<]*<a\s+href=\"(.+)\">([^<]+)<\/a>\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/;
var crosswalkPackageNameRegex = /^(\d+\.\d+\.\d+\.\d+)\/$/;

// get all the files after the "Parent Directory" link in a standard
// Apache directory index page; returns an array of files, sorted
// so the most recent is first
var parseApacheIndex = function (url, content) {
  content = content.toString();

  // go through all lines, and push lineRegEx matches into
  // an array
  var lines = content.split('\n');
  var files = [];

  for (var i = 0; i < lines.length; i += 1) {
    var thisLine = lines[i];

    var matches = thisLine.match(lineRegEx);

    if (matches) {
      files.push({
        name: matches[2],
        url: url + matches[1],
        lastModified: new Date(matches[3])
      });
    }
  }

  // sort files by date, most recent first
  return _.sortBy(files, 'lastModified').reverse();
};

// get the version string from a xwalk-android filename,
// or null if it's not a valid crosswalk zip file
var getVersionString = function (name) {
  var matches = name.match(crosswalkPackageNameRegex);
  if (matches && matches[1]) {
    return matches[1];
  }
  else {
    return null;
  }
};

/**
 * Fetch a URL with an HTTP GET.
 * @param {string} url Absolute URL to fetch
 * @returns {external:Promise} resolves to the body of the response
 * or rejects with an error.
 */
VersionsFetcher.prototype.getUrl = function (url) {
  return this.httpClient.get(url);
};

/**
 * Get the xwalk-android version numbers for a channel.
 * @param {string} channel Channel; one of VersionsFetcher.CHANNELS
 * @returns {external:Promise} resolves to an object representing
 * the files on the server (most recently modified first),
 * or rejects with an error if the download site is not available.
 *
 * Example output:

 { url: 'http://download.01.org/crosswalk/releases/crosswalk/android/stable/',
   channel: 'stable',
   files:
    [ { name: 'crosswalk-2.31.27.5.zip',
        url: 'https://download.01.org/crosswalk/releases/crosswalk/android/stable/crosswalk-2.31.27.5.zip',
        lastModified: Fri Dec 20 2013 10:18:00 GMT+0000 (GMT),
        version: '2.31.27.5' },
      { name: 'crosswalk-1.29.4.7.zip',
        url: 'https://download.01.org/crosswalk/releases/crosswalk/android/stable/crosswalk-1.29.4.7.zip',
        lastModified: Mon Nov 11 2013 01:17:00 GMT+0000 (GMT),
        version: '1.29.4.7' } ] }

 */
VersionsFetcher.prototype.getDownloads = function (channel) {
  var dfd = Q.defer();
  var self = this;

  var data = {channel: channel};
  var url = null;

  // check channel
  validate(data)
  .then(
    function () {
      url = _.template(VersionsFetcher.DOWNLOADS_URL_TPL, data);
      return self.getUrl(url);
    }
  )
  .then(
    function (content) {
      var entries = parseApacheIndex(url, content);

      entries = _.select(entries, function (entry) {
        entry.version = getVersionString(entry.name);
        if (entry.version) {
          entry.url = entry.url+"crosswalk-"+entry.version+".zip";
        }

        // if no version string, don't include this entry
        return entry.version;
      });

      return {
        type: 'Downloads',
        url: url,
        channel: channel,
        files: entries
      };
    }
  )
  .done(dfd.resolve, dfd.reject);

  return dfd.promise;
};

/**
 * Get the list of xwalk-android channels for the specified architecture.
 * @returns {external:Promise} resolves to an object representing
 * the channels available, or rejects with an error if the
 * download site is not available.
 */
VersionsFetcher.prototype.getChannels = function () {
  var dfd = Q.defer();
  var self = this;

  var data = {};
  var url = null;

  validate(data)
  .then(
    function () {
      url = _.template(VersionsFetcher.CHANNELS_URL_TPL, data);
      return self.getUrl(url);
    }
  )
  .then(
    function (content) {
      var entries = parseApacheIndex(url, content);

      // channel entries returned have trailing slashes for their
      // names, so we remove them so they can easily be used
      // in future queries
      entries = _.map(entries, function (entry) {
        entry.name = entry.name.replace(/\/$/, '');
        return entry;
      });

      return {
        type: 'Channels',
        url: url,
        channels: entries
      };
    }
  )
  .done(dfd.resolve, dfd.reject);

  return dfd.promise;
};

module.exports = VersionsFetcher;
