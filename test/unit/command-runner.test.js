/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var path = require('path');

var CommandRunner = require('../../src/command-runner');

describe('CommandRunner', function () {
  var commandRunner = CommandRunner();

  it('should error on a bad command', function (done) {
    var badCmd = 'node ' + path.join(__dirname, 'test-bin', 'badcmd.js');

    commandRunner.run(badCmd)
    .should.be.rejectedWith(/returned bad code/)
    .and.notify(done);
  });

  it('should complete successfully on a good command', function (done) {
    var goodCmd = 'node ' + path.join(__dirname, 'test-bin', 'goodcmd.js');

    commandRunner.run(goodCmd)
    .should.become('goodcmd here, doing my business\n')
    .and.notify(done);
  });

});
