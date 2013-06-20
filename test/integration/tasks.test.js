// this tests the tasks object against some real parts of the system
// (e.g. a real config.xml file, environment variables)
var chai = require('chai');
chai.should();
var expect = chai.expect;

var sinon = require('sinon');
var path = require('path');
var _ = require('lodash');

var tasks = require('../../lib/tasks');

// the sdb command is a script which can be used to return
// different exit codes depending on how it is invoked
var sdbCmd = path.join(__dirname, 'bin/sdb.sh');

// logger which swallows all input
var logger = {
  write: function () {},
  ok: function () {},
  warn: function () {},
  error: function () {}
};

var config = {
  tizenAppScriptDir: '/home/developer',
  configFile: path.join(__dirname, 'data/config.xml'),
  logger: logger
};

describe('tasks', function () {

  describe('tizen_prepare', function () {
    it('should callback with error if push fails', function (done) {
      config.sdbCmd = sdbCmd + ' push:1,shell:0';

      tasks(config).tizenPrepareTask(function (err, result) {
        err.should.be.instanceOf(Error);
        done();
      });
    });

    it('should callback with error if shell fails', function (done) {
      config.sdbCmd = sdbCmd + ' push:0,shell:1';

      tasks(config).tizenPrepareTask(function (err, result) {
        err.should.be.instanceOf(Error);
        done();
      });
    });

    it('should callback with no arguments if sdb push and shell ' +
       'both succeed', function (done) {
      config.sdbCmd = sdbCmd + ' push:0,shell:0';

      tasks(config).tizenPrepareTask(function (err, result) {
        expect(err).to.be.undefined;
        done();
      });
    });
  });

});
