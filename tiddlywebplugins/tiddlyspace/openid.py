"""
Subclass of tiddlywebplugins.openid2 to support
tiddlyweb_secondary_user cookie.
"""


import urlparse

from tiddlyweb.web.util import server_host_url, make_cookie

from tiddlywebplugins.openid2 import Challenger as OpenID


FRAGMENT_VALUE = 'auth:OpenID:'


class Challenger(OpenID):

    def __init__(self):
        self.name = __name__

    def _success(self, environ, start_response, info):
        """
        After successful validation of an openid generate
        and send a cookie with the value of that openid.
        If this is a normal auth scenario make the name
        of the cookie the normal 'tiddlyweb_user'. If this
        is auth addition, where a fragment of 'auth:OpenID' is
        set, then name the cookie 'tiddlyweb_secondary_user'.
        """
        usersign = info.getDisplayIdentifier()
        if info.endpoint.canonicalID:
            usersign = info.endpoint.canonicalID
        # canonicolize usersign to tiddlyweb form
        if usersign.startswith('http'):
            usersign = usersign.split('://', 1)[1]
        usersign = usersign.rstrip('/')
        uri = urlparse.urljoin(server_host_url(environ),
                environ['tiddlyweb.query'].get('tiddlyweb_redirect', ['/'])[0])

        cookie_name = 'tiddlyweb_user'
        cookie_age = environ['tiddlyweb.config'].get('cookie_age', None)
        try:
            fragment = uri.rsplit('#', 1)[1]
            openid = fragment[len(FRAGMENT_VALUE):]
        except (ValueError, IndexError):
            fragment = None
        if fragment and openid == usersign: # XXX: usersign check unnecessary!?
            cookie_name = 'tiddlyweb_secondary_user'
            cookie_age = None
        secret = environ['tiddlyweb.config']['secret']
        cookie_header_string = make_cookie(cookie_name, usersign,
                mac_key=secret, path=self._cookie_path(environ),
                expires=cookie_age)
        start_response('303 See Other',
                [('Location', uri.encode('utf-8')),
                    ('Content-Type', 'text/plain'),
                    ('Set-Cookie', cookie_header_string)])
        return [uri]
