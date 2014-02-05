/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
package my.extensions.app;

import org.xwalk.app.runtime.extension.XWalkExtensionClient;
import org.xwalk.app.runtime.extension.XWalkExtensionContextClient;
import org.apache.commons.lang3.time.DateFormatUtils;
import java.lang.Long;

public class DateTimeFormatter extends XWalkExtensionClient {
  // Don't change the parameters in Constructor because XWalk needs to call this constructor.
  public DateTimeFormatter(String name, String jsApiContent, XWalkExtensionContextClient context) {
    super(name, jsApiContent, context);
  }

  private String format(String message) {
    String msg = "";

    try {
      long ms = Long.parseLong(message, 10);
      msg = DateFormatUtils.format(ms, "yyyy-MM-dd HH:mm:ss");
    }
    catch (Exception e) {
      msg = e.getMessage();
    }

    return msg;
  }

  @Override
  // message is a string representing millisecs; this extension formats
  // it nicely;
  // we could easily do it in JavaScript, but then how could I
  // demonstrate extensions?
  public String onSyncMessage(int instanceId, String message) {
    return format(message);
  }
}
