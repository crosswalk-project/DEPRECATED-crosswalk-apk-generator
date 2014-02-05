/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */

// returns an array of uris for mp3 files on the device;
// these are playable URIs if inserted into an <audio> element
// as the src attribute
exports.listFiles = function () {
  var result = extension.internal.sendSyncMessage('list-files');
  return JSON.parse(result);
};
