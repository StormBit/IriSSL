qwebirc.ui.style.ModifiableStylesheet = new Class({
  initialize: function(url) {
    var n = this.__parseStylesheet(this.__getStylesheet(url));
    
    this.__cssText = n.cssText;
    this.rules = n.rules;
    
    this.__tag = this.__createTag();
  },
  __createTag: function() {
    var tag = document.createElement("style");
    tag.type = "text/css";
    tag.media = "all";

    document.getElementsByTagName("head")[0].appendChild(tag);
    
    return tag;
  },
  __getStylesheet: function(url) {
    var r = new Request({url: url, async: false});
    var result;
    r.addEvent("complete", function(x) {
      result = x;
    });
    r.get();
    return result;
  },
  __setStylesheet: function(stylesheet) {
    var node = this.__tag;
    
    if(node.styleSheet) { /* IE */
      node.styleSheet.cssText = stylesheet;
    } else {
      var d = document.createTextNode(stylesheet);
      node.appendChild(d);
      while(node.childNodes.length > 1)
        node.removeChild(node.firstChild);
    }
  },
  __parseStylesheet: function(data) {
    var lines = data.replace("\r\n", "\n").split("\n");
    
    var rules = {};
    var i;
    for(i=0;i<lines.length;i++) {
      var line = lines[i];
      if(line.trim() === "")
        break;
        
      var tokens = line.splitMax("=", 2);
      if(tokens.length != 2)
        continue;
        
      rules[tokens[0]] = tokens[1];
    }
    
    var cssLines = []
    for(;i<lines.length;i++)
      cssLines.push(lines[i]);
      
    return {cssText: cssLines.join("\n"), rules: rules};
  },
  set: function(fg_mutator, fg_sec_mutator, bg_mutator) {
    if(!fg_mutator)
	  fg_mutator = function(x) { return x; };
    if(!fg_sec_mutator)
	  fg_sec_mutator = fg_mutator;
    if(!bg_mutator)
	  bg_mutator = function(x) { return x; };
	  
    var text = this.__cssText;
    for(var key in this.rules) {
      var value;
      if (key.substring(7, 0) == "fg_sec_")
        value = fg_sec_mutator(new Color(this.rules[key]));
      else if (key.substring(3, 0) == "fg_")
        value = fg_mutator(new Color(this.rules[key]));
      else
        value = bg_mutator(new Color(this.rules[key]));
      
      if(value == "255,255,255") /* IE confuses white with transparent... */
        value = "255,255,254";
        
      text = text.replaceAll("$(" + key + ")", "rgb(" + value + ")");
    }
    
    this.__setStylesheet(text);
  }
});
