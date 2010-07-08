/***
|''Name''|TiddlySpaceBulkOps|
|''Description''|tiddler batch operations|
|''Author''|FND|
|''Version''|0.2.0|
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

.viewer .bulkops ul {
	-tw-comment: duplication due to TiddlyWiki specificity;
	padding: 1px 0 0;
}

.bulkops ul {
	float: left;
	width: 40%;
	min-height: 1em;
	margin: 1em;
	padding-top: 1px;
	list-style-type: none;
	background-color: #FFFEE6;
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

// XXX: temporary
var errback = function(xhr, error, exc) {
	displayMessage("error");
	console.log("error", arguments); // XXX: DEBUG
};

var render = function(container, host, bags, types) { // XXX: types argument not very pretty
	types = types || [];
	$.each(bags, function(i, bag) {
		var el = $("<ul />").addClass(types[i] || "").appendTo(container);
		bag = new tiddlyweb.Bag(bag, host);
		bag.tiddlers().get(function(data, status, xhr) {
			populate(el, data, types[i]);
		}, errback);
	});
};

var populate = function(container, tiddlers, type) {
	var dur = "fast";
	container.
		sortable({
			revert: true,
			dropOnEmpty: true,
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
		}));
};

})(jQuery);
//}}}
