var chai = require('chai')
chai.should();
var expect = chai.expect;

var sinon = require('sinon');

var Bridge = require('../../lib/bridge');

describe('Bridge', function () {
  /**
   * NB these tests don't test whether the logger is invoked with
   * the right strings: they just test that the sdb wrapper and
   * file lister are invoked correctly, and that the responses are
   * parsed properly, returning the correct values to the callback
   */
  var logger = {
    write: function () {},
    ok: function () {},
    error: function () {},
    warn: function () {}
  };

  var sdbWrapper = {
    execute: function () {},
    shell: function () {},
    push: function () {},
    forward: function () {},
    root: function () {}
  };

  var bridge = Bridge.init({
    logger: logger,
    sdbWrapper: sdbWrapper,
    fileLister: {}
  });

  var mockSdbWrapper;
  beforeEach(function () {
    mockSdbWrapper = sinon.mock(sdbWrapper);
  });

  it('should require logger property on creation', function () {
    var testConstruct = function () {
      Bridge.init({})
    };

    var expected = 'Bridge must be initialised with a logger instance';

    expect(testConstruct).to.throw(expected);
  });

  it('should require sdbWrapper property on creation', function () {
    var testConstruct = function () {
      Bridge.init({
        logger: {}
      })
    };

    var expected = 'Bridge must be initialised with an sdbWrapper instance';

    expect(testConstruct).to.throw(expected);
  });

  it('should require sdbWrapper property on creation', function () {
    var testConstruct = function () {
      Bridge.init({
        logger: {},
        sdbWrapper: {}
      })
    };

    var expected = 'Bridge must be initialised with the fileLister instance';

    expect(testConstruct).to.throw(expected);
  });

  describe('fileExists()', function () {
    var remotePath = '/tmp/foo.txt';
    var cb = sinon.spy();

    it('should callback with true if file exists', function () {
      mockSdbWrapper.expects('shell')
                    .withArgs('stat ' + remotePath, sinon.match.instanceOf(Function))
                    .callsArgWith(1, null, '', '')
                    .once();

      bridge.fileExists(remotePath, cb);

      cb.calledWith(null, true).should.be.true;
      mockSdbWrapper.verify();
    });

    it('should callback with false if file does not exist', function () {
      mockSdbWrapper.expects('shell')
                    .withArgs('stat ' + remotePath, sinon.match.instanceOf(Function))
                    .callsArgWith(1, null, 'No such file or directory', '')
                    .once();

      bridge.fileExists(remotePath, cb);

      cb.calledWith(null, false).should.be.true;
      mockSdbWrapper.verify();
    });

    it('should callback with error if error occurs when invoking sdb', function () {
      mockSdbWrapper.expects('shell')
                    .withArgs('stat ' + remotePath, sinon.match.instanceOf(Function))
                    .callsArgWith(1, new Error())
                    .once();

      bridge.fileExists(remotePath, cb);

      cb.calledWith(sinon.match(Error)).should.be.true;
      mockSdbWrapper.verify();
    });
  });

  describe('chmod()', function () {
    var remotePath = '/tmp/somescript.sh';
    var chmodStr = '+x';
    var cb = sinon.spy();

    it('should callback with no error if chmod worked', function () {
      mockSdbWrapper.expects('shell')
                    .withArgs(
                      'chmod ' + chmodStr + ' ' + remotePath,
                      sinon.match.instanceOf(Function)
                    )
                    .callsArgWith(1, null, '', '')
                    .once();

      bridge.chmod(remotePath, chmodStr, cb);

      cb.calledOnce.should.be.true;
      mockSdbWrapper.verify();
    });

    it('should callback with no error if chmod failed', function () {
      mockSdbWrapper.expects('shell')
                    .withArgs(
                      'chmod ' + chmodStr + ' ' + remotePath,
                      sinon.match.instanceOf(Function)
                    )
                    .callsArgWith(1, new Error())
                    .once();

      bridge.chmod(remotePath, chmodStr, cb);

      cb.calledWith(sinon.match(Error)).should.be.true;
      mockSdbWrapper.verify();
    });
  });

  describe('listRemoteFiles()', function () {
    it('should callback with the file path passed in if it is a string', function () {
      var cb = sinon.spy()
      var filename = '/tmp/package.wgt';

      bridge.listRemoteFiles(filename, cb);

      cb.calledWith(null, [filename]).should.be.true
    });

    it('should callback with the file paths passed in if passed an array', function () {
      var cb = sinon.spy()
      var filenames = ['/tmp/package.wgt', '/tmp/package2.wgt'];

      bridge.listRemoteFiles(filenames, cb);

      cb.calledWith(null, filenames).should.be.true
    });

    it('should callback with error if ls fails on the sdb shell', function () {
      var cb = sinon.spy()
      var filespec = {pattern: '/tmp/*.wgt'};

      mockSdbWrapper.expects('shell')
                    .withArgs(
                      'ls -1 -c ' + filespec.pattern,
                      sinon.match.instanceOf(Function)
                    )
                    .callsArgWith(1, new Error())
                    .once();

      bridge.listRemoteFiles(filespec, cb);

      cb.calledWith(sinon.match(Error)).should.be.true;
      mockSdbWrapper.verify();
    });

    it('should callback with matching files if ls successful', function () {
      var cb = sinon.spy();

      var filespec = {pattern: '/tmp/*.wgt'};
      var stdout = 'young.wgt\nold.wgt';
      var expected = ['young.wgt', 'old.wgt'];

      mockSdbWrapper.expects('shell')
                    .withArgs(
                      'ls -1 -c ' + filespec.pattern,
                      sinon.match.instanceOf(Function)
                    )
                    .callsArgWith(1, null, stdout, '')
                    .once();

      bridge.listRemoteFiles(filespec, cb);

      cb.lastCall.args[1].should.eql(expected);
      mockSdbWrapper.verify();
    });

    it('should callback with first file in list if filter set to "latest"', function () {
      var cb = sinon.spy();

      var filespec = {pattern: '/tmp/*.wgt', filter: 'latest'};
      var stdout = 'young.wgt\nold.wgt';
      var expected = ['young.wgt'];

      mockSdbWrapper.expects('shell')
                    .withArgs(
                      'ls -1 -c ' + filespec.pattern,
                      sinon.match.instanceOf(Function)
                    )
                    .callsArgWith(1, null, stdout, '')
                    .once();

      bridge.listRemoteFiles(filespec, cb);

      cb.lastCall.args[1].should.eql(expected);
      mockSdbWrapper.verify();
    });
  });
});
