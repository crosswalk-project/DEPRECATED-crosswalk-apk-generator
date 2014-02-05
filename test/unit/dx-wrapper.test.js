/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var Q = require('q');

var DxWrapper = require('../../src/wrappers/dx-wrapper');

var stubCommandRunner = {
  run: function () {
    return Q.resolve();
  }
};

describe('DxWrapper', function () {
  var dxWrapper = DxWrapper('/my/dx', stubCommandRunner);

  it('should compile resource files into a .dex file', function (done) {
    var expected = '/my/dx --dex --output /dest/classes.dex ' +
                   '/dest/classes /my/one.jar /my/two.jar';

    var spy = sinon.spy(stubCommandRunner, 'run');

    var options = {
      dexFile: '/dest/classes.dex',
      jars: ['/my/one.jar', '/my/two.jar'],
      classesDir: '/dest/classes'
    };

    dxWrapper.compile(options)
    .done(
      function () {
        spy.should.have.been.calledWith(expected, sinon.match.string);
        spy.restore();
        done();
      },

      done
    );
  });

});
