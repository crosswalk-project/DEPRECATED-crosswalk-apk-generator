require('chai').should();

var path = require('path');

var FinderPieces = require('../../src/finder-pieces');

describe('FinderPieces', function () {
  var finderPieces = FinderPieces();

  var defs = [
    {
      criteria: {
        version: ['3', '4']
      },

      pieces: {
        foo: {
          files: ['a', 'b'],
          guessDirs: ['libs', 'libs/new']
        }
      }
    },

    {
      criteria: {
        version: ['3', '4'],
        arch: ['arm']
      },

      pieces: {
        native: {
          dirs: ['ca', 'da']
        }
      }
    },

    {
      criteria: {
        version: ['3', '4'],
        arch: ['x86']
      },

      pieces: {
        native: {
          dirs: ['cx', 'dx']
        }
      }
    }
  ];

  it('should include pieces where the query matches a def\'s criteria', function () {
    var query = {
      arch: 'arm',
      version: '4.0.0.2'
    };

    var expected = {
      // matches version
      foo: {
        files: ['a', 'b'],
        guessDirs: ['libs', path.join('libs', 'new')]
      },

      // matches arch and version
      native: {
        dirs: ['ca', 'da']
      }

      // NB the x86-specific pieces are not required
    };

    var pieces = finderPieces.getPiecesForQuery(defs, query);
    pieces.should.eql(expected);
  });

});
