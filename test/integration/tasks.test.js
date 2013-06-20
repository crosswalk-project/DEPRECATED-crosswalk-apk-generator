// this tests the tasks object against some real parts of the system
// (e.g. a real config.xml file, environment variables)
var tasks = require('../../lib/tasks');

var path = require('path');

// the sdb command is a script which can be used to return
// different exit codes depending on how it is invoked
var sdbCmd = path.join(__dirname, 'bin/sdb.sh');

var config = {
  tizenAppScriptDir: '/home/developer',
  configFile: path.join(__dirname, 'data/config.xml'),
  logger: {
    write: console.log,
    error: console.error,
    ok: console.log,
    warn: console.log
  }
};

describe('tasks object', function () {
  it('should succeed if sdb push and shell both succeed', function (done) {
    config.sdbCmd = sdbCmd + ' push:1,shell:0';

    tasks(config).tizenPrepareTask(function (err, result) {
      done();
    });
  });
});
