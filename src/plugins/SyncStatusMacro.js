/***
|''Name''|<...>|
|''Description''|<...>|
|''Author''|FND|
|''Version''|0.2|
|''Status''|@@experimental@@|
|''Source''|http://devpad.tiddlyspot.com/#<...>|
|''CodeRepository''|http://svn.tiddlywiki.org/Trunk/contributors/FND/|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|ServerSideSavingPlugin|
|''Keywords''|serverSide|
!Usage
<<syncstatus>>
!TODO
* notification for errors
* UI for error and success logs
!StyleSheet
.syncstatus div {
	height: 20px;
}

.syncstatus .normal {
	background-color: #0F0;
}

.syncstatus .pending {
	background-color: #FA0;
}
!Code
***/
//{{{
(function($) {

var sssp = config.extensions.ServerSideSavingPlugin;

if(!sssp) {
	throw "Missing dependency: ServerSideSavingPlugin";
}

var doc = $(document);

// override ServerSideSavingPlugin's feedback methods to avoid displayMessage
sssp.reportSuccess = function(msg, tiddler) {
	doc.trigger("twsync.success", { msg: msg, tiddler: tiddler });
};
var _reportFailure = sssp.reportFailure;
sssp.reportFailure = function(msg, tiddler, context) {
	_reportFailure.apply(this, arguments);
	doc.trigger("twsync.error", { msg: msg, tiddler: tiddler, context: context });
};

// hijack ServerSideSavingPlugin's tiddler sync methods to trigger notification -- XXX: should be folded into SSSP
var _saveTiddler = sssp.saveTiddler;
sssp.saveTiddler = function(tiddler) {
	doc.trigger("twsync.start", { tiddler: tiddler, type: "save" });
	_saveTiddler.apply(this, arguments);
};
var _removeTiddler = sssp.removeTiddler;
sssp.removeTiddler = function(tiddler) {
	doc.trigger("twsync.start", { tiddler: tiddler, type: "remove" });
	_removeTiddler.apply(this, arguments);
};

var macro = config.macros.syncstatus = {
	logSize: 10,
	pending: 0,
	log: [],
	errors: [],

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		this.name = macroName;
		$("<div />").addClass(this.name).
			append('<div class="normal" />'). // nested DIV for styling purposes (esp. IE)
			appendTo(place);
	},
	onStart: function(ev, data) {
		macro.pending++;
		if(macro.errors.length == 0) { // TODO: defer to avoid flashing for near-immediate operations
			macro.reset().addClass("pending");
		}
	},
	onSuccess: function(ev, data) {
		macro.pending--;
		macro.log.push({
			timestamp: new Date(),
			msg: "%0 %1 (%2)".format([data.msg, data.tiddler.title,
				data.tiddler.fields["server.workspace"]])
		});
		if(macro.log.length > macro.logSize) {
			macro.log.shift();
		}
		if(macro.errors.length == 0) {
			macro.reset().addClass("normal");
		}
	},
	onError: function(ev, data) {
		macro.pending--;
		macro.errors.push(data);
		macro.reset().addClass("error");
	},
	reset: function() {
		var selector = ".%0 div".format([this.name]);
		return $(selector).removeClass("normal pending error");
	}
};

doc.bind("twsync.start", macro.onStart);
doc.bind("twsync.success", macro.onSuccess);
doc.bind("twsync.error", macro.onError);

var name = "StyleSheetSyncStatus";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

})(jQuery);
//}}}
