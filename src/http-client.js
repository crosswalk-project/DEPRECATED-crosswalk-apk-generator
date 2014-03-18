/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var Q = require('q');
var _ = require('lodash');

// private function which all HTTP requests get routed through
var _get = function (url, client, options, callback) {
  var getOptions = {
    method: 'GET',
    url: url
  };

  _.extend(getOptions, options);

  return client(getOptions, callback);
};

/**
 * Wrapper for HTTP client library.
 *
 * @param {object} options
 * @param {string} [options.proxy] - proxy server configuration, e.g.
 * http://myproxy.local:8080
 * @param {number} [options.timeout=10000] - timeout in ms
 */
var HttpClient = function (options, deps) {
  if (!(this instanceof HttpClient)) {
    return new HttpClient(options, deps);
  }

  options = options || {};
  deps = deps || {};

  this.proxy = options.proxy;
  this.timeout = options.timeout || 10000;
  this._httpClient = deps.httpClient || require('request');
};

/**
 * Get a URL.
 *
 * @param {string} url - URL to get
 *
 * @returns {external:Promise} which resolves to the response body
 * (if successful) or rejects with an error if not.
 */
HttpClient.prototype.get = function (url) {
  var dfd = Q.defer();

  var callback = function (err, response, body) {
    if (err) {
      dfd.reject(err);
    }
    else {
      dfd.resolve(body);
    }
  };

  var opts = {
    proxy: this.proxy,
    timeout: this.timeout
  };

  _get(url, this._httpClient, opts, callback);

  return dfd.promise;
};

/**
 * Stream a URL.
 *
 * @param {string} url - URL to stream data from
 *
 * @returns a request Request object which emits
 * response, data, end and error events
 */
HttpClient.prototype.getStream = function (url) {
  var opts = {
    proxy: this.proxy,
    timeout: this.timeout
  };

  return _get(url, this._httpClient, opts);
};

module.exports = HttpClient;
