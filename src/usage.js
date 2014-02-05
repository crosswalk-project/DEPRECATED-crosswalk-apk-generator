/*jslint node: true*/
'use strict';

/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

var _ = require('lodash');

/**
 * Show basic usage info from an options hash of the type passed
 * to nconf.
 * msg: message to show at the top of the usage message.
 * opts: options hash compatible with nconf; can also include
 * a "section" property in each option setting, to break the options
 * into sections in the usage message for better formatting.
 */
module.exports = function (msg, opts) {
  // gather option info into separate sections for better formatting
  var sections = {};

  _.each(opts, function (config, optName) {
    var sectionName = config.section || 'General';
    var section = sections[sectionName];

    if (!section) {
      sections[sectionName] = [];
      section = sections[sectionName];
    }

    var str = '';

    str += '  --' + optName;

    if (config.alias) {
      str += ', ';

      if (config.alias.length > 1) {
        str += '--';
      }
      else {
        str += '-';
      }

      str += config.alias;
    }

    if (typeof config.default !== 'undefined') {
      str += ' (default: ' + JSON.stringify(config.default) + ')';
    }
    else if (config.defaultDescription) {
      str += ' (default: <' + config.defaultDescription + '>)';
    }

    str += '\n    ';

    str += config.describe || '';

    str += '\n';

    section.push(str);
  });

  msg += '\n\n';

  if (_.keys(sections).length > 1) {
    _.each(sections, function (messages, sectionName) {
      msg += sectionName + ' options:\n\n' +
             messages.join('\n') + '\n';
    });
  }
  else {
    msg += sections.General.join('\n') + '\n';
  }

  return msg;
};
