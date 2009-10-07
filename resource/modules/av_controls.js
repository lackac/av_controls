/*
 * ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is AVControls.
 *
 * The Initial Developer of the Original Code is
 * László Bácsi.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK *****
*/

Components.utils.import("resource://av_controls/modules/Sync.js");
Components.utils.import("resource://av_controls/modules/tools.js");

var EXPORTED_SYMBOLS = ["AVControls"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var Application = Cc["@mozilla.org/fuel/application;1"]
                    .getService(Ci.fuelIApplication);

var Private = {
  busy: false,
  icon: 'chrome://av_controls/skin/av_controls_icon.png',
  iconDisabled: 'chrome://av_controls/skin/av_controls_icon_disabled.png',
  iconWorking: 'chrome://global/skin/icons/loading_16.png',
  iPlay: 'chrome://av_controls/skin/play.png',
  iPause: 'chrome://av_controls/skin/pause.png',
  iRewind: 'chrome://av_controls/skin/rewind.png',
  iFullscreen: 'chrome://av_controls/skin/fullscreen.png',

  aboutURI: "chrome://av_controls/content/about.xhtml",
  fullscreenExtURI: "http://en.design-noir.de/mozilla/fullscreen-video/",

  fsSupported: Application.extensions.get('fullscreen-video@design-noir.de'),

  getIconSrc: function() {
    return Private.busy ? Private.iconWorking : AVControls.getEnabled() ? Private.icon : Private.iconDisabled;
  }
}

var AVControls = {
  ext: Application.extensions.get('av_controls@lackac.hu'),

  toggleEnabled: function() {
    AVControls.setEnabled(!AVControls.getEnabled());
  },

  toggleHideControls: function() {
    AVControls.setHideControls(!AVControls.getHideControls());
  },

  getEnabled: function() {
    return AVControls.ext.prefs.getValue('enabled', true);
  },
  setEnabled: function(v) {
    AVControls.ext.prefs.setValue('enabled', v);
  },

  getHideControls: function() {
    return this.ext.prefs.getValue('hide_controls', false);
  },
  setHideControls: function(v) {
    this.ext.prefs.setValue('hide_controls', v);
  },

  getKeepLast: function() {
    return AVControls.ext.prefs.getValue('keep_last', true);
  },

  refreshStatusbars: function(force) {
    Application.windows.forEach(function(appWindow) {
      var w = appWindow._window;
      if (w.avControlsOverlay !== undefined && typeof w.avControlsOverlay.refreshStatusbar == "function") {
        w.avControlsOverlay.refreshStatusbar(force);
      }
    });
  }
}

AVControls.Overlay = function(window) {
  var document = window.document;
  var fWindow;
  for (var i = 0; i < Application.windows.length; i++) {
    if (Application.windows[i]._window == window) {
      fWindow = Application.windows[i];
      break;
    }
  }
  var self = {};

  function playOrPause() {
    var media;
    var pp = document.getElementById('av-controls-pp');
    if (media = self.getMedia()) {
      if (media.paused || media.ended) {
        media.play();
        pp.setAttribute('src', Private.iPause);
      } else {
        media.pause();
        pp.setAttribute('src', Private.iPlay);
      }
    }
  }

  function rewind() {
    var media;
    if (media = self.getMedia()) {
      media.pause();
      media.currentTime = 0;
    }
  }

  function seek(pos) {
    var media;
    if ((media = self.getMedia()) && media.duration) {
      media.currentTime = pos * media.duration;
    }
  }

  function fullscreen() {
    var media;
    if (Private.fsSupported && (media = self.getMedia())) {
      media.pause();
      window.openDialog("chrome://fullscreen-video/content/video.xhtml", "", "chrome,dialog=no", media.src);
    }
  }

  function updateProgress(media) {
    if (media === undefined) {
      media = self.getMedia();
    }
    var progress = document.getElementById('av-controls-progress-indicator');
    if (media && media.duration) {
      var bar = document.getElementById('av-controls-progress-bar');
      progress.setAttribute('width', Math.round(media.currentTime/media.duration*bar.getAttribute('width')));
    } else {
      progress.setAttribute('width', 0);
    }
  }

  function setupStatusbar() {
    var pp = document.getElementById('av-controls-pp');
    pp.addEventListener('click', function(e) {
      if (e.button == 0) {
        playOrPause();
      }
    }, false);

    var rew = document.getElementById('av-controls-rewind');
    rew.addEventListener('click', function(e) {
      if (e.button == 0) {
        rewind();
      }
    }, false);

    var mouseDown = false;
    var progress = document.getElementById('av-controls-progress-bar');
    var doSeek = function(e) {
      var left = pp.getClientRects()[0].right;
      var pos = (e.clientX-left)/progress.getAttribute('width');
      seek(pos);
    }
    progress.addEventListener('mousedown', function(e) {
      doSeek(e);
      mouseDown = true;
    }, false);
    progress.addEventListener('mousemove', function(e) {
      if (mouseDown) {
        doSeek(e);
      }
    }, false);
    progress.addEventListener('mouseup', function(e) {
      if (mouseDown) {
        doSeek(e);
        mouseDown = false;
      }
    }, false);
    progress.addEventListener('mouseout', function(e) {
      if (mouseDown) {
        doSeek(e);
        mouseDown = false;
      }
    }, false);

    var fs = document.getElementById('av-controls-fullscreen');
    if (Private.fsSupported) {
      fs.addEventListener('click', function(e) {
        if (e.button == 0) {
          fullscreen();
        }
      }, false);
    } else {
      fs.style.display = 'none';
    }
  }

  function setupPopup() {
    var popup = document.getElementById('av-controls-popup');
    popup.addEventListener('popupshowing', function(e) {
      var enabledItem = document.getElementById('av-controls-enabled');
      enabledItem.label = AVControls.getEnabled() ? 'Disable' : 'Enable';
      var hideControlsItem = document.getElementById('av-controls-hide-controls');
      hideControlsItem.label = AVControls.getHideControls() ? 'Show Controls' : 'Hide Controls';
      var fsSupportItem = document.getElementById('av-controls-add-fs-support');
      if (Private.fsSupported) {
        fsSupportItem.style.display = 'none';
      }
    }, false);
  }

  function setupPageLoadListener() {
    var appcontent = document.getElementById("appcontent");
    if (appcontent) {
      appcontent.addEventListener("DOMContentLoaded", function(event) {
        var doc = event.originalTarget;
        if (doc == fWindow.activeTab.document) {
          self.refreshStatusbar(true);
        }
      }, true);
    }

    fWindow.events.addListener("TabSelect", function(event) {
      self.refreshStatusbar(true);
    });
  }

  function setupPrefChangeListener() {
    var prefListener = new Tools.PrefListener(
      "extensions."+AVControls.ext.id+".",
      function(branch, name) {
        switch (name) {
          case "enabled":
          case "hide_controls":
            AVControls.refreshStatusbars();
            break;
          case "keep_last":
            AVControls.refreshStatusbars(true);
            break;
        }
      }
    );
    prefListener.register();
  }

  self.init = function() {
    setupStatusbar();
    setupPopup();
    setupPageLoadListener();

    self.initialized = true;
    if (AVControls.initialized) {
      self.refreshStatusbar();
    } else {
      setupPrefChangeListener();
      self.refreshStatusbar();
      AVControls.initialized = true;
    }
  }

  var mediaEvents = {
    play: function(e) {
      mediaEvents.waiting(false);
      var pp = document.getElementById('av-controls-pp');
      pp.setAttribute('src', Private.iPause);
    },
    pause: function(e) {
      mediaEvents.waiting(false);
      var pp = document.getElementById('av-controls-pp');
      pp.setAttribute('src', Private.iPlay);
    },
    waiting: function(e) {
      if (e === false && Private.busy === true) {
        Private.busy = false;
        self.refreshStatusbar();
      }
      if (e && !Private.busy) {
        Private.busy = true;
        self.refreshStatusbar();
      }
    },
    seeked: function(e) {
      mediaEvents.waiting(false);
      updateProgress(e.target);
    },
    timeupdate: function(e) {
      mediaEvents.waiting(false);
      updateProgress(e.target);
    },
    ended: function(e) {
      mediaEvents.waiting(false);
      var pp = document.getElementById('av-controls-pp');
      pp.setAttribute('src', Private.iPlay);
    }
  }

  self.getMedia = function(reload) {
    var doc = fWindow.activeTab.document;
    if (!reload && doc._avc_media) return doc._avc_media;

    var media;
    doc._avc_media = null;
    media = doc.getElementsByTagName('video');
    if (media.length == 0) {
      media = doc.getElementsByTagName('audio');
    }
    if (media.length > 0) {
      media = media[0];
      if (window._avc_last_media) {
        for (var e in mediaEvents) {
          window._avc_last_media.removeEventListener(e, mediaEvents[e], false);
        }
      }
      doc._avc_media = window._avc_last_media = media;
      for (var e in mediaEvents) {
        media.addEventListener(e, mediaEvents[e], false);
      }
      return media;
    }
    if (AVControls.getKeepLast()) {
      return window._avc_last_media;
    }
  }

  self.refreshStatusbar = function(force) {
    var enabled = AVControls.getEnabled();
    var media = self.getMedia(force);
    var controlsHidden = AVControls.getHideControls() || !media;

    var icon = document.getElementById('av-controls-statusbar');
    var controls = document.getElementById('av-controls-controls');
    var pp = document.getElementById('av-controls-pp');

    if (media) {
      pp.setAttribute('src', media.paused || media.ended ? Private.iPlay : Private.iPause);
      updateProgress(media);
    }

    icon.src = Private.getIconSrc();

    controls.style.display = controlsHidden || !enabled ? 'none' : '-moz-box';
  }

  function findOrOpen(uri) {
    return function() {
      var activeWin = Application.activeWindow;
      var tab = null;
      activeWin.tabs.forEach(function(t) {
        if (t.uri.spec == uri) {
          tab = t;
        }
      }, this);
      if (tab) {
        tab.focus();
      } else {
        var ios = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);
        activeWin.open(ios.newURI(uri, null, null)).focus();
      }
    }
  }

  self.openAbout = findOrOpen(Private.aboutURI);
  self.goToFullscreenExt = findOrOpen(Private.fullscreenExtURI);

  self.openPrefs = function() {
    window.openDialog("chrome://av_controls/content/options.xul", "avControlsOptions", "chrome,titlebar,toolbar,centerscreen");
  }

  return self;
}
