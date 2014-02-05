/* Copyright (c) 2014 Intel Corporation. All rights reserved.
 * Use of this source code is governed by an Apache v2 license that can be
 * found in the LICENSE-APACHE-V2 file. */
package my.extensions.app;

import java.io.File;
import entagged.audioformats.AudioFileIO;
import entagged.audioformats.AudioFile;
import entagged.audioformats.Tag;
import entagged.audioformats.exceptions.CannotReadException;

public class FileInfo {
  public String uri;
  public String title;
  public String artist;

  private static String UNREADABLE_VALUE = "__UNREADABLE__";

  private void setUnreadable() {
    this.title = UNREADABLE_VALUE;
    this.artist = UNREADABLE_VALUE;
  };

  private void setMeta(File f) {
    this.uri = f.toURI().toString();

    try {
      AudioFile af = AudioFileIO.read(f);
      Tag t = af.getTag();
      this.title = t.getFirstTitle();
      this.artist = t.getFirstArtist();
    }
    catch (CannotReadException e) {
      setUnreadable();
    }
  }

  public FileInfo(File f) {
    this.setMeta(f);
  }
}
