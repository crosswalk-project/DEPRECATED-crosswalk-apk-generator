/*jslint node: true*/
'use strict';

var _ = require('lodash');

var fixsep = require('./path-helpers').fixSeparators;

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */


/*
 * validRegexes: array of strings representing regexes that propertyValue
 * could match for the criterion to be met;
 * propertyValue: the value under test
 * returns true if propertyValue regex matches (case insensitive) at
 * least one of the values in validRegexes
 */
var matchesCriterion = function (validRegexes, propertyValue) {
  return _.some(validRegexes, function (validRegex) {
    var regex = new RegExp(validRegex, 'i');
    return regex.test(propertyValue);
  });
};

/**
 * Loader for a JSON file which defines the probable locations of "pieces"
 * (files and directories) relative to a parent directory.
 *
 * This class parses the JSON file into an object usable by a
 * {@link Finder} instance.
 *
 * @constructor
 */
var FinderPieces = function () {
  if (!(this instanceof FinderPieces)) {
    return new FinderPieces();
  }
};

/**
 * Get pieces required for a query. This is primarily used to determine
 * which files and directories are needed for a build for a particular
 * Crosswalk version/architecture.
 *
 * The data/xwalk-android-archive-structure.json file contains the
 * definitions used to populate an {@link Env} object with the locations
 * of Crosswalk pieces needed to build an apk.
 *
 * @param {object} defs - an array of definitions, mapping
 * criteria to pieces, with this structure:
 *
 *  [
 *    {
 *      "criteria": {
 *        "<field 1>": ["<matcher 1>"],
 *        "<field 2>": ["<matcher 2>"]
 *      },
 *      "pieces": {
 *        "<piece name>": {
 *          "dirs": [ ... directories to find ... ]
 *        },
 *        "<piece name 2>": {
 *          "files": [ ... files to find ... ],
 *          "guessDirs": [ ... directories files may be in ... ]
 *        },
 *        "<piece name 3>": {
 *          "resDirs": [ ... Android resource directories ... ],
 *          "libs": [ ... directories containing jar files ... ],
 *          "pkg": "package.to.use.for.R.java"
 *        }
 *      }
 *    },
 *    ...
 *  ]
 *
 * The criteria.fields are matched against fields in the query object,
 * to decide whether the pieces for this def are applicable for the
 * query.
 *
 * The matcher is an array of strings; each string is a regex-style
 * pattern or literal string.
 *
 * If any string from the matcher array for a property matches the
 * query's value for the same property,
 * that property is counted as a match; if all the criteria.fields
 * match the query fields, the pieces specified for the def are
 * required and added to the result object.
 *
 * @param {object} query - an object specifying parameters for the
 * query used to filter the required pieces; for example:
 *
 *   { version: "4.0.2.2", arch: "arm" }
 *
 * would only select pieces matching version 4.0.2.2 and all architectures;
 * and pieces matching version 4.0.2.2 and ARM architecture
 *
 * @returns {object} containing all pieces required to satisfy the
 * parameters in the query
 */
FinderPieces.prototype.getPiecesForQuery = function (defs, query) {
  return _.reduce(defs, function (memo, def) {
    var matches = _.every(def.criteria, function (validRegexes, property) {
      return matchesCriterion(validRegexes, query[property]);
    });

    if (matches) {
      _.each(def.pieces, function (props, pieceName) {
        var pathsFixed = _.reduce(props, function (propValue, propName) {
          // fix separators for any properties whose values are paths
          if (propName === 'dirs' ||
              propName === 'guessDirs' ||
              propName === 'libs' ||
              propName === 'resDirs') {
            propValue = _.map(propValue, function (oneValue) {
              return fixsep(oneValue);
            });
          }

          memo[propName] = propValue;

          return memo;
        }, {});

        memo[pieceName] = pathsFixed;
      });
    }

    return memo;
  }, {});
};

module.exports = FinderPieces;
