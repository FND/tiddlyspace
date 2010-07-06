/***
|''Name''|TiddlySpaceBulkOps|
|''Description''|tiddler batch operations|
|''Author''|FND|
|''Version''|0.1.0|
|''Status''|@@experimental@@|
|''Source''|<...>|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|chrjs [[jQuery UI]]|
!StyleSheet
.bulkops {
	overflow: auto;
}

.bulkops * {
	margin: 0;
	border: none;
	padding: 0;
}

.bulkops ul {
	float: left;
	width: 40%;
	margin: 1em;
	padding-top: 1px;
	list-style-type: none;
}

.bulkops li {
	border: 1px solid #AAA;
	margin-top: -1px;
	text-align: center;
	background-color: #EEE;
	cursor: move;
}

.bulkops .public li {
	border-color: #C7EAFF;
	background-color: #E7FFFF;
}

.bulkops .private li {
	border-color: #FFCAE9;
	background-color: #FFEAF9;
}

.bulkops li.selected {
	background-color: #FED22F;
}
!Code
***/
//{{{
(function($) {

// XXX: temporary
var uri = "http://ajax.googleapis.com/ajax/libs/jqueryui/1/jquery-ui.js";
$('<script type="text/javascript" />').attr("src", uri).appendTo(document.body);

config.macros.bulkops = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").addClass(macroName).appendTo(place);
		init(container, config.extensions.tiddlyweb.host,
			config.extensions.tiddlyspace.currentSpace.name);
	}
};

var name = "StyleSheetBulkOps";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

// XXX: temporary
var errback = function(xhr, error, exc) {
	displayMessage("error");
	console.log("error", arguments); // XXX: DEBUG
};

var init = function(container, host, space) {
	var bag = new tiddlyweb.Bag(space + "_private", host);
	bag.tiddlers().get(function(data, status, xhr) {
		populate(container, data, "private");
	}, errback);

	var bag = new tiddlyweb.Bag(space + "_public", host);
	bag.tiddlers().get(function(data, status, xhr) {
		populate(container, data, "public");
	}, errback);
};

var populate = function(container, tiddlers, type) {
	var dur = "fast";
	$("<ul />").addClass(type).
		sortable({
			revert: true,
			connectWith: "ul.public, ul.private",
			start: function(ev, ui) {
				ui.item.addClass("selected");
			},
			receive: function(ev, ui) {
				ui.item.removeClass("selected");
				$("li.selected").not(ui.item).slideUp(dur, function() { // XXX: selector insufficiently scoped
					$(this).insertAfter(ui.item).slideDown(dur, function() {
						$(this).removeClass("selected");
					});
				});
			},
			remove: function(ev, ui) {
				// TODO
			}
		}).
		append($.map(tiddlers, function(tiddler, i) {
			return $("<li />").text(tiddler.title).click(function(ev) { // XXX: use live!?
				var el = $(this);
				if(!el.hasClass("ui-sortable-helper")) {
					el.toggleClass("selected");
				}
			})[0];
		})).
		appendTo(container);
};

})(jQuery);
//}}}
