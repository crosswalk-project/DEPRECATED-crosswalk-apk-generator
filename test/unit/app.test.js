/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.should();
var expect = chai.expect;

var Q = require('q');

var App = require('../../src/app');

// stub
var finder = {
  checkIsDirectory: function () {
    return Q.resolve(true);
  },

  checkIsFile: function () {
    return Q.resolve(true);
  }
};

// helper to test exceptions thrown when creating an App
var testException = function (config, done, notExpected, expected) {
  App(config, {finder: finder})
  .done(
    function () {
      done(new Error('test failed; App created successfully'));
    },

    function (err) {
      if (expected) {
        err.message.should.match(expected);
      }

      if (notExpected) {
        for (var i = 0; i < notExpected.length; i += 1) {
          err.message.should.not.match(notExpected[i]);
        }
      }

      done();
    }
  );
};

describe('App', function () {
  it('should throw an error if name not set', function (done) {
    testException({}, done, [], /name must be set/);
  });

  it('should throw an error if pkg not set', function (done) {
    var config = {name: 'foo'};
    testException(config, done, [/name must be set/], /pkg must be set/);
  });

  it('should throw an error if (appUrl || (appRoot && appLocalPath)) not set', function (done) {
    var expectedMsg = /one of appUrl OR \(appLocalPath AND appRoot\) must be set/;

    var config = {
      name: 'foo',
      pkg: 'test.one'
    };

    testException(
      config,
      done,
      [/name must be set/, /pkg must be set/],
      expectedMsg
    );
  });

  it('should throw an error if appRoot is not a directory', function (done) {
    var expectedMsg = /is not a directory/;

    var stub = sinon.stub(finder, 'checkIsDirectory');
    stub.returns(Q.resolve(false));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    var config = {
      name: 'foo',
      pkg: 'test.it',
      appRoot: '/my/app',
      appLocalPath: 'index.html'
    };

    testException(
      config,
      finish,
      null,
      expectedMsg
    );
  });

  it('should throw an error if appLocalPath is not a file under appRoot', function (done) {
    var expectedMsg = /expected HTML file/;

    var stub = sinon.stub(finder, 'checkIsFile');
    stub.returns(Q.resolve(false));

    var finish = function (e) {
      stub.restore();
      done(e);
    };

    var config = {
      name: 'foo',
      pkg: 'test.it',
      appRoot: '/my/app/',
      appLocalPath: 'index.html'
    };

    testException(
      config,
      finish,
      null,
      expectedMsg
    );
  });

  it('should throw an error if pkg has no period characters', function (done) {
    var expectedMsg = /pkg must contain at least two character sequences/;

    var config = {
      name: 'foo',
      pkg: 'testone',
      appUrl: 'http://foo.bar',
      version: '1.0.0'
    };

    testException(
      config,
      done,
      [/must be set/],
      expectedMsg
    );
  });

  it('should throw an error if pkg has only one "segment"', function (done) {
    var expectedMsg = /pkg must contain at least two character sequences/;

    var config = {
      name: 'foo',
      pkg: 'testone.',
      appUrl: 'http://foo.bar',
      version: '1.0.0'
    };

    testException(
      config,
      done,
      [/must be set/],
      expectedMsg
    );
  });

  it('should fail if pkg has a segment starting with a digit', function (done) {
    var expectedMsg = /pkg must not start with a digit/;

    var config = {
      name: 'foo',
      pkg: 'testone.1', // this is the important property
      appUrl: 'http://foo.bar',
      version: '1.0.0'
    };

    testException(
      config,
      done,
      [/must be set/],
      expectedMsg
    );
  });

  it('should fail if pkg starts with a digit', function (done) {
    var expectedMsg = /pkg must not start with a digit/;

    var config = {
      name: 'foo',
      pkg: '1.testone', // this is the important property
      appUrl: 'http://foo.bar',
      version: '1.0.0'
    };

    testException(
      config,
      done,
      [/must be set/],
      expectedMsg
    );
  });

  it('should set defaults for optional keys', function (done) {
    var config = {
      name: 'test',
      pkg: 'pkg.one',
      appRoot: '/test',
      appLocalPath: 'index.html',
      version: '1.0.0'
    };

    App(config, {finder: finder})
    .done(
      function (app) {
        // test provided keys are set
        app.name.should.equal('test');
        app.pkg.should.equal('pkg.one');
        app.appRoot.should.equal('/test');
        app.appLocalPath.should.equal('index.html');

        // test defaults have been set
        app.sanitisedName.should.equal('test');
        app.icon.should.equal('');
        app.remoteDebugging.should.be.false;
        app.fullscreen.should.be.true;
        app.theme.should.equal('Theme.Holo.Light.NoActionBar.Fullscreen');
        app.permissions.should.eql([
          'ACCESS_FINE_LOCATION',
          'ACCESS_NETWORK_STATE',
          'CAMERA',
          'INTERNET',
          'MODIFY_AUDIO_SETTINGS',
          'RECORD_AUDIO',
          'WAKE_LOCK',
          'WRITE_EXTERNAL_STORAGE'
        ]);

        done();
      },

      done
    );
  });

  it('should derive computed keys', function (done) {
    var expectedName = 'test_Hello_world_Goodbye';
    var expectedPkg = 'pkg._world_.one';
    var expectedActivityClassName = 'Test_Hello_world_GoodbyeActivity';

    var config = {
      name: 'test \ / : * < >>> < ????   \'Hello world\' """"Goodbye <>" | - ""   !',
      pkg: 'pkg. \ / : * < >>> < ????   \'world    """"<>" | - ""   !.one',
      appRoot: '/test',
      appLocalPath: 'index.html',
      fullscreen: true,
      version: '1.0.0'
    };

    App(config, {finder: finder})
    .done(
      function (app) {
        // test computed keys
        app.theme.should.equal('Theme.Holo.Light.NoActionBar.Fullscreen');
        app.sanitisedName.should.equal(expectedName);
        app.pkg.should.equal(expectedPkg);

        done();
      },

      done
    );
  });
});
