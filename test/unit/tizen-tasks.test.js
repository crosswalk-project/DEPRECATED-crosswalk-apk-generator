// test generated task functions
var chai = require('chai');
chai.should();
var expect = chai.expect;

var sinon = require('sinon');

var taskMaker = require('../../lib/tizen-tasks');

describe('tizen-tasks', function () {

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
  it('should callback with error if push fails', function (done) {
    done();
  });

  it('should callback with error if shell fails', function (done) {
    done();
  });

  it('should callback with 0 args if push + shell succeed', function (done) {
    done();
  });
});

describe('tizenTask', function () {
  it('should fail if no action is specified', function (done) {
    done();
  });

  it('should fail if invalid action is specified', function (done) {
    done();
  });
});
