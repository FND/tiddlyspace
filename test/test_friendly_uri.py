"""
Test so-called "friendly" uris: links to tiddlers
in the current space from the root.
"""


from test.fixtures import make_test_env, make_fake_space

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2

from tiddlyweb.store import Store
from tiddlyweb.model.user import User
from tiddlyweb.model.tiddler import Tiddler


def setup_module(module):
    make_test_env(module)
    # we have to have a function that returns the callable,
    # Selector just _is_ the callable
    make_fake_space(module.store, 'cdent')
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)
    wsgi_intercept.add_wsgi_intercept('cdent.0.0.0.0', 8080, app_fn)


def teardown_module(module):
    import os
    os.chdir('..')


def test_friendly():
    http = httplib2.Http()
    response, content_core = http.request(
            'http://cdent.0.0.0.0:8080/recipes/cdent_public/tiddlers/TiddlyWebConfig',
            method='GET')
        
    assert response['status'] == '200', content_core

    response, content_friendly = http.request(
            'http://cdent.0.0.0.0:8080/TiddlyWebConfig',
            method='GET')
    assert response['status'] == '200', content_friendly
    assert content_core == content_friendly

    response, content_friendly = http.request(
            'http://0.0.0.0:8080/TiddlyWebConfig',
            method='GET')
    assert response['status'] == '404', content_friendly
