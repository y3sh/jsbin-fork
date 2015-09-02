var createFonduePanel = function () {
  var panelTemplate =
    '<div class="fondue-panel"> ' +
    ' <div class="group-wrap"> ' +
    '   <ul id="fondue-toggle-group">' +
    '     <li>  ' +
    '       <img id="hider-spinner" src="/images/spinner.gif" style="height:12px; display:none;"> ' +
    '       <input type="checkbox" id="fondue-toggle-inactive"/> Hide Inactive Code ' +
    '     </li>' +
    '   </ul> ' +
    ' </div>' +
    '</div>';

  var fileToggleTemplate =
    '<li>  ' +
    '  <input type="checkbox" id="fondue-toggle-inactive" data="_path_"/> Hide _path_ ' +
    '</li>';

  var fondueMasterToggleTemplate =
    '<a role="button" id="fonduePanelToggle" class="button group" href="javascript:;" aria-label="FondueMaster">Tracing</a>';

  var FonduePanelView = function (fondue) {
    this.$el = $(panelTemplate);
    this.$masterToggle = $(fondueMasterToggleTemplate);
    this.on = this.$el.on.bind(this.$el);
    this.render = _.bind(this.render, this);
    this.toggleInactive = _.bind(this.toggleInactive, this);
    this.toggleFile = _.bind(this.toggleFile, this);
    this.openClose = _.bind(this.openClose, this);
    this.fondue = fondue;
    this.$el.find("#fondue-toggle-inactive").on("click", this.toggleInactive);
    this.$binControl = $("#control");
    this.controlHeightStart = this.$binControl.height();
    this.$mirrorWrap = $(".CodeMirror-scroll");
    this.mirrorWrapStart = this.$mirrorWrap.css("height");
    this.$bin = $("#bin");
    this.binTopStart = parseInt(this.$bin.css("top"));

    //todo here set #bin and #control height to autosize

    this.codeMirrorMarkers = {
      //path:marker
    };
    this.traceLessMarkers = [];
  };

  FonduePanelView.prototype = {
    panelHeight: 90,

    render: function () {
      var $panel = $("#panels");

      if (this.$binControl.find(".fondue-panel").length < 1) {
        this.$binControl.append(this.$el);
        this.$el.css("height", this.panelHeight + "px");
      }
      if ($panel.find("#fonduePanelToggle").length < 1) {
        $panel.append(this.$masterToggle);
        this.$masterToggle.on("click", this.openClose);
      }

      this.makeToggles();
    },

    openClose: function () {
      var subtractHeight;

      if (this.$binControl.height() < this.controlHeightStart) {
        subtractHeight = 0;
      } else {
        subtractHeight = this.panelHeight;
      }
      this.$bin.animate({top: this.binTopStart - subtractHeight}, {duration: 50, queue: false}, false);
      this.$mirrorWrap.animate({height: this.mirrorWrapStart - subtractHeight}, {duration: 50, queue: false}, false);
      this.$binControl.animate({height: this.controlHeightStart - subtractHeight}, {duration: 200, queue: false}, true);
    },

    makeToggles: function () {
      _(this.fondue.scripts).each(function (script) {
        var path = script.path;
        var $fileToggle = $(fileToggleTemplate.split("_path_").join(path));
        $fileToggle.find("input").on("click", this.toggleFile);
        this.$el.find("#fondue-toggle-group").append($fileToggle);
      }, this);
    },

    toggleFile: function (e) {
      var $toggle = $(e.currentTarget);
      var path = $toggle.attr("data");
      if ($toggle.is(':checked')) {
        this.hideFile(path);
      } else {
        this.showFile(path);
      }
    },

    toggleInactive: function (e) {
      var $el = $(e.currentTarget);
      if ($el.is(':checked')) {
        this.hideInactive();
      } else {
        this.showInactive();
      }
    },

    showFile: function (path) {
      var codeMirrorMarker = this.codeMirrorMarkers[path];
      if (codeMirrorMarker) {
        codeMirrorMarker.clear();
      }
    },

    showInactive: function () {
      $("#fondue-toggle-inactive").hide();
      $("#hider-spinner").show();

      window.setTimeout(_.bind(function () {
        _(this.traceLessMarkers).each(function (marker) {
          marker.clear();
        });
        this.traceLessMarkers = [];
        $("#fondue-toggle-inactive").show();
        $("#hider-spinner").hide();
      }, this), 500);
    },

    hideFile: function (path) {
      var script = _(window.fondue.scripts).find(function (script) {
        return script.path === path;
      });

      var startLine = script.binStartLine - 1;
      var endLine = script.binEndLine + 3;

      this.codeMirrorMarkers[path] = window.fondueMirror.markText({
        line: startLine
      }, {
        line: endLine
      }, {collapsed: true});

      fmHideLines.concat(_.range())
    },

    hideInactive: function () {
      var avoidRanges = _(fondue.traceMarks).map(function (traceMark) {
        var posRange = traceMark.find();
        var from = posRange.from.line;
        var to = posRange.to.line;

        var arr = [];
        for (var i = from; i <= to; i++) {
          arr.push(i);
        }

        return arr;
      }).flatten();

      $("#fondue-toggle-inactive").hide();
      $("#hider-spinner").show();

      window.setTimeout(_.bind(function () {
        fondueMirror.eachLine(_.bind(function (line) {
          var lineNo = line.lineNo();
          if (!avoidRanges.contains(lineNo)) {
            var marker = window.fondueMirror.markText({
              line: lineNo - 1
            }, {
              line: lineNo
            }, {collapsed: true});

            this.traceLessMarkers.push(marker);
          }
        }, this));

        $("#fondue-toggle-inactive").show();
        $("#hider-spinner").hide();
      }, this), 500);
    }
  };

  var panelView = new FonduePanelView(fondue);
  panelView.render();
};


var annotateSourceTraces = function () {
  var invocationTemplate = '<div class="fondue-invocation-row">' +
    '</div>';

  var calledByTemplate =
    '<div class="fondue-call-row"> ' +
    ' <div class="fondue-called-by">' +
    '   <div>_calledby_</div>' +
    ' </div> ' +
    ' <div class="fondue-called-args-wrap"> ' +
    '   <div class="fondue-called-args"> ' +
    '     <ul class="fondue-args-list"> ' +
    '     </ul> ' +
    '   </div> ' +
    ' </div> ' +
    '</div>';

  var argTemplate = '' +
    '<li class="fondue-args-list-item"> ' +
    ' <div class="fondue-arg">_arg_ =&nbsp;</div> ' +
    ' <div class="fondue-val">_val_</div> ' +
    '</li> ';

  var preTemplate = '<pre class="fondue-pre"><a href="javascript:;" class="fondue-object-toggle">(-)</a></pre>';

  fondueMirror.setOption("lineNumbers", true);
  fondue.traceMarks = [];

  _(fondue.traces).each(function (trace) {
    var script = _(fondue.scripts).find(function (scriptObj) {
      return scriptObj.path === trace.path;
    });

    var lineOffset = script.binStartLine;

    var startLine = lineOffset + parseInt(trace.startLine);
    var endLine = lineOffset + parseInt(trace.endLine);
    fondue.traceMarks.push(fondueMirror.markText(
      {
        line: startLine,
        ch: parseInt(trace.startColumn)
      },
      {
        line: endLine,
        ch: parseInt(trace.endColumn)
      },
      {
        css: "background-color:#fffcbd"
      }
    ));

    fmActiveLines.concat(_.range(startLine, endLine));

    if (trace.type === "function") {
      var pill = new PillView(fondueMirror, startLine, trace);
      pill.setCount(trace.hits);
      pill.on("click", function (e) {
        if (!pill.$activeLine) {
          pill.$activeLine = $(e.currentTarget).parent().parent().parent();
          pill.$expander = $('<div class="expander-node"></div>');
          pill.$invokeNode = $('<div class="invoke-node"></div>');
          pill.$activeLine.prepend(pill.$invokeNode);
          pill.$activeLine.prepend(pill.$expander);

          if (trace.invokes) {
            _(trace.invokes).each(function (invocation) {
              if (invocation.callStack) {

                var $invokeRow = $(invocationTemplate);

                _(invocation.callStack).each(function (callInvoke) {

                  var idArr = callInvoke.nodeId.split("-");
                  var idArrRev = _(idArr).clone().reverse();

                  if (idArr.length < 5) {
                    return;
                  }

                  var path = idArr.slice(0, -5).join("-");
                  var type = idArrRev[4];
                  var startLine = idArrRev[3];
                  var startColumn = idArrRev[2];
                  //var endLine = idArrRev[1];
                  //var endColumn = idArrRev[0];

                  var name = callInvoke.nodeName ? type + " " + callInvoke.nodeName : type;
                  var $callRow = $(calledByTemplate.replace("_calledby_", name + " at <span class='call-path'>" + path + ":" + startLine + ":" + startColumn + "</span>"));

                  _(callInvoke.arguments).each(function (arg, i) {
                    var argValue;

                    if (arg.value && arg.value.preview) {
                      if (arg.value.ownProperties) {
                        var $pre = $(preTemplate).append(stringifyObjToHTML(arg.value.ownProperties));
                        argValue = $pre[0].outerHTML;
                      } else {
                        argValue = arg.value.preview;
                      }
                    } else if (arg.value.value === undefined) {
                      argValue = "undefined";
                    } else if (arg.value.value === null) {
                      argValue = "null"
                    } else if (arg.value.value && arg.value.value.trim().length < 1) {
                      argValue = "\"" + arg.value.value + "\"";
                    } else {
                      argValue = JSON.stringify(arg.value.value);
                    }

                    if (!arg.name) {
                      arg.name = "arguments[" + i + "]";
                    }

                    $callRow.find(".fondue-args-list").append(argTemplate.replace("_arg_", arg.name).replace("_val_", argValue));

                    var objToggle = $callRow.find(".fondue-object-toggle");
                    if(objToggle.length > 0){
                      $(objToggle).click(function(e){
                        var $target = $(e.currentTarget);
                        var $parent = $($target.parent());
                        if ($parent.height() > 16){
                          $parent.attr("data", $parent.height());
                          $parent.animate({height: 16}, 200);
                          $target.text("(+)")
                        } else {
                          $parent.animate({height: $parent.attr("data")});
                          $target.text("(-)")
                        }
                      });
                    }
                  });

                  $invokeRow.append($callRow);
                }, this);

                pill.$invokeNode.append($invokeRow);

              } else {
                debugger;
                pill.$invokeNode.append(calledByTemplate.replace("_calledby_", "(No caller captured)"));
                _(invocation.arguments).each(function (arg) {
                  var argValue = arg.value.value;
                  if (argValue === undefined) {
                    argValue = "undefined";
                  } else if (argValue === null) {
                    argValue = "null"
                  } else if (argValue && argValue.trim().length < 1) {
                    argValue = "\"" + argValue + "\"";
                  } else {
                    argValue = JSON.stringify(argValue);
                  }

                  pill.$invokeNode.find(".fondue-args-list").append(argTemplate.replace("_arg_", arg.name).replace("_val_", argValue));
                });
              }
            });
          }
        }

        if (pill.expanded) {
          pill.$invokeNode.animate({
            height: 0
          }, 200);
          pill.$expander.animate({
            height: 0
          }, 200);
          pill.expanded = false;
        } else {
          pill.$invokeNode.animate({
            height: 200
          }, 200);
          pill.$expander.animate({
            height: 200
          }, 200);
          pill.expanded = true;
        }
      });
    }
  });
};

function PillView(codeMirror, line) {
  this.$el = $("<span class='theseus-call-count none'><span class='counts'>0 calls</span></span>");
  codeMirror.setGutterMarker(line, "pill-gutter", this.$el[0]);
  this.on = this.$el.on.bind(this.$el);
}
PillView.prototype = {
  setCount: function (count) {
    var html = count + " call" + (count === 1 ? "" : "s");
    this.$el.find(".counts").html(html);
    this.$el.toggleClass("none", count === 0);
  },
  setActive: function (isActive) {
    this._active = isActive;
    this.$el.toggleClass("active", isActive);
  },
  toggle: function () {
    this.setActive(!this._active);
  },
};

function stringifyObjToHTML(obj) {
  var json = JSON.stringify(obj, null, 2);

  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    var cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}


window.fmHideLines = [];
window.fmActiveLines = [];

