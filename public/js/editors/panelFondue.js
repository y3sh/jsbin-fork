var createFonduePanel = function () {
  var panelTemplate =
    '<div class="fondue-panel"> ' +
    ' <div> ' +
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
    this.$el.find("#fondue-toggle-inactive").on("click", this.toggleInactive)
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
        console.log("Hide", path)
      } else {
        console.log("Show", path)
      }
    },

    toggleInactive: function (e) {
      var $el = $(e.currentTarget);
      if ($el.is(':checked')) {
        console.log("Hide code")
      } else {
        console.log("Show code")
      }
    }
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

  _(fondue.traces).each(function (trace) {
    var script = _(fondue.scripts).find(function (scriptObj) {
      return scriptObj.path === trace.path;
    });

    var lineOffset = script.binStarLine;

    fondueMirror.markText(
      {
        line: lineOffset + parseInt(trace.startLine),
        ch: parseInt(trace.startColumn)
      },
      {
        line: lineOffset + parseInt(trace.endLine),
        ch: parseInt(trace.endColumn)
      },
      {
        css: "background-color:#fffcbd"
      }
    );

    if (trace.type === "function") {
      var pill = new PillView(fondueMirror, lineOffset + parseInt(trace.startLine), trace);
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



