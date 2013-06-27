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

// test generated tasks
var chai = require('chai');
chai.should();
var expect = chai.expect;

var sinon = require('sinon');

var tasksMaker = require('../../lib/tasks-maker');

// matchers
var aFunction = sinon.match.instanceOf(Function)

describe('constructor', function () {

  it('should throw an error if no bridge is supplied', function () {
    var testConstructor = function () {
      tasksMaker({
        tizenConfig: {}
      });
    };

    expect(testConstructor).to.throw();
  });

  it('should throw an error if no tizenConfig is supplied', function () {
    var testConstructor = function () {
      tasksMaker({
        bridge: {}
      });
    };

    expect(testConstructor).to.throw();
  });

  it('should return an object with tizenPrepareTask and ' +
     'tizenTask tasks', function () {
    var tasks = tasksMaker({
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

    var tasks = tasksMaker({
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

    var tasks = tasksMaker({
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
  var tasks = tasksMaker({
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

  var tasks = tasksMaker({
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

  var tasks = tasksMaker({
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

  var tasks = tasksMaker({
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

  var tasks = tasksMaker({
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
    launch: function () {},
    portForward: function () {},
    runBrowser: function () {}
  };

  var tasks = tasksMaker({
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
      tizenConfig.getMeta.restore();
      error.should.equal(err);
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
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArg(3)
              .once();

    tasks.tizenTask(data, function () {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      done();
    });
  });

  it('should fail if bridge.launch fails', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = true;
    var action = 'start';
    var data = {action: action, stopOnFailure: stopOnFailure};

    var mockBridge = sinon.mock(bridge);
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, err)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      error.should.equal(err);
      done();
    });
  });

  it('should continue if bridge.launch succeeds', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'start';
    var data = {action: action, stopOnFailure: stopOnFailure};

    var mockBridge = sinon.mock(bridge);
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArg(3)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      expect(error).to.be.undefined;
      done();
    });
  });

  it('should fail if subcommand=debug but bridge.launch fails', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'debug';
    var data = {action: action, stopOnFailure: stopOnFailure};

    var mockBridge = sinon.mock(bridge);

    // bridge.launch fails for debug
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, err)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      error.should.equal(err);
      done();
    });
  });

  it('should fail if subcommand=debug but no remote port', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'debug';
    var data = {action: action, stopOnFailure: stopOnFailure};

    var mockBridge = sinon.mock(bridge);

    // bridge.launch returns no PORT
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, null, '-------GARBAGE-------')
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      error.message.should.match(/no remote port available for debugging/);
      done();
    });
  });

  it('should fail if remote port but port forwarding fails', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'debug';
    var data = {action: action, stopOnFailure: stopOnFailure, localPort: 9090};

    var mockBridge = sinon.mock(bridge);

    // bridge.launch returns PORT
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, null, 'PORT 1234')
              .once();

    // port forwarding fails
    mockBridge.expects('portForward')
              .withArgs(9090, 1234, aFunction)
              .callsArgWith(2, err)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      error.should.equal(err);
      done();
    });
  });

  it('should run browser if port forwarded and browserCmd is set', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'debug';
    var browserCmd = 'giggle-crom';
    var localPort = 9090;

    var data = {
      action: action,
      stopOnFailure: stopOnFailure,
      localPort: localPort,
      browserCmd: browserCmd
    };

    var mockBridge = sinon.mock(bridge);

    // bridge.launch returns PORT
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, null, 'PORT 1234')
              .once();

    // port forwarding succeeds
    mockBridge.expects('portForward')
              .withArgs(localPort, 1234, aFunction)
              .callsArg(2)
              .once();

    // run browser should be called
    mockBridge.expects('runBrowser')
              .withArgs(browserCmd, localPort, aFunction)
              .callsArg(2)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      expect(error).to.be.undefined;
      done();
    });
  });

  it('should succeed if port forwarded but no browserCmd set', function (done) {
    sinon.stub(tizenConfig, 'getMeta').callsArgWith(0, null, meta);

    var stopOnFailure = false;
    var action = 'debug';
    var localPort = 9090;

    var data = {
      action: action,
      stopOnFailure: stopOnFailure,
      localPort: localPort
    };

    var mockBridge = sinon.mock(bridge);

    // bridge.launch returns PORT
    mockBridge.expects('launch')
              .withArgs(action, meta.id, stopOnFailure, aFunction)
              .callsArgWith(3, null, 'PORT 1234')
              .once();

    // port forwarding succeeds
    mockBridge.expects('portForward')
              .withArgs(localPort, 1234, aFunction)
              .callsArg(2)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      tizenConfig.getMeta.restore();
      expect(error).to.be.undefined;
      done();
    });
  });
});

describe('tizenTask asRoot', function () {
  var bridge = {
    install: function () {},
    root: function () {}
  };

  var tasks = tasksMaker({
    bridge: bridge,
    tizenConfig: {}
  });

  var err = new Error();

  var data = {
    action: 'install',
    asRoot: true,
    remoteFiles: '/tmp/package.wgt'
  };

  it('should fail task immediately if asRoot:true fails', function (done) {
    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('root')
              .withArgs(true, aFunction)
              .callsArgWith(1, err)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      error.should.equal(err);
      done();
    });
  });

  it('should run task if asRoot:true succeeds but fail when ' +
     'asRoot:false fails', function (done) {
    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('root')
              .withArgs(true, aFunction)
              .callsArg(1)
              .once();

    mockBridge.expects('install')
              .withArgs(data.remoteFiles, aFunction)
              .callsArg(1)
              .once();

    mockBridge.expects('root')
              .withArgs(false, aFunction)
              .callsArgWith(1, err)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      error.should.equal(err);
      done();
    });
  });

  it('should fail if asRoot:true succeeds but subcommand fails ' +
     'but still run asRoot:false', function (done) {
    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('root')
              .withArgs(true, aFunction)
              .callsArg(1)
              .once();

    mockBridge.expects('install')
              .withArgs(data.remoteFiles, aFunction)
              .callsArgWith(1, err)
              .once();

    mockBridge.expects('root')
              .withArgs(false, aFunction)
              .callsArg(1)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      error.should.equal(err);
      done();
    });
  });

  it('should run task successfully if asRoot:true, bridge action ' +
     ' and asRoot:false all succeed', function (done) {
    var mockBridge = sinon.mock(bridge);

    mockBridge.expects('root')
              .withArgs(true, aFunction)
              .callsArg(1)
              .once();

    mockBridge.expects('install')
              .withArgs(data.remoteFiles, aFunction)
              .callsArg(1)
              .once();

    mockBridge.expects('root')
              .withArgs(false, aFunction)
              .callsArg(1)
              .once();

    tasks.tizenTask(data, function (error) {
      mockBridge.verify();
      expect(error).to.be.undefined;
      done();
    });
  });
});
