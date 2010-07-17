/***
|''Name''|TiddlySpaceBulkOps|
|''Description''|tiddler batch operations|
|''Author''|FND|
|''Version''|0.7.0|
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
	margin-right: 2em;
	padding-top: 1px;
	list-style-type: none;
	background-color: #FFFEE6;
}

.bulkops li {
	overflow: auto;
	margin-top: -1px;
	border: 1px solid #AAA;
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
!StyleSheetTW
.viewer .bulkops ul {
	margin: 0 2em 0 0;
	padding: 1px 0 0;
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

var macro = config.macros.TiddlySpaceBulkOps = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").addClass("bulkops").appendTo(place);
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var cols = $.map(["private", "public"], function(item, i) {
			return {
				bag: space + "_" + item,
				type: item,
				label: tiddlyweb._capitalize(item),
				pproc: macro.augmentItem // XXX: rename property?
			};
		});
		cols[0].pproc = function(el) { // XXX: hacky
			macro.augmentItem(el);
			el.children(":last").clone(false). // XXX: hacky
				text("pub").attr("title", "publish tiddler"). // TODO: i18n
				click(macro.onPub).
				appendTo(el);
		};
		render(cols, container, config.extensions.tiddlyweb.host);
	},
	augmentItem: function(el) {
		var title = el.data("tiddler").title;
		var link = createTiddlyLink(el[0], title, true, null, null, null, true);
		// prevent event propagation, avoiding selection -- XXX: hacky!?
		var _handler = link.onclick;
		link.onclick = null;
		$(link).click(function(ev) {
			_handler(ev.originalEvent);
			return false;
		});

		$('<a href="javascript:" class="button" />').
			text("del").attr("title", "delete tiddler"). // TODO: i18n
			click(delHandler). // XXX: use live!?
			appendTo(el);
	},
	onPub: function(ev) { // TODO: reuse publishTiddlerRevision's publishTiddler
		var item = $(this).closest("li");
		var tid = item.data("tiddler");
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
	}
};

var name = "StyleSheetBulkOps";
config.shadowTiddlers[name] = "%0\n%1".format([
	store.getTiddlerText(tiddler.title + "##StyleSheet"),
	store.getTiddlerText(tiddler.title + "##StyleSheetTW")]);
store.addNotification(name, refreshStyles);

var render = function(cols, container, host) {
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

			var bag = $(this).data("bag");
			var tiddler = ui.item.data("tiddler");

			moveTiddler(tiddler, bag, function(data, status, xhr) {
				ui.item.effect("highlight", "slow"); // XXX: confusing feedback!?
			}, function(xhr, error, exc) {
				ui.item.addClass("error"); // XXX: insufficient feedback!?
			});
		},
		remove: function(ev, ui) {
			// TODO
		}
	};
	$.each(cols, function(i, col) {
		var label = col.label || col.bag;
		$("<h3 />").text(label).appendTo(container);
		var el = $("<ul />").addClass(col.type || "").sortable(sortOpts).
			data("bag", col.bag).
			appendTo(container);
		$("li", el[0]).live("click", function(ev) {
			var el = $(this);
			if(!el.hasClass("ui-sortable-helper")) {
				el.toggleClass("selected");
			}
		});
		bag = new tiddlyweb.Bag(col.bag, host);
		bag.tiddlers().get(function(data, status, xhr) {
			populate(el, data, col.pproc);
		}, function(xhr, error, exc) {
			el.sortable("disable");
			$('<li class="error" />').text("failed to load bag " + bag.name). // TODO: i18n
				appendTo(el); // XXX: use el.replaceWith("<p />") instead of LI?
		});
	});
};

var populate = function(container, tiddlers, pproc) {
	container.append($.map(tiddlers, function(tiddler, i) {
		var el = $("<li />").data("tiddler", tiddler);
		pproc(el);
		return el[0];
	}));
};

var delHandler = function(ev) {
	var item = $(this).closest("li");
	var tid = item.data("tiddler");
	if(confirm("delete tiddler " + tid.title)) { // TODO: i18n -- TODO: s/confirm/UI/
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

var moveTiddler = function(tiddler, bag, callback, errback) {
	var putCallback = function(data, status, xhr) {
		tiddler["delete"](callback, errback);
	};
	var getCallback = function(revisions, status, xhr) {
		var revs = [];
		var exclude = ["title", "bag", "recipe", "permissions"];
		$.each(revisions, function(i, rev) {
			var clone = {};
			$.each(rev, function(key, value) {
				if(!$.isFunction(value) && $.inArray(key, exclude) == -1) {
					clone[key] = value;
				}
			});
			// retain previous location
			if(!clone.fields.origin) {
				clone.fields.origin = ["bags", rev.bag.name, rev.title].join("/");
			}
			revs.push(clone);
		});
		// add new revision
		var rev = $.extend({}, revs[0]);
		$.extend(rev.fields, revs[0].fields);
		rev.revision++;
		revs.unshift(rev);
		// calculate URI
		var clone = $.extend({}, tiddler);
		clone.bag = $.extend({}, tiddler.bag, { name: bag });
		return $.ajax({ // TODO: fold into chrjs?
			url: clone.revisions().route(),
			type: "POST",
			contentType: "application/json",
			data: $.toJSON(revs),
			beforeSend: function(xhr) {
				var etag = [clone.bag.name, tiddler.title, 0].join("/");
				xhr.setRequestHeader("If-Match", '"' + etag + '"');
			},
			success: putCallback,
			error: errback
		});
	};
	tiddler.revisions().get(getCallback, errback, "fat=1");
};

})(jQuery);
//}}}
