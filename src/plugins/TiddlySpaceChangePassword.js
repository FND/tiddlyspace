/***
|''Name''|TiddlySpaceChangePassword|
|''Version''||
|''Requires''|TiddlyWebConfig TiddlySpaceUserControls|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Current password:</dt>
			<dd>
				<input type="password" name="password" />
			</dd>
			<dd>
				<dt>New password:</dt>
				<input type="password" name="new_password" />
				<dt>Confirm new password:</dt>
				<input type="password" name="new_password_confirm" />
			</dd>
		</dl>
		<p class="annotation" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyweb;
var displayError = config.macros.TiddlySpaceLogin.displayError;

var macro = config.macros.TiddlySpaceChangePassword = {
	locale: {
		label: "Change password",
		cpwSuccess: "Password changed",
		noPasswordError: "Please enter password",
		passwordMatchError: "Error: passwords do not match",
		passwordShortError: "Error: password must be at least %0 characters",
		passwordMinLength: 6
	},
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(macro.formTemplate).submit(macro.onSubmit).
			find("legend").text(macro.locale.label).end().
			find(".annotation").hide().end().
			find("[type=submit]").val(macro.locale.label).end().
			appendTo(place);
	},

	onSubmit: function(ev) {
		var msg = macro.locale;
		var form = $(this).closest("form");
		form.find(".annotation").hide();
		var password = form.find("[name=password]").val();
		var npassword = form.find("[name=new_password]").val();
		var npasswordConfirm = form.find("[name=new_password_confirm]").val();
		if(npassword != npasswordConfirm) {
			var xhr = { status: 409 }; // XXX: hacky
			var ctx = {
				msg: {
					409: msg.passwordMatchError
				},
				form: form,
				selector: "[name=new_password], [name=new_password_confirm]"
			};
			displayError(xhr, null, null, ctx);
		} else if(npassword.length < msg.passwordMinLength) {
			var xhr = { status: 409 }; // XXX: hacky
			var ctx = {
				msg: {
					409: msg.passwordShortError.format([msg.passwordMinLength])
				},
				form: form,
				selector: "[name=new_password]"
			};
			displayError(xhr, null, null, ctx);
		} else {
			macro.changePassword(ns.username, password, npassword);
		}
		return false;
	},

	changePassword: function(username, password, npassword, form) {
		var msg = macro.locale;
		var pwCallback = function(resource, status, xhr) {
			displayMessage(msg.cpwSuccess);
		};
		var pwErrback = function(xhr, error, exc) {
			var ctx = {
				msg: {},
				form: form,
				selector: "[name=new_password]"
			};
			displayError(xhr, null, null, ctx);
		};
		var user = new tiddlyweb.User(username, password, ns.host);
		user.setPassword(npassword, pwCallback, pwErrback);
	}
};

})(jQuery);
//}}}
