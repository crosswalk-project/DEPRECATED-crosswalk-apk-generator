var chai = require('chai')
chai.should();
var expect = chai.expect;

var sinon = require('sinon');

var Bridge = require('../../lib/bridge');

describe('Bridge', function () {
  var mockLogger;
  var mockSdbWrapper;

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

  beforeEach(function () {
    mockLogger = sinon.mock(logger);
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
    var bridge = Bridge.init({
      logger: logger,
      sdbWrapper: sdbWrapper,
      fileLister: {}
    });

    it('should callback with true if file exists', function () {
      var cb = sinon.spy();
      var remotePath = '/tmp/foo.txt';

      mockSdbWrapper.expects('shell')
                    .withArgs('stat ' + remotePath, sinon.match.instanceOf(Function))
                    .callsArgWith(1, null, '', '')
                    .once();

      bridge.fileExists(remotePath, cb);

      cb.calledWith(null, true).should.be.true;
      mockSdbWrapper.verify();
    });

    it('should callback with false if file does not exist', function () {

    });

    it('should callback with error if error occurs when invoking sdb', function () {

    });
  });

});
