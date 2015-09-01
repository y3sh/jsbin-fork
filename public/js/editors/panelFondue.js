var createFonduePanel = function () {
  var panelTemplate =
    '<div class="fondue-panel"> ' +
    ' <div> ' +
    '   <img id="hider-spinner" src="/images/spinner.gif" style="height:12px; display:none;"> ' +
    '   <input type="checkbox" id="fondue-toggle-inactive"/> Hide Inactive Code ' +
    ' </div> ' +
    ' <div> ' +
    '   <ul id="fondue-toggle-group">' +
    '   </ul> ' +
    ' </div> ' +
    '</div>';

  var fileToggleTemplate =
    '<li>  ' +
    '  <input type="checkbox" id="fondue-toggle-inactive" data="_path_"/> Hide _path_ ' +
    '</li>';

  var FonduePanelView = function (fondue) {
    this.$el = $(panelTemplate);
    this.on = this.$el.on.bind(this.$el);
    this.render = _.bind(this.render, this);
    this.toggleInactive = _.bind(this.toggleInactive, this);
    this.toggleFile = _.bind(this.toggleFile, this);
    this.fondue = fondue;
    this.$el.find("#fondue-toggle-inactive").on("click", this.toggleInactive);
    this.codeMirrorMarkers = {
      //path:marker
    };
  };

  FonduePanelView.prototype = {
    render: function () {
      var $control = $("#control");

      if ($control.find(".fondue-panel").length < 1) {
        $control.append(this.$el)
      }

      this.makeToggles();
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

    hideFile: function (path) {
      var script = _(window.fondue.scripts).find(function (script) {
        return script.path === path;
      });

      var startLine = script.binStartLine;
      var endLine = script.binEndLine;
      if (!this.codeMirrorMarkers[path]) {
        this.codeMirrorMarkers[path] = [];
      }
      this.hideSmart(startLine, endLine, this.codeMirrorMarkers[path]);
    },

    hideInactive: function () {
      if (!this.codeMirrorMarkers["allInactive"]) {
        this.codeMirrorMarkers["allInactive"] = [];
      }

      this.hideSmart(1, fondueMirror.lineCount(), this.codeMirrorMarkers["allInactive"], fmActiveLines);
    },

    showFile: function (path) {
      this.showSmart(this.codeMirrorMarkers[path]);
      this.codeMirrorMarkers[path] = [];
    },

    showInactive: function () {
      this.showSmart(this.codeMirrorMarkers["allInactive"]);
      this.codeMirrorMarkers["allInactive"] = [];
    },

    showSmart: function (markerArr) {
      var nums = [];
      _(markerArr).each(function (marker) {
        var loc = marker.find();
        if (loc) {
          nums = nums.concat(_.range(loc.from.line, loc.to.line + 1));
        }
        marker.clear();
      });
      fmHideLines = _.difference(fmHideLines, nums)
    },

    hideSmart: function (startLine, endLine, markerArr, addedLinesToExclude) {
      var conflictLines = _.union(fmHideLines, addedLinesToExclude || []);
      conflictLines = _.reject(conflictLines, function (lineNumber) {
        return lineNumber < startLine || lineNumber > endLine;
      });

      if (conflictLines.length < 1) {
        markerArr.push(window.fondueMirror.markText({
          line: startLine
        }, {
          line: endLine
        }, {collapsed: true}));
        fmHideLines = _.union(fmHideLines, _.range(startLine, endLine + 1));
      } else {
        var ranges = [];
        var _conflicts = _(conflictLines).sortBy(function (i) {
          return i
        });
        var lastLine = null;
        for (var i = startLine; i <= endLine; i++) {
          if (i === endLine && lastLine !== null) {
            if (_conflicts.contains(i)) {
              ranges.push([lastLine, i - 1]);
            } else {
              ranges.push([lastLine, i]);
            }
          } else if (_conflicts.contains(i)) {
            if (lastLine !== null) {
              if (i === endLine) {
                ranges.push([lastLine, i]);
              } else {
                ranges.push([lastLine -1, i - 1]);
              }
              lastLine = null;
            }
          } else {
            if (lastLine === null) {
              lastLine = i;
            }
          }
        }

        _(ranges).each(function (range) {
          markerArr.push(window.fondueMirror.markText({
            line: range[0]
          }, {
            line: range[1]
          }, {collapsed: true}));

          fmHideLines = _.union(fmHideLines, _.range(range[0], range[1] + 1));
        }, this);
      }

    },

    hideInactiveSlow: function () {
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
    },

    hideInactiveHighSpeed: function () {
      var avoidRanges = _(fondue.traceMarks).map(function (traceMark) {
        var posRange = traceMark.find();
        var from = posRange.from.line;
        var to = posRange.to.line;

        return [from, to];
      }).sortBy(function (range) {
        return range[0];
      }).value();

      var lineCount = fondueMirror.lineCount();
      var hideRanges = [];
      var lastRangeEnd = 0;
      for (var i = 0; i <= avoidRanges.length - 1; i++) {
        if (avoidRanges[i][0] === lastRangeEnd || avoidRanges[i][0] === lastRangeEnd + 1) {
        } else {
          hideRanges.push([lastRangeEnd === 0 ? 0 : lastRangeEnd + 1, avoidRanges[i][0] - 1]);
        }

        lastRangeEnd = avoidRanges[i][1];
      }

      if (avoidRanges[avoidRanges.length - 1][1] < lineCount) {
        hideRanges.push([lastRangeEnd + 1, lineCount]);
      }

      _(hideRanges).each(function (range) {
        var marker = window.fondueMirror.markText({
          line: range[0]
        }, {
          line: range[1]
        }, {
          collapsed: true
        });

        this.traceLessMarkers.push(marker);
      }, this);
    },
  };

  var panelView = new FonduePanelView(fondue);
  panelView.render();
};


var annotateSourceTraces = function () {
  var calledByTemplate = '<div class="fondue-call-row"> ' +
    '<div class="fondue-called-by"><span>_calledby_</span></div> ' +
    '<div class="fondue-called-args-wrap"> ' +
    '<div class="fondue-called-args"> ' +
    '<ul class="fondue-args-list"> ' +
    '</ul> ' +
    '</div> ' +
    '</div> ' +
    '</div>';

  var argTemplate = '<li class="fondue-args-list-item"> ' +
    '<span class="fondue-arg">_arg_</span>= ' +
    '<span class="fondue-val">_val_</span> ' +
    '</li> ';

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

    fmActiveLines = fmActiveLines.concat(_.range(startLine, endLine + 1));

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
              var name = "";

              if (invocation.parentNode) {

                if (invocation.parentNode.name) {
                  name = invocation.parentNode.name;
                } else {
                  name = invocation.parentNode.path + ":" + invocation.parentNode.start.line;
                }
              }

              if (!name) {
                name = "anonymous"
              }

              pill.$invokeNode.append(calledByTemplate.replace("_calledby_", name));
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
            height: 150
          }, 200);
          pill.$expander.animate({
            height: 150
          }, 200);
          pill.expanded = true;
        }
      });
    }
  });
}

function later() {
  fondueMirror.setOption("lineNumbers", true)
  fondueMirror.setOption("lineNumbers", false)
}

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

window.fmHideLines = [];
window.fmActiveLines = [];

