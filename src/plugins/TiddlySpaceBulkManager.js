/***
|''Name''|TiddlySpaceBulkManager|
|''Description''|tiddler bulk operations|
|''Author''|FND|
|''Version''|0.2.0|
|''Status''|@@experimental@@|
|''Source''|<...>|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig|
!Code
!Usage
<<bulkManager>>
***/
//{{{
(function($) {

var currentSpace = config.extensions.tiddlyspace.currentSpace.name;
var host = config.extensions.tiddlyweb.host;

var bulkmgr = config.macros.bulkManager = {
	locale: {
		title: "Foo",
		desc: "lipsum",
		empty: "no tiddlers found", // XXX: rephrase
		delLabel: "delete",
		delTooltip: "delete selected tiddlers",
		delError: "error removing %0 from bag %1",
		pending: "loading %0..." // XXX: rename?
	},
	listViewTemplate: {
		columns: [
			{ name: "selected", field: "Selected", rowName: "identifier", type: "Selector" },
			{ name: "tiddler", title: "Tiddler", field: "title", type: "String" }, // XXX: type should be link!?
			{ name: "type", title: "Type", field: "state", type: "String" },
			{ name: "tags", title: "Tags", field: "tags", type: "Tags" }
		],
		rowClasses: []
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var pending = this.locale.pending.format(macroName);
		var placeholder = $('<div class="annotation" />').text(pending). // XXX: annotation class inapproriate?
			appendTo(place);
		this.getTiddlers(function(tiddlers) {
			var el = bulkmgr.renderUI(tiddlers);
			placeholder.replaceWith(el);
		});
	},
	onDelete: function(ev, el, tids) {
		var errback = function(xhr, error, exc, tid) {
			var msg = bulkmgr.locale.delError.format(tid.title, tid.bag.name);
			displayMessage(msg);
		};
		if(confirm("ORLY?")) { // TODO: proper confirmation dialog
			var tiddlers = [];
			$.each(tids, function(i, tid) {
				var tiddler = store.getTiddler(tid.title);
				if(tiddler && tiddler.fields["server.bag"] == tid.bag.name) {
					tiddlers.push(tiddler);
					store.removeTiddler(tiddler.title);
				} else {
					tid["delete"]($.noop, errback);
				}
			});
			autoSaveChanges(null, tiddlers);
		}
	},
	renderUI: function(tids) {
		var msg = this.locale;
		var wiz = new Wizard();
		var el = wiz.createWizard(null, msg.title) || wiz.formElem; // XXX: fallback obsolete from TiddlyWiki v2.6.2
		wiz.addStep(msg.desc, "");
		var pane = $(el).find(".wizardStep");

		var entries;

		var onDelete = function(ev) {
			ev = ev || window.event;
			var el = resolveTarget(ev);

			var selector = "input[type=checkbox]:checked";
			var tids = $(selector, pane).map(function(i, node) {
				var id = $(node).attr("rowName");
				var pos = entries.findByField("identifier", id);
				return entries[pos];
			});

			bulkmgr.onDelete(ev, el, tids);
		};

		if(tids.length == 0) {
			$("<em />").text(msg.empty).appendTo(pane);
		} else {
			entries = determineEntries(tids);
			ListView.create(pane[0], entries, this.listViewTemplate);
			wiz.setButtons([
				{ caption: msg.delLabel, tooltip: msg.delTooltip, onClick: onDelete }
			]);
		}

		return el;
	},
	// retrieves all tiddlers from the current space's bags
	// passes an array chrjs TiddlerS to callback (empty list if error occurred)
	getTiddlers: function(callback) {
		var bags = ["public", "private", "archive"];
		var tids = [];
		var res = 0;
		var observer = function(tiddlers, status, xhr, bag) {
			tids = tids.concat(tiddlers); // TODO: sort!?
			res++;
			if(res == bags.length) {
				callback(tids);
			}
		};
		var errback = function(xhr, status, exc, bag) {
			if(res != -1) {
				res = -1;
				callback([], bag); // TODO: document second argument
			}
		};
		$.each(bags, function(i, type) {
			var name = "%0_%1".format(currentSpace, type); // TODO: use getCurrentBag utility function (tw262 branch)
			var bag = new tiddlyweb.Bag(name, host);
			bag.tiddlers().get(observer, errback);
		});
	}
};

// augments chrjs TiddlerS with ListView-related information
var determineEntries = function(tids) {
	return $.map(tids, function(tid, i) {
		tid.identifier = "%0/%1".format(encodeURIComponent(tid.bag.name),
			encodeURIComponent(tid.title));
		var type = tid.bag.name.replace(currentSpace + "_", ""); // XXX: brittle?
		tid.state = type == "archive" ? "archived" : type; // XXX: i18n -- XXX: modifiying existing object is evil!?
		return tid;
	});
};

})(jQuery);
//}}}
