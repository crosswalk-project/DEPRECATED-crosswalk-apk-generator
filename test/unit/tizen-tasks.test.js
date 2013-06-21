// test generated task functions
var chai = require('chai');
chai.should();
var expect = chai.expect;

var sinon = require('sinon');

var taskMaker = require('../../lib/tizen-tasks');

// matchers
var aFunction = sinon.match.instanceOf(Function)

describe('constructor', function () {

  it('should throw an error if no bridge is supplied', function () {
    var testConstructor = function () {
      taskMaker({
        tizenConfig: {}
      });
    };

    expect(testConstructor).to.throw();
  });

  it('should throw an error if no tizenConfig is supplied', function () {
    var testConstructor = function () {
      taskMaker({
        bridge: {}
      });
    };

    expect(testConstructor).to.throw();
  });

  it('should return an object with tizenPrepareTask and ' +
     'tizenTask tasks', function () {
    var tasks = taskMaker({
      bridge: {},
      tizenConfig: {}
    });

    tasks.should.have.property('tizenPrepareTask');
    tasks.should.have.property('tizenTask');
  });

});

describe('tizenPrepareTask', function () {
  var bridge = {
    tizenAppScriptLocal: 'tizen-app.sh',
    tizenAppScriptDir: '/tmp'
  };

  it('should callback with error if push fails', function (done) {
    bridge.push = sinon.stub().callsArgWith(4, new Error('push failed'));

    var tasks = taskMaker({
      bridge: bridge,
      tizenConfig: {}
    });

    tasks.tizenPrepareTask(function (err) {
      err.should.be.instanceOf(Error);
      done();
    });
  });

  it('should callback with 0 args if push succeeds', function (done) {
    bridge.push = sinon.stub().callsArg(4);

    var tasks = taskMaker({
      bridge: bridge,
      tizenConfig: {}
    });

    tasks.tizenPrepareTask(function (err) {
      expect(err).to.be.undefined;
      done();
    });
  });
});

describe('tizenTask', function () {
  var tasks = taskMaker({
    bridge: {},
    tizenConfig: {}
  });

  it('should fail if no action is specified', function (done) {
    tasks.tizenTask({action: null}, function (err) {
      err.should.be.instanceOf(Error);
      done();
    });
  });

  it('should fail if invalid action is specified', function (done) {
    tasks.tizenTask({action: 'blibbyblobbyblobgob'}, function (err) {
      err.should.be.instanceOf(Error);
      done();
    });
  });
});

describe('tizenTask push', function () {

  var bridge = {
    push: function () {}
  };

  var tasks = taskMaker({
    bridge: bridge,
    tizenConfig: {}
  });

  var localFiles = 'tizen-app.sh';
  var remoteDir = '/tmp';

  it('should fail if localFiles is not defined', function (done) {
    var data = {
      action: 'push'
    };

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      done();
    });
  });

  it('should fail if remoteDir is not defined', function (done) {
    var data = {
      action: 'push',
      localFiles: 'tizen-app.sh'
    };

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);

      // extra check that we're getting the error for remoteDir
      err.message.should.match(/needs a remoteDir property/);

      done();
    });
  });

  it('should fail if push fails on the bridge', function (done) {
    var data = {
      action: 'push',
      localFiles: localFiles,
      remoteDir: remoteDir,
      overwrite: false,
      chmod: '+x'
    };

    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('push')
              .withArgs(localFiles, remoteDir, false, '+x', aFunction)
              .callsArgWith(4, new Error())
              .once();

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      mockBridge.verify();
      done();
    });
  });

  it('should default to overwrite=true and chmod=null', function (done) {
    var data = {
      action: 'push',
      localFiles: localFiles,
      remoteDir: remoteDir
    };

    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('push')
              .withArgs(
                localFiles,
                remoteDir,
                true,
                null,
                aFunction
              )
              .callsArg(4)
              .once();

    tasks.tizenTask(data, function (err) {
      expect(err).to.be.undefined;
      mockBridge.verify();
      done();
    });
  });

  it('should use overwrite and chmod passed in data', function (done) {
    var data = {
      action: 'push',
      localFiles: localFiles,
      remoteDir: remoteDir,
      overwrite: false,
      chmod: '+x'
    };

    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('push')
              .withArgs(localFiles, remoteDir, false, '+x', aFunction)
              .callsArg(4)
              .once();

    tasks.tizenTask(data, function (err) {
      expect(err).to.be.undefined;
      mockBridge.verify();
      done();
    });
  });

});

describe('tizenTask install', function () {

  var bridge = {
    install: function () {}
  };

  var tasks = taskMaker({
    bridge: bridge,
    tizenConfig: {}
  });

  var remoteFiles = '/tmp/package.wgt';

  it('should fail if remoteFiles not specified', function (done) {
    var data = {
      action: 'install'
    };

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      done();
    });
  });

  it('should fail if bridge.install fails', function (done) {
    var data = {
      action: 'install',
      remoteFiles: remoteFiles
    };

    sinon.stub(bridge, 'install').callsArgWith(1, new Error());

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      bridge.install.restore();
      done();
    });
  });

  it('should succeed if bridge.install succeeds', function (done) {
    var data = {
      action: 'install',
      remoteFiles: remoteFiles
    };

    sinon.stub(bridge, 'install').callsArgWith(1);

    tasks.tizenTask(data, function (err) {
      expect(err).to.be.undefined;
      bridge.install.restore();
      done();
    });
  });

});

describe('tizenTask uninstall', function () {
  var tizenConfig = {
    getMeta: function () {}
  };

  var bridge = {
    uninstall: function () {}
  };

  var tasks = taskMaker({
    bridge: bridge,
    tizenConfig: tizenConfig
  });

  var expectedId = 'someid';
  var meta = { id: expectedId };

  it('should fail if config.xml metadata cannot be retrieved', function (done) {
    var data = {
      action: 'uninstall'
    };

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, new Error());

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      tizenConfig.getMeta.restore();
      done();
    });
  });

  it('should default to stopOnFailure=false', function (done) {
    var expectedStop = false;

    var data = {
      action: 'uninstall'
    };

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var mockBridge = sinon.mock(bridge)
    mockBridge.expects('uninstall')
              .withArgs(expectedId, expectedStop, aFunction)
              .callsArg(2)
              .once();

    tasks.tizenTask(data, function (err) {
      expect(err).to.be.undefined;
      tizenConfig.getMeta.restore();
      mockBridge.verify();
      done();
    });
  });

  it('should fail if bridge.uninstall fails', function (done) {
    var expectedStop = true;

    var data = {
      action: 'uninstall',
      stopOnFailure: expectedStop
    };

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var mockBridge = sinon.mock(bridge)
    mockBridge.expects('uninstall')
              .withArgs(expectedId, expectedStop, aFunction)
              .callsArgWith(2, new Error())
              .once();

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      tizenConfig.getMeta.restore();
      mockBridge.verify();
      done();
    });
  });

  it('should succeed if bridge.uninstall succeeds', function (done) {
    var data = {
      action: 'uninstall'
    };

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var mockBridge = sinon.mock(bridge)
    mockBridge.expects('uninstall')
              .withArgs(expectedId, false, aFunction)
              .callsArgWith(2, new Error())
              .once();

    tasks.tizenTask(data, function (err) {
      err.should.be.instanceOf(Error);
      tizenConfig.getMeta.restore();
      mockBridge.verify();
      done();
    });
  });
});

describe('tizenTask script', function () {
  var tizenConfig = {
    getMeta: function () {}
  };

  var bridge = {
    runScript: function () {}
  };

  var tasks = taskMaker({
    bridge: bridge,
    tizenConfig: tizenConfig
  });

  var meta = {
    id: 'someid',
    uri: 'someuri'
  };

  var remoteScript = '/tmp/tizen-app.sh';

  it('should fail if remoteScript is not specified', function (done) {
    tasks.tizenTask({action: 'script'}, function (err) {
      err.should.be.instanceOf(Error);
      err.message.should.match(/needs a remoteScript property/);
      done();
    });
  });

  it('should fail if tizenConfig.getMeta fails', function (done) {
    var data = {
      action: 'script',
      remoteScript: remoteScript
    };

    var err = new Error('foo');

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, err);

    tasks.tizenTask(data, function (error) {
      error.should.equal(err);
      error.message.should.match(/foo/);
      tizenConfig.getMeta.restore();
      done();
    });
  });

  it('should fail if bridge.runScript fails', function (done) {
    var data = {
      action: 'script',
      remoteScript: remoteScript
    };

    var err = new Error('bar');

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);
    sinon.stub(bridge, 'runScript')
         .withArgs(remoteScript, [meta.uri, meta.id], aFunction)
         .callsArgWith(2, err);

    tasks.tizenTask(data, function (error) {
      error.should.equal(err);
      error.message.should.match(/bar/);
      tizenConfig.getMeta.restore();
      bridge.runScript.restore();
      done();
    });
  });

  it('should pass data.args to runScript as arguments', function (done) {
    var data = {
      action: 'script',
      remoteScript: remoteScript,
      args: ['foo', 'bar']
    };

    var expectedArgs = [meta.uri, meta.id, 'foo', 'bar'];

    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var mockBridge = sinon.mock(bridge);
    mockBridge.expects('runScript')
              .withArgs(remoteScript, expectedArgs, aFunction)
              .callsArg(2)
              .once();

    tasks.tizenTask(data, function (err) {
      expect(err).to.be.undefined;
      tizenConfig.getMeta.restore();
      mockBridge.verify();
      done();
    });
  });
});

describe('tizenTask launch', function () {
  var tizenConfig = {
    getMeta: function () {}
  };

  var bridge = {
    launch: function () {}
  };

  var tasks = taskMaker({
    bridge: bridge,
    tizenConfig: tizenConfig
  });

  var meta = {
    id: 'someid',
    uri: 'someuri'
  };

  var remoteScript = '/tmp/tizen-app.sh';
  var err = new Error();

  it('should fail if tizenConfig.getMeta fails', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, err);

    tasks.tizenTask({action: 'start'}, function (error) {
      error.should.equal(err);
      tizenConfig.getMeta.restore();
      done();
    });
  });

  it('should pass subcommand and stopOnFailure to bridge.launch', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = true;
    var action = 'start';
    var data = {action: action, stopOnFailure: stopOnFailure};

    var mockBridge = sinon.mock(bridge);
    mockBridge.expects('launch')
              .withArgs(action, meta.uri, stopOnFailure, aFunction)
              .callsArg(3)
              .once();

    tasks.tizenTask(data, function () {
      tizenConfig.getMeta.restore();
      mockBridge.verify();
      done();
    });
  });

  it('should fail if bridge.launch fails for debug/start/stop', function () {

  });

  it('should succeed if bridge.launch succeeds for start/stop', function () {

  });

  it('should fail if subcommand=debug but no remote port', function () {

  });

  it('should fail if remote port but port forwarding fails', function () {

  });

  it('should run browser if port forwarded and browserCmd is set', function () {

  });

  it('should succeed if port forwarded but no browserCmd set', function () {

  });
});
