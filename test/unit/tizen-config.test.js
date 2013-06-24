/**
 * Copyright 2013 Intel Corporate Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
require('chai').should();
var sinon = require('sinon');

var path = require('path');
var dataDir = path.join(__dirname, 'data');

// mock parser
var mockConfigBadError = new Error('config could not be parsed');

var mockConfigOkData = {
  'widget': {
    'tizen:application': [
      { '$': { 'id': 'id' } }
    ],
    '$': { 'id': 'uri' }
   }
};

var mockParser = function (throwError) {
  var obj = {parseString: function () {}};

  var stub = sinon.stub(obj, 'parseString');

  if (throwError) {
    stub.callsArgWith(1, mockConfigBadError);
  }
  else {
    // invokes cb with cb(err, result); err is null if no error occurred;
    // the result is an object with structure
    // {
    //   'widget': {
    //    'tizen-application': [{ '$': { 'id': 'idstring' } }],
    //    '$': { 'id': 'uristring' }
    //   }
    // }
    stub.callsArgWith(1, null, mockConfigOkData);
  }

  return obj;
};

var TizenConfig = require('../../lib/tizen-config');

describe('TizenConfig', function () {
  it('getMeta() should invoke callback with error if file doesn\'t exist', function (done) {
    var tc = TizenConfig.create({
      parser: mockParser(),
      configFile: null
    });

    var cb = function () {
      var spy = sinon.spy();
      spy.apply(null, arguments);
      spy.calledWith(sinon.match.instanceOf(Error)).should.be.true;
      done();
    };

    tc.getMeta(cb);
  });

  it('getMeta() should invoke callback with result object if config.xml parsed', function (done) {
    var tc = TizenConfig.create({
      parser: mockParser(),
      configFile: path.join(dataDir, 'config.xml')
    });

    var expectedResult = {uri: 'uri', id: 'id'};

    var cb = function () {
      var spy = sinon.spy();
      spy.apply(null, arguments);
      spy.calledWith(null, sinon.match(expectedResult)).should.be.true;
      done();
    };

    tc.getMeta(cb);
  });

  it('getMeta() should invoke callback with error if config.xml parse fails', function (done) {
    var tc = TizenConfig.create({
      parser: mockParser(true),
      configFile: path.join(dataDir, 'config.xml')
    });

    var cb = function () {
      var spy = sinon.spy();
      spy.apply(null, arguments);
      spy.calledWith(mockConfigBadError).should.be.true;
      done();
    };

    tc.getMeta(cb);
  });

  it('getMeta() should return cached config on second and subsequent calls', function (done) {
    var tc = TizenConfig.create({
      parser: mockParser(),
      configFile: path.join(dataDir, 'config.xml')
    });

    var expectedResult = {uri: 'uri', id: 'id'};

    var cb = function () {
      var spy = sinon.spy();
      spy.apply(null, arguments);
      spy.calledWith(null, sinon.match(expectedResult)).should.be.true;
      done();
    };

    // two calls to getMeta(); the second call should return the cached
    // config
    tc.getMeta(function () {
      // reset the configFile location; this ensures that if getMeta()
      // is called twice and caching doesn't happen, we get an error
      // (as getMeta() will try to load the non-existent file and parse it)
      tc.configFile = null;

      tc.getMeta(cb);
    });
  });
});
