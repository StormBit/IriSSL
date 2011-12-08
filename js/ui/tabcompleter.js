qwebirc.ui.TabCompleterFactory = new Class({
  initialize: function(session) {
    this.session = session;
    this.reset();
  },
  tabComplete: function(textBox) {
    var text = textBox.value;
    
    if(!$defined(this.obj)) {
      this.incr = 1;
      
      var w = ui.getActiveWindow();
      if(!w)
        return;
        
      var startingWord = qwebirc.util.getEnclosedWord(text, qwebirc.util.getCaretPos(textBox));
      var preword = "", word = "", postword = "";
      if($defined(startingWord)) {
        var preword = text.substring(0, startingWord[0]);
        var word = startingWord[1];
        var postword = text.substring(startingWord[0] + word.length);
      }
      
      var ltext = text.toLowerCase();
      if(text == "") {
        preword = "/msg ";
        obj = qwebirc.ui.QueryTabCompleter;
      } else if(session.irc.isChannel(word)) {
        obj = qwebirc.ui.ChannelNameTabCompleter;
      } else if(ltext.match(/^\/(q|query|msg) /i)) {
        obj = qwebirc.ui.QueryTabCompleter;
      } else if(w.type == qwebirc.ui.WINDOW_QUERY) {
        obj = qwebirc.ui.QueryNickTabCompleter;
      } else if(w.type == qwebirc.ui.WINDOW_CHANNEL) {
        /* "slug[TAB]" == "slug: " */
        if(preword == "") {
          if((postword != "") && postword.charAt(0) == " ") {
            postword = ":" + postword;
          } else {
            postword = ": " + postword;
          }
          this.incr++;
        }
        obj = qwebirc.ui.ChannelUsersTabCompleter;
      } else {
        return;
      }

      if(postword == "")
        postword = " ";
      
      this.obj = new obj(session, preword, word, postword, w);
      if(!$defined(this.obj))
        return;
    }
      
    var r = this.obj.get();
    if(!$defined(r))
      return;
      
    textBox.value = r[1];
    qwebirc.util.setCaretPos(textBox, r[0] + this.incr);
  },
  reset: function() {
    this.obj = null;
  }
});

qwebirc.ui.TabIterator = new Class({
  initialize: function(session, prefix, list) {
    this.prefix = prefix;
    if(!$defined(list) || list.length == 0) {
      this.list = null;
    } else {
      var l = [];
      
      var prefixl = qwebirc.irc.toIRCCompletion(session, prefix);
      
      /* convert the nick list to IRC lower case, stripping all non letters
       * before comparisions */
      for(var i=0;i<list.length;i++) {
        var l2 = qwebirc.irc.toIRCCompletion(session, list[i]);
        
        if(l2.startsWith(prefixl))
          l.push(list[i]);
      }
      this.list = l;
    }
    
    this.pos = -1;
  },
  next: function() {
    /*
     * ideally next would do the list gubbins recursively, but no JS engine currently
     * support tail recursion :(
     */
    if(!$defined(this.list))
      return null;
    
    this.pos = this.pos + 1;
    if(this.pos >= this.list.length)
      this.pos = 0;
      
    return this.list[this.pos];
  }
});

qwebirc.ui.BaseTabCompleter = new Class({
  initialize: function(session, prefix, existingNick, suffix, list) {
    this.existingNick = existingNick;
    this.prefix = prefix;
    this.suffix = suffix;
    this.iterator = new qwebirc.ui.TabIterator(session, existingNick, list);
  },
  get: function() {
    var n = this.iterator.next();
    if(!$defined(n))
      return null;
      
    var p = this.prefix + n;
    return [p.length, p + this.suffix];
  }
});

qwebirc.ui.QueryTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(session, prefix, existingNick, suffix) {
    this.parent(session, prefix, existingNick, suffix, session.irc.lastNicks);
  }
});

qwebirc.ui.QueryNickTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(session, prefix, existingText, suffix) {
    var nick = window.name
    this.parent(session, prefix, existingText, suffix, [nick]);
  }
});

qwebirc.ui.ChannelNameTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(session, prefix, existingText, suffix) {

    /* WTB map */
    var l = [];
    
    for(var c in session.irc.channels) {
      var w = session.windows[c];
      
      /* redundant? */
      if($defined(w))
        w = w.lastSelected;
        
      l.push([w, c]);
    }
    
    l.sort(function(a, b) {
      return b[0] - a[0];
    });

    var l2 = [];    
    for(var i=0;i<l.length;i++)
      l2.push(l[i][1]);
    this.parent(session, prefix, existingText, suffix, l2);
  }
});

qwebirc.ui.ChannelUsersTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(session, prefix, existingText, suffix, nc) {
    var nc = session.irc.tracker.getSortedByLastSpoke(ui.getActiveWindow().name);

    this.parent(session, prefix, existingText, suffix, nc);
  }
});
