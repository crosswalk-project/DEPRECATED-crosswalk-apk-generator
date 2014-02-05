/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
package my.extensions.app;

import java.io.File;
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;
import org.xwalk.app.runtime.extension.XWalkExtensionClient;
import org.xwalk.app.runtime.extension.XWalkExtensionContextClient;
import org.apache.commons.io.FileUtils;
import com.google.gson.Gson;
import android.os.Environment;
import android.content.Context;

public class AudioFileLister extends XWalkExtensionClient {
  public AudioFileLister(String name, String jsApiContent, XWalkExtensionContextClient context) {
    super(name, jsApiContent, context);
  }

  private static String[] FILE_EXTS = {"mp3"};
  private Gson gson = new Gson();

  private boolean musicDirectoryReadable() {
    String state = Environment.getExternalStorageState();
    return Environment.MEDIA_MOUNTED_READ_ONLY.equals(state) ||
           Environment.MEDIA_MOUNTED.equals(state);
  }

  // returns JSON stringified version of:
  // {success: false, error: <error message>} on error
  // {success: true, files: [<file URI>, ...]} on success
  private String listFiles() {
    if (musicDirectoryReadable()) {
      File audioDir = Environment.getExternalStoragePublicDirectory(
        Environment.DIRECTORY_MUSIC
      );

      Iterator<File> fileIterator = FileUtils.iterateFiles(audioDir, FILE_EXTS, true);

      List<FileInfo> files = new ArrayList<FileInfo>();

      File f;
      while (fileIterator.hasNext()) {
        f = fileIterator.next();
        files.add(new FileInfo(f));
      }

      String filesJson = gson.toJson(files);

      return "{\"success\": true, \"files\": " + filesJson + "}";
    }
    else {
      return "{\"success\": false, \"error\":\"audio directory not readable\"}";
    }
  }

  // message is "list-files"
  private String runCmd(String message) {
    if (message.equals("list-files")) {
      return listFiles();
    }
    else {
      return "{\"success\": false, \"error\":\"invalid command specified\"}";
    }
  }

  @Override
  public void onMessage(int instanceId, String message) {
    postMessage(instanceId, runCmd(message));
  }

  @Override
  public String onSyncMessage(int instanceId, String message) {
    return runCmd(message);
  }
}
