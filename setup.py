AUTHOR = 'Osmosoft'
AUTHOR_EMAIL = 'tiddlyspace@osmosoft.com'
NAME = 'tiddlywebplugins.tiddlyspace'
DESCRIPTION = 'A discoursive social model for TiddlyWiki'
VERSION = '0.2.2' # N.B.: duplicate of tiddlywebplugins.tiddlyspace.__init__


import os

from setuptools import setup, find_packages


setup(
    namespace_packages = ['tiddlywebplugins'],
    name = NAME,
    version = VERSION,
    description = DESCRIPTION,
    long_description = open(os.path.join(os.path.dirname(__file__), 'README')).read(),
    author = AUTHOR,
    author_email = AUTHOR_EMAIL,
    url = 'http://pypi.python.org/pypi/%s' % NAME,
    platforms = 'Posix; MacOS X; Windows',
    packages = find_packages(exclude=['test']),
    scripts = ['tiddlyspace'],
    install_requires = [
        'setuptools',
        'tiddlyweb>=1.1.dev5',
        'tiddlywebwiki>=0.36',
        'tiddlywebplugins.utils>=1.0',
        'tiddlywebplugins.logout>=0.6',
        'tiddlywebplugins.virtualhosting',
        'tiddlywebplugins.socialusers>=0.3',
        'tiddlywebplugins.magicuser>=0.3',
        'tiddlywebplugins.openid2>=0.5',
        'tiddlywebplugins.cookiedomain>=0.6',
        'tiddlywebplugins.mselect',
        'tiddlywebplugins.prettyerror>=0.8',
        'tiddlywebplugins.pathinfohack>=0.8',
        'tiddlywebplugins.form==dev',
        'tiddlywebplugins.reflector>=0.2',
        'tiddlywebplugins.whoosher>=0.9.11',
        'tiddlywebplugins.atom>=1.2.0',
    ],
    include_package_data = True,
    zip_safe = False
)
