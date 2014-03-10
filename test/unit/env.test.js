/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
var expect = chai.expect;

var sinon = require('sinon');
var Q = require('q');
var _ = require('lodash');
var path = require('path');

var Env = require('../../src/env');
var fixsep = require('../../src/path-helpers').fixSeparators;

// stub helpers
var helpers = {
  appSkeleton: {
    generate: function () {
      return Q.resolve();
    }
  },
  commandRunner: {},
  finder: {
    checkIsDirectory: function () {
      return Q.resolve();
    },

    // stub out the return value so by default we just mirror what was
    // passed to the method, by joining the guessDir for each piece
    // to its exe property or the first element of its files property
    locatePieces: function (rootDir, pieces) {
      var out = {};

      _.each(pieces, function (opts, alias) {
        if (_.isArray(opts.resDirs)) {
          out[alias] = opts;
        }
        else if (opts.directory) {
          out[alias] = opts.directory;
        }
        else {
          var fileForAlias = opts.exe;

          if (!fileForAlias && opts.files) {
            fileForAlias = opts.files[0];
          }
          else {
            fileForAlias = alias;
          }

          out[alias] = path.join(rootDir, opts.guessDirs[0], fileForAlias);
        }
      });

      return Q.resolve(out);
    },

    checkExecutable: function () {
      return Q.resolve();
    },

    // only used to set androidAPILevel, so always returns two
    // directories similar to what you'd get from globbing the
    // Android SDK platforms/ directory
    globFiles: function () {
      return Q([
        '/android/sdk/dir/platforms/android-18',
        '/android/sdk/dir/platforms/android-17',
        '/android/sdk/dir/platforms/android-16'
      ]);
    }
  }
};

describe('Env.configure()', function () {

  it('should reject if the config contains unrecognised keys', function (done) {
    Env({bloo: 'blah'}, helpers)
    .should.be.rejectedWith(/unrecognised keys/)
    .and.notify(done);
  });

  it('should reject if the config has no androidSDKDir key', function (done) {
    Env({}, helpers)
    .should.be.rejectedWith(/androidSDKDir location must be specified/)
    .and.notify(done);
  });

  it('should reject if the config has no xwalkAndroidDir key', function (done) {
    Env({androidSDKDir: 'path'}, helpers)
    .should.be.rejectedWith(/xwalkAndroidDir location must be specified/)
    .and.should.not.be.rejectedWith(/androidSDKDir location must be specified/)
    .and.notify(done);
  });

  it('should reject if android dir is not a directory', function (done) {
    var androidDir = 'foofasdfasdf';
    var xwalkDir = 'ballalala';

    var androidPromise = Q.reject(new Error(androidDir + ' does not exist'));
    var xwalkPromise = Q.resolve(xwalkDir);

    var checkIsDir = sinon.stub(helpers.finder, 'checkIsDirectory');
    checkIsDir.withArgs(androidDir).returns(androidPromise);
    checkIsDir.withArgs(xwalkDir).returns(xwalkPromise);

    var finish = function (e) {
      checkIsDir.restore();
      done(e);
    };

    Env({
      androidSDKDir: androidDir,
      xwalkAndroidDir: xwalkDir,
      androidAPILevel: 19
    }, helpers)
    .should.be.rejectedWith(new RegExp(androidDir + ' does not exist'))
    .and.should.not.be.rejectedWith(new RegExp(xwalkDir + ' does not exist'))
    .and.notify(finish);
  });

  it('should reject if xwalk dir is not a directory', function (done) {
    var androidDir = 'foofasdfasdf';
    var xwalkDir = 'ballalala';

    var androidPromise = Q.resolve(xwalkDir);
    var xwalkPromise = Q.reject(new Error(xwalkDir + ' does not exist'));

    var checkIsDir = sinon.stub(helpers.finder, 'checkIsDirectory');
    checkIsDir.withArgs(androidDir).returns(androidPromise);
    checkIsDir.withArgs(xwalkDir).returns(xwalkPromise);

    var finish = function (e) {
      checkIsDir.restore();
      done(e);
    };

    Env({
      androidSDKDir: androidDir,
      xwalkAndroidDir: xwalkDir,
      androidAPILevel: 19
    }, helpers)
    .should.be.rejectedWith(new RegExp(xwalkDir + ' does not exist'))
    .and.should.not.be.rejectedWith(new RegExp(androidDir + ' does not exist'))
    .and.notify(finish);
  });

  it('should reject if android pieces are missing', function (done) {
    var androidDir = 'foofasdfasdf';
    var xwalkDir = 'ballalala';

    // stub the two calls to finder.locatePieces()
    var locatePieces = sinon.stub(helpers.finder, 'locatePieces');
    locatePieces.withArgs(androidDir, sinon.match.object)
                .returns(Q.reject(new Error('Could not find all required locations')));
    locatePieces.withArgs(xwalkDir, sinon.match.object)
                .returns(Q.resolve());

    var finish = function (e) {
      locatePieces.restore();
      done(e);
    };

    Env({
      androidSDKDir: androidDir,
      xwalkAndroidDir: xwalkDir,
      androidAPILevel: 19
    }, helpers)
    .should.be.rejectedWith(/Could not find all required locations/)
    .and.notify(finish);
  });

  it('should reject if xwalk pieces are missing', function (done) {
    var androidDir = 'foofasdfasdf';
    var xwalkDir = 'ballalala';

    // stub the two calls to finder.locatePieces()
    var locatePieces = sinon.stub(helpers.finder, 'locatePieces');
    locatePieces.withArgs(androidDir, sinon.match.object)
                .returns(Q.resolve());
    locatePieces.withArgs(xwalkDir, sinon.match.object)
                .returns(Q.reject(new Error('Could not find all required locations')));

    var finish = function (e) {
      locatePieces.restore();
      done(e);
    };

    Env({
      androidSDKDir: androidDir,
      xwalkAndroidDir: xwalkDir,
      androidAPILevel: 19
    }, helpers)
    .should.be.rejectedWith(/Could not find all required locations/)
    .and.notify(finish);
  });

  it('should reject if other files are missing', function (done) {
    var jarsignerLocation = '/odd/place/for/jarsigner';

    var expected = 'execution of ' + jarsignerLocation + ' returned bad code';
    var err = new Error(expected);

    // stub finder.checkExecutable() to pretend jarsigner is missing
    var checkExecutable = sinon.stub(helpers.finder, 'checkExecutable');
    checkExecutable.withArgs(jarsignerLocation, ['-help'])
                   .returns(Q.reject(err));

    var finish = function (e) {
      checkExecutable.restore();
      done(e);
    };

    Env({
      androidSDKDir: 'foo',
      xwalkAndroidDir: 'bar',
      jarsigner: jarsignerLocation,
      androidAPILevel: 19
    }, helpers)
    .should.be.rejectedWith(new RegExp(expected))
    .and.notify(finish);
  });

  it('should set androidAPILevel by globbing platforms dir if not set', function (done) {
    // globFiles returns "android-*" directories;
    // the stubbed out finder returns 3 directories (android-16, android-17
    // and android-18), so 18 should be selected (as it's last alphabetically)
    Env({
      androidSDKDir: fixsep('/foo'),
      xwalkAndroidDir: fixsep('/bar')
    }, helpers)
    .should.eventually.satisfy(function (obj) {
      return obj.androidAPILevel === 18;
    })
    .and.notify(done);
  });

  it('should resolve to the Env if configure() is successful', function (done) {
    // the expected paths here are the ones returned by the stub finder
    // (see top of this file)
    var expectedConfig = {
      java: 'java',
      javac: 'javac',
      ant: 'ant',
      jarsigner: 'jarsigner',
      sourceJavaVersion: Env.CONFIG_DEFAULTS.sourceJavaVersion,
      targetJavaVersion: Env.CONFIG_DEFAULTS.targetJavaVersion,
      androidSDKDir: fixsep('/foo'),
      androidAPILevel: 19,
      dx: fixsep('/foo/build-tools/19*/dx'),
      aapt: fixsep('/foo/build-tools/19*/aapt'),
      anttasksJar: fixsep('/foo/tools/lib/ant-tasks.jar'),
      androidJar: fixsep('/foo/platforms/android-19/android.jar'),
      zipalign: fixsep('/foo/tools/zipalign'),
      xwalkAndroidDir: fixsep('/bar'),
      xwalkRuntimeClientJar: fixsep('/bar/libs/xwalk_app_runtime_java.jar'),
      xwalkApkPackageAntFile: fixsep('/bar/scripts/ant/apk-package.xml'),
      keystore: fixsep('/bar/scripts/ant/xwalk-debug.keystore'),
      keystoreAlias: fixsep('xwalkdebugkey'),
      keystorePassword: fixsep('xwalkdebug')
    };

    Env({
      androidSDKDir: fixsep('/foo'),
      xwalkAndroidDir: fixsep('/bar'),
      androidAPILevel: 19
    }, helpers)
    .should.eventually.satisfy(function (obj) {
      // test that the properties in the returned object obj
      // all have the same values as those in expectedConfig
      return _.all(expectedConfig, function (value, key) {
        var ret = (obj[key] === expectedConfig[key]);

        if (!ret) {
          throw new Error('key ' + key + ' mismatched in Env; ' +
                          'expected ' + expectedConfig[key] + ' but got ' +
                          obj[key]);
        }

        return ret;
      });
    })
    .and.notify(done);
  });

});

describe('Env.build()', function () {

  it('should use the appSkeleton and buildTools to generate an apk', function (done) {
    // stub
    var app = {
      name: 'my wonderful app',
      sanitisedName: 'my_wonderful_app',
      pkg: 'foo.bar',
      icon: null,
      permissions: [],
      appRoot: '/me/my_wonderful_app',
      theme: 'theme.one',
      appLocalPath: 'index.html',
      remoteDebugging: false,
      getPermissions: function () { return this.permissions; },
      getExtensionsJsFiles: function () { return []; }
    };

    // stub
    var locations = {
      addBuildJars: function () {},
      addJars: function () {},
      finalApk: 'build/final.apk'
    };

    // stub
    var buildTools = {
      makeApk: sinon.stub().returns(Q.resolve())
    };

    var envConfig = {
      androidSDKDir: '/me/android-sdk',
      androidJar: '/me/android-sdk/android.jar',
      xwalkAndroidDir: '/me/xwalk_app_template',
      xwalkRuntimeClientJar: '/me/xwalk_app_template/libs/runtime.jar',
      androidAPILevel: 19
    };

    Env(envConfig, helpers)
    .then(
      function (env) {
        // manually set a stub on the Env object
        env.buildTools = buildTools;

        try {
          env.build(app, locations).should.become(locations.finalApk)
                                   .and.notify(done);
        }
        catch (e) {
          done(e);
        }
      },

      done
    );
  });

});
