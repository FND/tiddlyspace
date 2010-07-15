/***
|''Name''|TiddlySpaceActivities|
|''Description''|provides a stream of user activities|
|''Author''|FND|
|''Version''|0.1.0|
|''Status''|@@experimental@@|
|''Source''|<...>|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|chrjs|
!StyleSheet
.stream li {
	margin-top: -1px;
	border: 1px solid #AAA;
	padding-top: 1px;
	text-align: center;
	background-color: #EEE;
}

.stream li.new {
	background-color: #FF0;
}
!Code
***/
//{{{
(function($) {

// XXX: requires TiddlyWiki 2.6.1
//if(!window.tiddlyweb) {
//	throw "Missing dependency: chrjs";
//}

var macro = config.macros.TiddlySpaceActivities = {
	source: "followees", // TODO: rename -- XXX: use macro parameter?
	interval: 10000, // XXX: ?
	imax: 20, // TODO: rename
	max: 10, // TODO: rename
	containerClass: "stream", // TODO: rename
	newItemClass: "new",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var users = store.getTiddlerText(this.source);
		if(!users) {
			return false; // XXX: insufficient feedback
		}
		users = users.readBracketedList();
		var query = "q=(modifier:%0);sort=-modified;limit=%1".
			format([users.join(" OR modifier:"), this.imax]);

		var el = $("<ul />").addClass(this.containerClass).appendTo(place);
		var iid;
		var poll = function() {
			if(el.filter(":visible").length == 0) {
				clearInterval(iid); // XXX: deactivate permanently?
				return false;
			}
			macro.getItems(query, function(tids) {
				macro.refresh(el, tids);
			}, function(xhr, error, exc) {
				el.addClass("error"); // XXX: insufficient feedback
			});
		};
		poll();
		query = query.replace(";limit=" + this.imax, ";limit=" + this.max);
		iid = setInterval(poll, this.interval);
	},
	refresh: function(el, tids) {
		$("li", el).removeClass(this.newItemClass);
		el.children().slice(-tids.length).slideUp("slow", function() {
			$(this).remove();
		});
		$.each(tids, function(i, tid) {
			var link = createTiddlyLink(null, tid.title, true, null, null, null, true);
			// TODO: use linkedFromTiddler argument to support loadMissingTiddler
			$("<li />").addClass(macro.newItemClass).
				append(link).
				hide().prependTo(el).slideDown("slow");
		});
	},
	getItems: function(query, callback, errback) {
		var search = new tiddlyweb.Collection("search", config.extensions.tiddlyweb.host);

		// XXX: temporary workaround; chrjs 0.9 mistakenly encodes filter string
		tiddlyweb.routes.search = "{host}/search";
		var _route = search.route;
		search.route = function() {
			return _route.apply(this, arguments).
				replace(/%3B/g, ";").replace(/%3D/g, "=");
		};

		search.get(function(data, status, xhr) {
			// XXX: hacky; required because TiddlerCollection is not exposed and expects container
			var parseCollection = tiddlyweb.Bag.prototype.tiddlers().parse;
			var collection = { container: { host: search.host } };
			var tids = parseCollection.apply(collection, [data]);
			callback(tids);
		}, errback, query);
	}
};

var name = "StyleSheetActivities";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

})(jQuery);
//}}}
