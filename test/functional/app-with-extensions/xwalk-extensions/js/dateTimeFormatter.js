/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
exports.format = function (msg) {
  return extension.internal.sendSyncMessage(msg);
};
