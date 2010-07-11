/***
|''Name''|TiddlySpaceBulkOps|
|''Description''|tiddler batch operations|
|''Author''|FND|
|''Version''|0.5.0|
|''Status''|@@experimental@@|
|''Source''|<...>|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|chrjs [[jQuery UI]]|
!StyleSheet
.bulkops {
	overflow: auto;
	padding-top: 2em;
}

.bulkops * {
	margin: 0;
	border: none;
	padding: 0;
}

.viewer .bulkops ul {
	-tw-comment: duplication due to TiddlyWiki specificity;
	padding: 1px 0 0;
}

.bulkops h3,
.bulkops ul {
	float: left;
	width: 40%;
}

.bulkops h3 {
	-tw-comment: separate from subsequent UL flow;
	margin-top: -1.5em;
}

.bulkops ul {
	min-height: 1em;
	margin: 1em;
	padding-top: 1px;
	list-style-type: none;
	background-color: #FFFEE6;
}

.bulkops li {
	overflow: auto;
	border: 1px solid #AAA;
	margin-top: -1px;
	text-align: center;
	background-color: #EEE;
	cursor: move;
}

.bulkops li.selected {
	background-color: #FED22F;
	opacity: 0.5;
}

.bulkops li .button {
	float: right;
}

.bulkops ul li.error {
	-tw-comment: excessive specificity due to TiddlyWiki -- NB: does not use ColorPalette;
	border-color: #E77;
	background-color: #F88;
}

.tiddlyspace {
	-tw-comment: TiddlySpace-specifics start here
}

.bulkops .public li {
	border-color: #C7EAFF;
	background-color: #E7FFFF;
}

.bulkops .private li {
	border-color: #FFCAE9;
	background-color: #FFEAF9;
}
!Code
***/
//{{{
(function($) {

// XXX: requires TiddlyWiki 2.6.1
//if(!window.tiddlyweb) {
//	throw "Missing dependency: chrjs"; // XXX: TiddlyWiki-specific
//}
//if(!$.fn.sortable) {
//	throw "Missing dependency: jQuery UI"; // XXX: TiddlyWiki-specific
//}

config.macros.TiddlySpaceBulkOps = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").addClass("bulkops").appendTo(place);
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var bags = [space + "_private", space + "_public"];
		var types = ["private", "public"];
		render(container, config.extensions.tiddlyweb.host, bags, types);
	}
};

var name = "StyleSheetBulkOps";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

var render = function(container, host, bags, types) { // XXX: types argument not very pretty
	types = types || [];
	container.data("host", host); // XXX: hacky?
	var dur = "fast";
	var sortOpts = {
		revert: true,
		dropOnEmpty: true,
		connectWith: ".bulkops ul",
		start: function(ev, ui) {
			ui.item.addClass("selected");
		},
		receive: function(ev, ui) {
			ui.item.removeClass("selected");
			$(".bulkops li.selected").not(ui.item).slideUp(dur, function() {
				$(this).insertAfter(ui.item).slideDown(dur, function() {
					$(this).removeClass("selected");
				});
			});
		},
		remove: function(ev, ui) {
			// TODO
		}
	};
	$.each(bags, function(i, bag) {
		$("<h3 />").text(bag).appendTo(container); // TODO: support custom labels
		var el = $("<ul />").addClass(types[i] || "").sortable(sortOpts).
			appendTo(container);
		bag = new tiddlyweb.Bag(bag, host);
		bag.tiddlers().get(function(data, status, xhr) {
			populate(el, data, types[i]);
		}, function(xhr, error, exc) {
			el.sortable("disable");
			$('<li class="error" />').text("failed to load bag " + bag.name). // TODO: i18n
				appendTo(el); // XXX: use el.replaceWith("<p />") instead of LI?
		});
	});
};

var populate = function(container, tiddlers, type) {
	container.append($.map(tiddlers, function(tiddler, i) {
		var link = createTiddlyLink(null, tiddler.title, true, null, null,
			null, true); // XXX: TiddlyWiki-specific
		// prevent event propagation, avoiding selection -- XXX: TiddlyWiki-specific
		var _handler = link.onclick;
		link.onclick = null;
		$(link).click(function(ev) {
			_handler(ev.originalEvent);
			return false;
		});

		var btn = $('<a href="javascript:" class="button" />');
		var delBtn = btn.clone().text("del").attr("title", "delete tiddler"). // TODO: i18n
			click(delHandler);
		var pubBtn = btn.clone().text("pub").attr("title", "publish tiddler"). // TODO: i18n
			click(pubHandler); // XXX: does only belong on private bag
		return $('<li />').append(link).append(delBtn).append(pubBtn). // TODO: use templating!?
			data("tiddler", tiddler).
			click(function(ev) { // XXX: use live?!
				var el = $(this);
				if(!el.hasClass("ui-sortable-helper")) {
					el.toggleClass("selected");
				}
			})[0];
	}));
};

var pubHandler = function(ev) {
	var tid = getTiddler(this);
	var item = $(this).closest("li");
	var errback = function(xhr, error, exc) {
		item.addClass("error"); // XXX: insufficient feedback!?
	};
	var callback = function(tiddler, status, xhr) {
		tiddler.bag.name = tiddler.bag.name.replace(/_private$/, "_public");
		tiddler.put(function(tiddler, status, xhr) {
			var el = item.closest("ul").siblings("ul");
			item.clone().hide().appendTo(el).slideDown("slow"); // XXX: can lead to duplicates -- XXX: lacks click handlers
		}, errback);
	};
	tid.get(callback, errback);
	return false;
};

var delHandler = function(ev) {
	var tid = getTiddler(this);
	if(confirm("delete tiddler " + tid.title)) { // TODO: i18n -- TODO: s/confirm/UI/
		var item = $(this).closest("li");
		var callback = function(data, status, xhr) {
			item.slideUp("slow");
		};
		var errback = function(xhr, error, exc) {
			item.addClass("error"); // XXX: insufficient feedback!?
		};
		tid["delete"](callback, errback);
	}
	return false;
};

var getTiddler = function(btn) {
	btn = $(btn);
	var host = btn.closest(".bulkops").data("host");
	var tiddler = btn.closest("li").data("tiddler");
	var tid = new tiddlyweb.Tiddler(tiddler.title);
	tid.bag = new tiddlyweb.Bag(tiddler.bag, host);
	return tid;
};

})(jQuery);
//}}}
