//{{{
(function($) {

config.macros.TiddlySpaceIdentities = {
	uri: "/bags/common/tiddlers/TiddlySpaceIdentities.js",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var placeholder = $('<span class="annotation" />').text("loading..."). // XXX: i18n
			appendTo(place);
		loadScript(this.uri, function() { // XXX: will throw exception due to reliance on tiddler variable in scope
			invokeMacro(placeholder[0], macroName, paramString, wikifier, tiddler);
		});
	}
};

})(jQuery);
//}}}
