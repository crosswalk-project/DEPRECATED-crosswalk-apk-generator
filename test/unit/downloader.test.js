/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

var sinon = require('sinon');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.should();
var expect = chai.expect;

var Q = require('q');
var _ = require('lodash');

var EventEmitter = require('events').EventEmitter;

var Downloader = require('../../src/downloader');

// write stream stub
var StubWriteStream = function () {
  EventEmitter.call(this);
};

StubWriteStream.prototype.__proto__ = EventEmitter.prototype;

// we need to trigger a finish event when end() is called; this
// is how the Downloader knows that write events are done
StubWriteStream.prototype.end = function () {
  this.emit('finish');
};

// fs stub; set existsSyncValue to true to always return true for
// calls to fs.existsSync(); defaults to returning false
var StubFs = function (existsSyncValue) {
  this.existsSyncValue = existsSyncValue;
};

StubFs.prototype.existsSync = function () {
  return this.existsSyncValue || false;
};

StubFs.prototype.createWriteStream = function () {
  return new StubWriteStream();
};

// stub http stream;
// events is an array of events to start firing once the pipe()
// function is called, in the form
// {name: <event name>, data: <data to pass to event listeners>}
// note that calling pipe() makes each event fire in order,
// then fires an "end" event (as long as no "error" events were fired)
var StubHttpStream = function (events) {
  EventEmitter.call(this);
  this.stubEvents = events;
  this.eventIndex = 0;
};

StubHttpStream.prototype.__proto__ = EventEmitter.prototype;

StubHttpStream.prototype.pipe = function () {};

StubHttpStream.prototype.triggerEvents = function () {
  for (var i = 0; i < this.stubEvents.length; i += 1) {
    var eventName = this.stubEvents[i].name;
    var eventData = this.stubEvents[i].data;
    this.emit(eventName, eventData);
  }

  this.emit('end');
};

describe('Downloader', function () {

  it('should reject if an error occurs during HTTP request', function (done) {
    var stream = new StubHttpStream([
      {name: 'meta', data: {responseHeaders: {'content-length': 8}}},
      {name: 'data', data: 'aa'},
      {name: 'error', data: new Error('network connection lost')}
    ]);

    var downloader = Downloader({
      createHttpStream: function () {
        return stream;
      },

      fs: new StubFs(false)
    });

    downloader.download('http://foo/bar.zip', 'foo')
    .should.be.rejectedWith(/network connection lost/).and.notify(done);

    stream.triggerEvents();
  });

  it('should reject if the output filename already exists', function (done) {
    var downloader = Downloader({
      createHttpStream: function () {},

      // this stub returns true for existsSync()
      fs: new StubFs(true)
    });

    var expected = new RegExp('output file foo.+bar.zip already exists');

    downloader.download('http://foo/bar.zip', 'foo')
    .should.be.rejectedWith(expected)
    .and.notify(done);
  });

  it('should download and display progress for a URL', function (done) {
    // stub stream; once the downloader is set up, we can trigger
    // its pretend events
    var stream = new StubHttpStream([
      {name: 'meta', data: {responseHeaders: {'content-length': 8}}},
      {name: 'data', data: 'aa'},
      {name: 'data', data: 'bb'},
      {name: 'data', data: 'cc'},
      {name: 'data', data: 'dd'}
    ]);

    // we use this to record progress notifications
    var progressCb = sinon.spy();

    var downloader = Downloader({
      createHttpStream: function () {
        return stream;
      },

      fs: new StubFs(false)
    });

    downloader.download('http://foo/bar.zip', 'foo')
    .done(
      function (outPath) {
        outPath.should.equal(path.join('foo', 'bar.zip'));

        // test the calls to the progress callback
        progressCb.should.have.been.calledWith(25);
        progressCb.should.have.been.calledWith(50);
        progressCb.should.have.been.calledWith(75);
        progressCb.should.have.been.calledWith(100);

        done();
      },

      done,

      // should receive progress events
      progressCb
    );

    // everything ready, run the pretend events in sequence
    stream.triggerEvents();
  });

});
