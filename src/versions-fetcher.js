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
 * @desc Valid architectures for Crosswalk Android.
 * @member {object} VersionsFetcher.ARCHS
 */
VersionsFetcher.ARCHS = ['x86', 'arm'];

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
                                   'android-<%= arch %>/';

/**
 * @desc Template for creating URLs for Crosswalk Android release pages
 * for a specific architecture (x86 or arm) and channel (stable, beta,
 * canary).
 * @member {object} VersionsFetcher.CHANNEL_URL_TPL
 */
VersionsFetcher.DOWNLOADS_URL_TPL = VersionsFetcher.CHANNELS_URL_TPL +
                                    '<%= channel %>/';

// private helper functions
var validate = function (data) {
  var dfd = Q.defer();

  var errors = [];

  if (data.hasOwnProperty('arch') &&
      !_.contains(VersionsFetcher.ARCHS, data.arch)) {
    errors.push('invalid arch specified');
  }

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

var parentDirRegex = /Parent Directory/i;
var lineRegEx = /<img.*> <a href=\"(.+)\">(.+)<\/a>\s+(\d{2}-\w{3}-\d{4} \d{2}:\d{2})/;
var crosswalkPackageNameRegex = /^crosswalk-.*(\d+\.\d+\.\d+\.\d+).+$/;

// get all the files after the "Parent Directory" link in a standard
// Apache directory index page; returns an array of files, sorted
// so the most recent is first
var parseApacheIndex = function (url, content) {
  content = content.toString();

  // ignore all lines until we get to the first one after
  // "Parent Directory"
  var lines = content.split('\n');
  var files = [];

  for (var i = 0; i < lines.length; i += 1) {
    if (parentDirRegex.test(lines[i])) {
      continue;
    }

    var matches = lines[i].match(lineRegEx);

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

// get the version string from a xwalk-android filename
var getVersionString = function (name) {
  var matches = name.match(crosswalkPackageNameRegex);
  return matches[1];
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
 * Get the xwalk-android version numbers for an arch/channel pair.
 * @param {string} arch Architecture; one of VersionsFetcher.ARCHS
 * @param {string} channel Channel; one of VersionsFetcher.CHANNELS
 * @returns {external:Promise} resolves to an object representing
 * the files on the server (most recently modified first),
 * or rejects with an error if the download site is not available.
 *
 * Example output:

 { url: 'https://download.01.org/crosswalk/releases/android-x86/stable/',
   arch: 'x86',
   channel: 'stable',
   files:
    [ { name: 'crosswalk-2.31.27.5-x86.zip',
        url: 'https://download.01.org/crosswalk/releases/android-x86/stable/crosswalk-2.31.27.5-x86.zip',
        lastModified: Fri Dec 20 2013 10:18:00 GMT+0000 (GMT),
        version: '2.31.27.5' },
      { name: 'crosswalk-1.29.4.7.zip',
        url: 'https://download.01.org/crosswalk/releases/android-x86/stable/crosswalk-1.29.4.7.zip',
        lastModified: Mon Nov 11 2013 01:17:00 GMT+0000 (GMT),
        version: '1.29.4.7' } ] }

 */
VersionsFetcher.prototype.getDownloads = function (arch, channel) {
  var dfd = Q.defer();
  var self = this;

  var data = {arch: arch, channel: channel};
  var url = null;

  // check arch and channel
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

      entries = _.map(entries, function (entry) {
        entry.version = getVersionString(entry.name);
        return entry;
      });

      return {
        type: 'Downloads',
        url: url,
        arch: arch,
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
 * @param {string} arch Architecture; one of VersionsFetcher.ARCHS
 * @returns {external:Promise} resolves to an object representing
 * the channels available, or rejects with an error if the
 * download site is not available.
 */
VersionsFetcher.prototype.getChannels = function (arch) {
  var dfd = Q.defer();
  var self = this;

  var data = {arch: arch};
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
        arch: arch,
        channels: entries
      };
    }
  )
  .done(dfd.resolve, dfd.reject);

  return dfd.promise;
};

module.exports = VersionsFetcher;
