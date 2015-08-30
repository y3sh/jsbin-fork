function annotateSourceTraces(){
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
      pill.on("click", function(e){
        if (!pill.$activeLine){
          pill.$activeLine = $(e.currentTarget).parent().parent().parent();
          pill.$expander = $('<div class="expander-node"></div>');
          pill.$invokeNode = $('<div class="invoke-node"></div>');
          pill.$activeLine.prepend(pill.$invokeNode);
          pill.$activeLine.prepend(pill.$expander);

          debugger;
        }

        if (pill.expanded){
          pill.$invokeNode.animate({
            height:0
          }, 200);
          pill.$expander.animate({
            height:0
          }, 200);
          pill.expanded = false;
        } else {
          pill.$invokeNode.animate({
            height:48
          }, 200);
          pill.$expander.animate({
            height:48
          }, 200);
          pill.expanded = true;
        }


      });
    }
  });
}

function later(){
  fondueMirror.setOption("lineNumbers", true)
  fondueMirror.setOption("lineNumbers", false)
}

function PillView(codeMirror, line) {
	this.$dom = $("<span class='theseus-call-count none'><span class='counts'>0 calls</span></span>");
	codeMirror.setGutterMarker(line, "pill-gutter", this.$dom[0]);
	this.on = this.$dom.on.bind(this.$dom);
}
PillView.prototype = {
	setCount: function (count) {
		var html = count + " call" + (count === 1 ? "" : "s");
		this.$dom.find(".counts").html(html);
		this.$dom.toggleClass("none", count === 0);
	},
	setActive: function (isActive) {
		this._active = isActive;
		this.$dom.toggleClass("active", isActive);
	},
	toggle: function () {
		this.setActive(!this._active);
	},
};
