/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');
var _ = require('lodash');

var JavacWrapper = require('../../src/wrappers/javac-wrapper');

var stubCommandRunner = {
  run: function (cmd) {
    return Q.resolve();
  }
};

var javaSrcDir = path.join(__dirname, 'test-dirs', 'java-src');

describe('JavacWrapper', function () {

  it('should run a command for compile .java files with no build jars', function (done) {
    var javacWrapper = JavacWrapper(
      '/my/javac',
      '1.5',
      '1.5',
      stubCommandRunner
    );

    var expTemplate = '/my/javac -g -d /dest/classes -source 1.5 ' +
                      '-target 1.5 -Xlint:unchecked -Xlint:deprecation ' +
                      '<%= rJava %> ' +
                      '<%= activityJava %>';

    // because the java file locations are os-specific, we create the
    // expected locations here and insert them into the template
    var data = {
      rJava: path.join(javaSrcDir, 'baaj', 'barz', 'R.java'),
      activityJava: path.join(javaSrcDir, 'fooj', 'Activity.java')
    };

    var expected = _.template(expTemplate, data);

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      classesDir: '/dest/classes',

      // this is a real directory because I'm using glob() internally
      srcDir: javaSrcDir,

      buildJars: []
    };

    javacWrapper.compile(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected);
        spy.restore();
        done();
      },

      done
    );
  });

  it('should run a command for compiling .java files with build jars', function (done) {
    var javacWrapper = JavacWrapper(
      '/my/javac',
      '1.5',
      '1.5',
      stubCommandRunner,
      'windows'
    );

    // note that the expected command has Windows classpath separators,
    // as we passed a platform to the JavacWrapper constructor
    var expTemplate = '/my/javac -g -d /dest/classes -source 1.5 ' +
                      '-target 1.5 -Xlint:unchecked -Xlint:deprecation ' +
                      '-classpath myjars/build1.jar;myjars/build2.jar ' +
                      '<%= rJava %> ' +
                      '<%= activityJava %>';

    // because the java file locations are os-specific, we create the
    // expected locations here and insert them into the template
    var data = {
      rJava: path.join(javaSrcDir, 'baaj', 'barz', 'R.java'),
      activityJava: path.join(javaSrcDir, 'fooj', 'Activity.java')
    };

    var expected = _.template(expTemplate, data);

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      classesDir: '/dest/classes',

      // this is a real directory because I'm using glob() internally
      srcDir: javaSrcDir,

      buildJars: ['myjars/build1.jar', 'myjars/build2.jar']
    };

    javacWrapper.compile(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected);
        spy.restore();
        done();
      },

      done
    );
  });

});
