qwebirc.ui.QUI = new Class({
  Extends: qwebirc.ui.RootUI,
  initialize: function(session, parentElement) {
    this.parent(session, parentElement, qwebirc.ui.QUI.Window, "qui");
    this.theme = new qwebirc.ui.Theme(null);
    this.setModifiableStylesheet("qui");
  },
  postInitialize: function() {
    this.qjsui = new qwebirc.ui.QUI.JSUI("qwebirc-qui", this.parentElement);
    this.qjsui.addEvent("reflow", function() {
      var w = this.getActiveWindow();
      if($defined(w))
        w.onResize();
    }.bind(this));
    this.qjsui.top.addClass("outertabbar");
    
    this.qjsui.bottom.addClass("input");
    this.qjsui.right.addClass("nicklist");
    this.qjsui.topic.addClass("topic");
    this.qjsui.middle.addClass("lines");
    
    this.outerTabs = this.qjsui.top;

    this.tabs = new Element("div", { "class":"tabbar" });
    
    this.__createDropdownMenu();
    
    this.outerTabs.appendChild(this.tabs);
    this.origtopic = this.topic = this.qjsui.topic;
    this.origlines = this.lines = this.qjsui.middle;
    this.orignicklist = this.nicklist = this.qjsui.right;
    
    this.input = this.qjsui.bottom;
    this.reflow = this.qjsui.reflow.bind(this.qjsui);
    
    this.tabs.addEvent("mousewheel", function(x) {
      var event = new Event(x);
      
      /* up */
      if(event.wheel > 0) {
        this.nextWindow();
      } else if(event.wheel < 0) {
        /* down */
        this.prevWindow();
      }
      event.stop();
    }.bind(this));
    
    this.createInput();
    this.reflow();
    this.reflow.delay(100); /* Konqueror fix */
  },
  __createDropdownMenu: function() {
    var dropdownMenu = new Element("span");
    dropdownMenu.addClass("dropdownmenu");
    
    dropdownMenu.hide = function() {
      dropdownMenu.setStyle("display", "none");
      dropdownMenu.visible = false;
      document.removeEvent("mousedown", hideEvent);
    }.bind(this);
    var hideEvent = function() { dropdownMenu.hide(); };
    
    dropdownMenu.hide();
    this.parentElement.appendChild(dropdownMenu);
    
    var menuitems = [];
    var i = 0;
    $each(qwebirc.ui.Panes, function(pane, name, object) {
      var text = pane.menuitem(this.session);
      if (text) {
        menuitems[i] = {};
        menuitems[i].text = text;
        menuitems[i].name = name;
        menuitems[i].pos = pane.menupos;
        i++;
      }
    }.bind(this));
    menuitems.sort(function(a, b) { return a.pos - b.pos }); 
    menuitems.forEach(function(x) {
      var e = new Element("a");
      e.addEvent("mousedown", function(e) { new Event(e).stop(); });
      e.addEvent("click", function() {
        dropdownMenu.hide();
        ui.addPane(x.name);
      }.bind(this));
      e.set("text", x.text);
      dropdownMenu.appendChild(e);
    }.bind(this));

    var dropdown = new Element("div");
    dropdown.addClass("dropdown-tab");
    dropdown.appendChild(new Element("img", {src: conf.frontend.static_base_url + "images/menu.png", title: "menu", alt: "menu"})); 

    this.outerTabs.appendChild(dropdown);
    dropdownMenu.show = function(x) {
      new Event(x).stop();
      
      if(dropdownMenu.visible) {
        dropdownMenu.hide();
        return;
      }
      var top = this.outerTabs.getSize().y;
      
      dropdownMenu.setStyle("left", 0);
      dropdownMenu.setStyle("top", top-1); /* -1 == top border */
      dropdownMenu.setStyle("display", "inline-block");
      dropdownMenu.visible = true;
      
      document.addEvent("mousedown", hideEvent);
    }.bind(this);
    dropdown.addEvent("mousedown", function(e) { new Event(e).stop(); });
    dropdown.addEvent("click", dropdownMenu.show);
  },
  createInput: function() {
    var form = new Element("form");
    this.input.appendChild(form);
    
    form.addClass("input");
    
    var inputbox = new Element("input");
    form.appendChild(inputbox);
    this.inputbox = inputbox;
    this.inputbox.maxLength = 512;

    var sendInput = function() {
      if(inputbox.value == "")
        return;
        
      this.resetTabComplete();
      this.getActiveWindow().historyExec(inputbox.value);
      inputbox.value = "";
    }.bind(this);

    if(!qwebirc.util.deviceHasKeyboard()) {
      inputbox.addClass("mobile-input");
      var inputButton = new Element("input", {type: "button"});
      inputButton.addClass("mobile-button");
      inputButton.addEvent("click", function() {
        sendInput();
        inputbox.focus();
      });
      inputButton.value = ">";
      this.input.appendChild(inputButton);
      var reflowButton = function() {
        var containerSize = this.input.getSize();
        var buttonSize = inputButton.getSize();
        
        var buttonLeft = containerSize.x - buttonSize.x - 5; /* lovely 5 */

        inputButton.setStyle("left", buttonLeft);
        inputbox.setStyle("width", buttonLeft - 5);
        inputButton.setStyle("height", containerSize.y);
      }.bind(this);
      this.qjsui.addEvent("reflow", reflowButton);
    } else {
      inputbox.addClass("keyboard-input");
    }
    
    form.addEvent("submit", function(e) {
      new Event(e).stop();
      sendInput();
    });
    
    inputbox.addEvent("focus", this.resetTabComplete.bind(this));
    inputbox.addEvent("mousedown", this.resetTabComplete.bind(this));
    
    inputbox.addEvent("keydown", function(e) {
      var resultfn;
      var cvalue = inputbox.value;
      
      if(e.key == "up") {
        resultfn = this.commandhistory.upLine;
      } else if(e.key == "down") {
        resultfn = this.commandhistory.downLine;
      } else if(e.key == "tab") {
        new Event(e).stop();
        this.tabComplete(inputbox);
        return;
      } else {
        /* ideally alt and other keys wouldn't break this */
        this.resetTabComplete();
        return;
      }
      
      this.resetTabComplete();
      if((cvalue != "") && (this.lastcvalue != cvalue))
        this.commandhistory.addLine(cvalue, true);
      
      var result = resultfn.bind(this.commandhistory)();
      
      new Event(e).stop();
      if(!result)
        result = "";
      this.lastcvalue = result;
        
      inputbox.value = result;
      qwebirc.util.setAtEnd(inputbox);
    }.bind(this));
  },
  setLines: function(lines) {
    this.lines.parentNode.replaceChild(lines, this.lines);
    this.qjsui.middle = this.lines = lines;
  },
  setChannelItems: function(nicklist, topic) {
    if(!$defined(nicklist)) {
      nicklist = this.orignicklist;
      topic = this.origtopic;
    }
    this.nicklist.parentNode.replaceChild(nicklist, this.nicklist);
    this.qjsui.right = this.nicklist = nicklist;

    this.topic.parentNode.replaceChild(topic, this.topic);
    this.qjsui.topic = this.topic = topic;
  },
  closeWindow: function(window) {
    this.parent(window);

    this.tabs.removeChild(window.tab);
    this.tabs.removeChild(window.spaceNode);
    this.reflow();
  }
});

qwebirc.ui.QUI.JSUI = new Class({
  Implements: [Events],
  initialize: function(class_, parent, sizer) {
    this.parent = parent;
    this.sizer = $defined(sizer)?sizer:parent;
    
    this.class_ = class_;
    this.create();
    
    this.reflowevent = null;
    
    window.addEvent("resize", function() {
      this.reflow(100);
    }.bind(this));
  },
  applyClasses: function(pos, l) {
    l.addClass("dynamicpanel");    
    l.addClass(this.class_);

    if(pos == "middle") {
      l.addClass("leftboundpanel");
    } else if(pos == "top") {
      l.addClass("topboundpanel");
      l.addClass("widepanel");
    } else if(pos == "topic") {
      l.addClass("widepanel");
    } else if(pos == "right") {
      l.addClass("rightboundpanel");
    } else if(pos == "bottom") {
      l.addClass("bottomboundpanel");
      l.addClass("widepanel");
    }
  },
  create: function() {
    var XE = function(pos) {
      var element = new Element("div");
      this.applyClasses(pos, element);
      
      this.parent.appendChild(element);
      return element;
    }.bind(this);
    
    this.top = XE("top");
    this.topic = XE("topic");
    this.middle = XE("middle");
    this.right = XE("right");
    this.bottom = XE("bottom");
  },
  reflow: function(delay) {
    if(!delay)
      delay = 1;
      
    if(this.reflowevent)
      $clear(this.reflowevent);
    this.__reflow();
    this.reflowevent = this.__reflow.delay(delay, this);
  },
  __reflow: function() {
    var bottom = this.bottom;
    var middle = this.middle;
    var right = this.right;
    var topic = this.topic;
    var top = this.top;
    
    var topicsize = topic.getSize();
    var topsize = top.getSize();
    var rightsize = right.getSize();
    var bottomsize = bottom.getSize();
    var docsize = this.sizer.getSize();
    
    var mheight = (docsize.y - topsize.y - bottomsize.y - topicsize.y);
    var mwidth = (docsize.x - rightsize.x);

    topic.setStyle("top", topsize.y);
    
    middle.setStyle("top", (topsize.y + topicsize.y));
    if(mheight > 0) {
      middle.setStyle("height", mheight);
      right.setStyle("height", mheight);
    }
    
    if(mwidth > 0)
      middle.setStyle("width", mwidth);
    right.setStyle("top", (topsize.y + topicsize.y));
    right.setStyle("left", mwidth);
    
    bottom.setStyle("top", (docsize.y - bottomsize.y));
    this.fireEvent("reflow");
  },
  showChannel: function(state) {
    var display = "none";
    if(state)
      display = "block";

    this.right.setStyle("display", display);
    this.topic.setStyle("display", display);
  },
  showInput: function(state) {
    this.bottom.isVisible = state;
    this.bottom.setStyle("display", state?"block":"none");
  }
});

qwebirc.ui.QUI.Window = new Class({
  Extends: qwebirc.ui.Window,
  
  initialize: function(session, type, name, identifier) {
    this.parent(session, type, name, identifier);

    this.tab = new Element("a", {"href": "#"});
    this.tab.addClass("tab");
    this.tab.addEvent("focus", function() { this.blur() }.bind(this.tab));;
    this.spaceNode = document.createTextNode(" ");
 
    /* Always put the connect/status windows in front. */
    if (ui.tabs.hasChildNodes()) { 
      if (type == qwebirc.ui.WINDOW_STATUS) {
        ui.tabs.insertBefore(this.tab, ui.tabs.firstChild);
        ui.tabs.insertBefore(this.spaceNode, this.tab.nextSibling);
      }
      else if (type == qwebirc.ui.WINDOW_CUSTOM && name == "Connect") {
        ui.tabs.insertBefore(this.tab, ui.tabs.firstChild);
        ui.tabs.insertBefore(this.spaceNode, this.tab.nextSibling);
      }
      else {
        ui.tabs.appendChild(this.tab);
        ui.tabs.appendChild(this.spaceNode);
      }
    } 
    else {
      ui.tabs.appendChild(this.tab);
      ui.tabs.appendChild(this.spaceNode);
    }
    
    this.tab.appendText(name);
    this.tab.addEvent("click", function(e) {
      new Event(e).stop();
      
      if(this.closed)
        return;
        
      ui.selectWindow(this);
    }.bind(this));
    
    if(type != qwebirc.ui.WINDOW_STATUS && (type != qwebirc.ui.WINDOW_CUSTOM || name != "Connect")) {
      var tabclose = new Element("span");
      tabclose.set("text", "X");
      tabclose.addClass("tabclose");
      var close = function(e) {
        new Event(e).stop();
        
        if(this.closed)
          return;
          
        if(type == qwebirc.ui.WINDOW_CHANNEL)
          this.session.irc.exec("/PART " + name);

        ui.closeWindow(this);
        
        //ui.inputbox.focus();
      }.bind(this);
      
      tabclose.addEvent("click", close);
      this.tab.addEvent("mouseup", function(e) {
        var button = 1;
        
        if(Browser.Engine.trident)
          button = 4;

        if(e.event.button == button)
          close();
      }.bind(this));
      
      this.tab.appendChild(tabclose);
    }

    this.lines = new Element("div");
    ui.qjsui.applyClasses("middle", this.lines);
    this.lines.addClass("lines");
    if(type != qwebirc.ui.WINDOW_CUSTOM)
      this.lines.addClass("ircwindow");
    
    this.lines.addEvent("scroll", function() {
      this.scrolleddown = this.scrolledDown();
      this.scrollpos = this.getScrollParent().getScroll();
    }.bind(this));
    
    if(type == qwebirc.ui.WINDOW_CHANNEL) {
      this.topic = new Element("div");
      this.topic.addClass("topic");
      this.topic.addClass("tab-invisible");
      this.topic.set("html", "&nbsp;");
      this.topic.addEvent("dblclick", this.editTopic.bind(this));
      ui.qjsui.applyClasses("topic", this.topic);
      
      this.prevNick = null;
      this.nicklist = new Element("div");
      this.nicklist.addClass("nicklist");
      this.nicklist.addClass("tab-invisible");
      this.nicklist.addEvent("click", this.removePrevMenu.bind(this));
      ui.qjsui.applyClasses("nicklist", this.nicklist);
    }
    
    if(type == qwebirc.ui.WINDOW_CHANNEL)
      this.updateTopic("");
    
    this.nicksColoured = conf.ui.nick_colors;
    this.reflow();
  },
  editTopic: function() {
    if(!this.session.irc.nickOnChanHasAtLeastPrefix(this.session.irc.nickname, this.name, "+", true)) {
/*      var cmodes = this.session.irc.getChannelModes(channel);
      if(cmodes.indexOf("t")) {*/
        alert("Sorry, you need to be a channel operator to change the topic!");
        return;
      /*}*/
    }
    var newTopic = prompt("Change topic of " + this.name + " to:", this.topic.topicText);
    if(newTopic === null)
      return;

    this.session.irc.exec("/TOPIC " + newTopic);
  },
  reflow: function() {
    ui.reflow();
  },
  onResize: function() {
    if(this.scrolleddown) {
      if(Browser.Engine.trident) {
        this.scrollToBottom.delay(5, this);
      } else {
        this.scrollToBottom();
      }
    } else if($defined(this.scrollpos)) {
      if(Browser.Engine.trident) {
        this.getScrollParent().scrollTo(this.scrollpos.x, this.scrollpos.y);
      } else {
        this.getScrollParent().scrollTo.delay(5, this, [this.scrollpos.x, this.scrollpos.y]);
      }
    }
  },
  createMenu: function(nick, parent) {
    var e = new Element("div");
    parent.appendChild(e);
    e.addClass("menu");
    
    var nickArray = [nick];
    qwebirc.ui.MENU_ITEMS().forEach(function(x) {
      if(!x.predicate || x.predicate !== true && !x.predicate.apply(this, nickArray))
        return;
      
      var e2 = new Element("a");
      e.appendChild(e2);

      e2.href = "#";
      e2.set("text", "- " + x.text);

      e2.addEvent("focus", function() { this.blur() }.bind(e2));
      e2.addEvent("click", function(ev) { new Event(ev.stop()); this.menuClick(x.fn); }.bind(this));
    }.bind(this));
    return e;
  },
  menuClick: function(fn) {
    /*
    this.prevNick.removeChild(this.prevNick.menu);
    this.prevNick.menu = null;
    */
    fn.bind(this)(this.prevNick.realNick);
    this.removePrevMenu();
  },
  moveMenuClass: function() {
    if(!this.prevNick)
      return;
    if(this.nicklist.firstChild == this.prevNick) {
      this.prevNick.removeClass("selected-middle");
    } else {
      this.prevNick.addClass("selected-middle");
    }
  },
  removePrevMenu: function() {
    if(!this.prevNick)
      return;
      
    this.prevNick.removeClass("selected");
    this.prevNick.removeClass("selected-middle");
    if(this.prevNick.menu)
      this.prevNick.removeChild(this.prevNick.menu);
    this.prevNick = null;
  },
  nickListAdd: function(nick, position) {
    var realNick = this.session.irc.stripPrefix(nick);
    
    var e = new Element("a");
    qwebirc.ui.insertAt(position, this.nicklist, e);
    
    e.href = "#";
    var span = new Element("span");
    if(conf.ui.nick_colors) {
      var colour = realNick.toHSBColour(this.session);
      if($defined(colour))
        span.setStyle("color", colour.rgbToHex());
    }
    span.set("text", nick);
    e.appendChild(span);
    
    e.realNick = realNick;
    
    e.addEvent("click", function(x) {
      if(this.prevNick == e) {
        this.removePrevMenu();
        return;
      }
      
      this.removePrevMenu();
      this.prevNick = e;
      e.addClass("selected");
      this.moveMenuClass();
      e.menu = this.createMenu(e.realNick, e);
      new Event(x).stop();
    }.bind(this));
    
    e.addEvent("focus", function() { this.blur() }.bind(e));
    this.moveMenuClass();
    return e;
  },
  nickListRemove: function(nick, stored) {
    this.nicklist.removeChild(stored);
    this.moveMenuClass();
  },
  updateTopic: function(topic) {
    var t = this.topic;
    
    while(t.firstChild)
      t.removeChild(t.firstChild);

    if(topic) {
      t.topicText = topic;
      this.parent(topic, t);
    } else {
      t.topicText = topic;
      var e = new Element("div");
      e.set("text", "(no topic set)");
      e.addClass("emptytopic");
      t.appendChild(e);
    }
    this.reflow();
  },
  select: function() {
    var inputVisible = this.type != qwebirc.ui.WINDOW_CUSTOM;
    
    this.tab.removeClass("tab-unselected");
    this.tab.addClass("tab-selected");

    ui.setLines(this.lines);
    ui.setChannelItems(this.nicklist, this.topic);
    ui.qjsui.showInput(inputVisible);
    ui.qjsui.showChannel($defined(this.nicklist));

    this.reflow();
    
    this.parent();
    
    if(inputVisible)
      ui.inputbox.focus();

    if(this.type == qwebirc.ui.WINDOW_CHANNEL && this.nicksColoured != conf.ui.nick_colors) {
      this.nicksColoured = conf.ui.nick_colors;
      
      var nodes = this.nicklist.childNodes;
      if(conf.ui.nick_colors) {
        for(var i=0;i<nodes.length;i++) {
          var e = nodes[i], span = e.firstChild;
          var colour = e.realNick.toHSBColour(this.session);
          if($defined(colour))
            span.setStyle("color", colour.rgbToHex());
        };
      } else {
        for(var i=0;i<nodes.length;i++) {
          var span = nodes[i].firstChild;
          span.setStyle("color", null);
        };
      }
    }
  },
  deselect: function() {
    this.parent();
    
    this.tab.removeClass("tab-selected");
    this.tab.addClass("tab-unselected");
  },
  addLine: function(type, line, colourClass) {
    var e = new Element("div");

    if(colourClass) {
      e.addClass(colourClass);
    } else if(this.lastcolour) {
      e.addClass("linestyle1");
    } else {
      e.addClass("linestyle2");
    }
    this.lastcolour = !this.lastcolour;

    this.parent(type, line, colourClass, e);
  },
  setHilighted: function(state) {
    var laststate = this.hilighted;
    
    this.parent(state);

    if(state == laststate)
      return;
      
    this.tab.removeClass("tab-hilight-activity");
    this.tab.removeClass("tab-hilight-us");
    this.tab.removeClass("tab-hilight-speech");
    
    switch(this.hilighted) {
      case qwebirc.ui.HILIGHT_US:
        this.tab.addClass("tab-hilight-us");
        break;
      case qwebirc.ui.HILIGHT_SPEECH:
        this.tab.addClass("tab-hilight-speech");
        break;
      case qwebirc.ui.HILIGHT_ACTIVITY:
        this.tab.addClass("tab-hilight-activity");
        break;
    }
  }
});
