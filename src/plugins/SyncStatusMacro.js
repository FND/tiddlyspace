/***
|''Name''|<...>|
|''Description''|<...>|
|''Author''|FND|
|''Version''|0.1|
|''Status''|@@experimental@@|
|''Source''|http://devpad.tiddlyspot.com/#<...>|
|''CodeRepository''|http://svn.tiddlywiki.org/Trunk/contributors/FND/|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|ServerSideSavingPlugin|
|''Keywords''|serverSide|
!Usage
<<syncstatus>>
!Revision History
!!v0.1 (2010-07-28)
* initial release
!StyleSheet
.syncstatus div {
	width: 100px;
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
sssp.reportFailure = function(msg, tiddler, context) {
	doc.trigger("twsync.error", { msg: msg, tiddler: tiddler, context: context });
};

var macro = config.macros.syncstatus = {
	errors: [],

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		this.name = macroName;
		$("<div />").addClass(this.name).
			append('<div class="normal" />'). // nested DIV for styling purposes (esp. IE)
			appendTo(place);
	},
	onReq: function(ev, data) {
console.log("req", data);
		if(macro.errors.length == 0 && data.pending > 0) {
			macro.reset().addClass("pending");
		}
	},
	onSuccess: function(ev, data) {
		if(macro.errors.length == 0) {
			macro.reset().addClass("normal");
		}
	},
	onError: function(ev, data) {
		macro.errors.push(data);
		macro.reset().addClass("error");
	},
	reset: function() {
		var selector = ".%0 div".format([this.name]);
		return $(selector).removeClass("normal pending error");
	}
};

doc.bind("twsync.success", macro.onSuccess);
doc.bind("twsync.error", macro.onError);
doc.bind("ajaxQueue", macro.onReq);

var name = "StyleSheetSyncStatus";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

})(jQuery);
//}}}
