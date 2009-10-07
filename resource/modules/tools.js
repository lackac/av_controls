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

var EXPORTED_SYMBOLS = ["Tools"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var Tools = {
  openDialog: function(parentWindow, url, windowName, features) {
    var array = Cc["@mozilla.org/array;1"]
                  .createInstance(Ci.nsIMutableArray);
    for (var i = 4; i < arguments.length; i++) {
      var variant = Cc["@mozilla.org/variant;1"]
                      .createInstance(Ci.nsIWritableVariant);
      variant.setFromVariant(arguments[i]);
      array.appendElement(variant, false);
    }

    features = features.split(/[,\s]+/);
    var defaults = ["chrome", "dialog", "alwaysRaised", "centerscreen"];
    defaults.forEach(function(feature) {
      if (features.indexOf(feature) == -1) {
        features.push(feature);
      }
    });
    features = features.join(",");

    var watcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Ci.nsIWindowWatcher);
    return watcher.openWindow(parentWindow, url, windowName, features, array);
  },

  alert: function(message, title) {
    var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Ci.nsIPromptService);
    prompts.alert(null, title || "AVControls", message);
  },

  PrefListener: function(branchName, func) {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService);
    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Ci.nsIPrefBranch2);

    this.register = function() {
      branch.addObserver("", this, false);
      branch.getChildList("", {})
            .forEach(function(name) { func(branch, name); });
    };

    this.unregister = function() {
      if (branch) {
        branch.removeObserver("", this);
      }
    };

    this.observe = function(subject, topic, data) {
      if (topic == "nsPref:changed") {
        func(branch, data);
      }
    };
  }
}
