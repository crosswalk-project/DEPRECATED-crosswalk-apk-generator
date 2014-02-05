/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
package my.extensions.app;

import org.xwalk.app.runtime.extension.XWalkExtensionClient;
import org.xwalk.app.runtime.extension.XWalkExtensionContextClient;

public class Echo extends XWalkExtensionClient {
  public Echo(String name, String jsApiContent, XWalkExtensionContextClient context) {
    super(name, jsApiContent, context);
  }

  @Override
  public void onMessage(int instanceId, String message) {
    String id = Integer.toString(instanceId);
    postMessage(instanceId, id + ": from java: " + message);
  }

  @Override
  public String onSyncMessage(int instanceId, String message) {
    return "From java sync: " + message;
  }
}
