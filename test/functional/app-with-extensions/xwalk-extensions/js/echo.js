/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
var callbacks = [];

extension.setMessageListener(function(msg) {
  // each callback only gets invoked once; we delete it after
  // calling it
  for (var i = 0; i < callbacks.length; i += 1) {
    callbacks[i](msg);
    delete callbacks[i];
  };
});

// really this should pass a JSON string which includes the ID
// of the caller; the Java code should then return this ID with its
// response, so the correct callback can be retrieved and invoked
exports.echo = function (msg, callback) {
  callbacks.push(callback);
  extension.postMessage(msg);
};

exports.echoSync = function (msg) {
  return extension.internal.sendSyncMessage(msg);
};
