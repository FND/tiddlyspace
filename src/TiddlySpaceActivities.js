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
!DEBUG
<<TiddlySpaceActivities>>
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

// XXX: DEBUG
//url: '%0/search.json?q=ftitle:"%1" %2'.format([host, escape(title), bagQuery])
//http://tiddlyspace.com/search?q=modifier:cdent;sort=-modified;limit=10

var macro = config.macros.TiddlySpaceActivities = {
	interval: 10000, // XXX: ?
	containerClass: "stream", // TODO: rename
	newItemClass: "new",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var iid;
		var query = "SecondaryLight"; // XXX: DEBUG
		var el = $("<ul />").addClass(this.containerClass).appendTo(place);
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
		iid = setInterval(poll, this.interval);
	},
	refresh: function(el, tids) {
		// XXX: DEBUG
		tids = tids.concat(tids).concat(tids).concat(tids).concat(tids);
		if(!this.flag) {
			this.flag = true;
			tids = tids.concat(tids);
		}

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
		search.query = query;
		search.get(function(data, status, xhr) {
			// XXX: hacky; required because TiddlerCollection is not exposed and expects container
			var parseCollection = tiddlyweb.Bag.prototype.tiddlers().parse;
			var collection = { container: { host: search.host } };
			var tids = parseCollection.apply(collection, [data]);
			callback(tids);
		}, errback);
	}
};

var name = "StyleSheetActivities";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

})(jQuery);
//}}}
