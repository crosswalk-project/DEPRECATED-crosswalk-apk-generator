/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var path = require('path');

var chai = require('chai');
chai.should();

var pathHelpers = require('../../src/path-helpers');

describe('fixSeparators()', function () {

  it('should fix path separators in a string for current OS', function () {
    // this gives us an OS-specific path
    var expected = path.join('foo', 'bar', 'baz');

    var actual = pathHelpers.fixSeparators('foo/bar/baz');
    actual.should.equal(expected);
  });

  it('should fix path separators in a string when passed as an argument', function () {
    var expected = '\\foo\\bar\\baz';
    var actual = pathHelpers.fixSeparators('/foo/bar/baz', 'windows');
    actual.should.equal(expected);

    expected = 'foo\\bar\\baz\\';
    actual = pathHelpers.fixSeparators('foo/bar/baz/', 'windows');
    actual.should.equal(expected);

    expected = 'foo\\bar\\baz';
    actual = pathHelpers.fixSeparators('foo/bar/baz', 'windows');
    actual.should.equal(expected);

    expected = '\\foo\\bar\\baz\\';
    actual = pathHelpers.fixSeparators('/foo/bar/baz/', 'windows');
    actual.should.equal(expected);
  });

});

describe('stripTrailingSeparators()', function () {

  it('should remove all trailing forward slash characters', function () {
    pathHelpers.stripTrailingSeparators('/moo/bar').should.equal('/moo/bar');
    pathHelpers.stripTrailingSeparators('/moo/bar/').should.equal('/moo/bar');
    pathHelpers.stripTrailingSeparators('/moo/bar//').should.equal('/moo/bar');
  });

  it('should remove all trailing back slash characters', function () {
    pathHelpers.stripTrailingSeparators('\\moo\\bar').should.equal('\\moo\\bar');
    pathHelpers.stripTrailingSeparators('\\moo\\bar\\').should.equal('\\moo\\bar');
    pathHelpers.stripTrailingSeparators('\\moo\\bar\\\\').should.equal('\\moo\\bar');
  });
});
