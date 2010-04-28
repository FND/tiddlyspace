"""
Routine related to web handling of space
listing, creation, subscription, etc.
"""

import simplejson

from tiddlyweb.model.bag import Bag
from tiddlyweb.model.recipe import Recipe
from tiddlyweb.model.user import User
from tiddlyweb.model.policy import Policy
from tiddlyweb.store import NoRecipeError, NoBagError, NoUserError
from tiddlyweb.web.http import HTTP404, HTTP409

from tiddlywebplugins.utils import require_any_user


def add_spaces_routes(selector):
    """
    Set up the routes and handlers used by spaces.
    """
    selector.add('/spaces', # list all spaces
            GET=list_spaces)
    selector.add('/spaces/{space_name:segment}',
            GET=confirm_space, # confirm space exists
            PUT=create_space,  # create a new space
            POST=subscribe_space, # subscribe a space to this space
            )
    selector.add('/spaces/{space_name:segment}/members', # list space members
            GET=list_space_members)
    selector.add('/spaces/{space_name:segment}/members', # list space members
            GET=list_space_members)
    selector.add('/spaces/{space_name:segment}/members/{user_name:segment}',
            PUT=add_space_member, # add member to space
            DELETE=delete_space_member) # delete from from space


def add_space_member(environ, start_response):
    """
    Add a member to a space if they are not already a member.
    If they are already a member, nothing happens. If the username
    given does not exist, raise 409. If the space does not exist
    raise 404.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    user_name = environ['wsgiorg.routing_args'][1]['user_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        public_name = '%s_public' % space_name
        private_name = '%s_private' % space_name
        public_bag = store.get(Bag(public_name))
        private_bag = store.get(Bag(private_name))
        public_recipe = store.get(Recipe(public_name))
        private_recipe = store.get(Recipe(private_name))
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)

    private_bag.policy.allows(current_user, 'manage')

    try:
        store.get(User(user_name))
    except NoUserError:
        raise HTTP409('attemp to add non-existent user: %s' % user_name)

    for entity in [public_bag, private_bag, public_recipe, private_recipe]:
        new_policy = _update_policy(entity.policy, add=user_name)
        entity.policy = new_policy
        store.put(entity)

    start_response('204 No Content', [])
    return ['']


def confirm_space(environ, start_response):
    """
    Confirm a spaces exists. If it does, raise 204. If
    not, raise 404.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        store.get(Recipe('%s_public' % space_name))
        store.get(Recipe('%s_private' % space_name))
    except NoRecipeError:
        raise HTTP404('%s does not exist' % space_name)
    start_response('204 No Content', [])
    return ['']


@require_any_user()
def create_space(environ, start_response):
    """
    Create a space if it does not yet exists. If it does
    raise 409.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    try:
        store.get(Recipe('%s_private' % space_name))
    except NoRecipeError:
        return _create_space(environ, start_response, space_name)
    raise HTTP409('%s already exists' % space_name)


def delete_space_member(environ, start_response):
    """
    Remove a member from a space. If the space does not exist
    raise 404. If the named member is not in the space, do
    nothing.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    user_name = environ['wsgiorg.routing_args'][1]['user_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        public_name = '%s_public' % space_name
        private_name = '%s_private' % space_name
        public_bag = store.get(Bag(public_name))
        private_bag = store.get(Bag(private_name))
        public_recipe = store.get(Recipe(public_name))
        private_recipe = store.get(Recipe(private_name))
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)

    private_bag.policy.allows(current_user, 'manage')

    for entity in [public_bag, private_bag, public_recipe, private_recipe]:
        new_policy = _update_policy(entity.policy, subtract=user_name)
        entity.policy = new_policy
        store.put(entity)

    start_response('204 No Content', [])
    return ['']


def list_spaces(environ, start_response):
    """
    List all the spaces on the service, as a JSON list.
    """
    store = environ['tiddlyweb.store']
    mine = environ['tiddlyweb.query'].get('mine', [None])[0]
    current_user = environ['tiddlyweb.usersign']['name']
    if mine:
        spaces = [recipe.name.rstrip('_public') for
                recipe in store.list_recipes() if
                recipe.name.endswith('_public') and
                current_user in recipe.policy.manage
                ]
    else:
        spaces = [recipe.name.rstrip('_public') for
                recipe in store.list_recipes() if
                recipe.name.endswith('_public')]
    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')
        ])
    return simplejson.dumps(spaces)


def list_space_members(environ, start_response):
    """
    List the members of the named space. You must be a member
    to list the members.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        private_space_bag = store.get(Bag('%s_private' % space_name))
        private_space_bag.policy.allows(current_user, 'manage')
        members = [member for member in private_space_bag.policy.manage if
                not member.startswith('R:')]
    except NoBagError:
        raise HTTP404('No space for %s' % space_name)
    start_response('200 OK', [
        ('Content-Type', 'application/json; charset=UTF-8')
        ])
    return simplejson.dumps(members)


def subscribe_space(environ, start_response):
    """
    Subscribe the spaces named in the JSON content of
    the request to the space named in the URI. The current
    user must be a member of the space. Raise 409 if the
    JSON is no good. Raise 404 if the space does not exist.
    Raise 409 if a space in the JSON does not exist.
    """
    store = environ['tiddlyweb.store']
    space_name = environ['wsgiorg.routing_args'][1]['space_name']
    current_user = environ['tiddlyweb.usersign']
    try:
        public_name = '%s_public' % space_name
        private_name = '%s_private' % space_name
        store.get(Bag(public_name)) # checked for existence, but not used
        private_bag = store.get(Bag(private_name))
        public_recipe = store.get(Recipe(public_name))
        private_recipe = store.get(Recipe(private_name))
    except (NoBagError, NoRecipeError):
        raise HTTP404('space %s does not exist' % space_name)

    private_bag.policy.allows(current_user, 'manage')

    try:
        length = environ['CONTENT_LENGTH']
        content = environ['wsgi.input'].read(int(length))
        info = simplejson.loads(content)
        subscriptions = info['subscriptions']
    except (simplejson.decoder.JSONDecodeError, KeyError), exc:
        raise HTTP409('Invalid content for subscription: %s' % exc)

    public_recipe_list = public_recipe.get_recipe()
    private_recipe_list = private_recipe.get_recipe()
    for space in subscriptions:
        _validate_subscription(environ, space)
        try:
            subscribed_recipe = store.get(Recipe('%s_public' % space))
            for bag, filter_string in subscribed_recipe.get_recipe()[2:]:
                if (bag, filter_string) not in public_recipe_list:
                    public_recipe_list.insert(-1, (bag, filter_string))
                if (bag, filter_string) not in private_recipe_list:
                    private_recipe_list.insert(-2, (bag, filter_string))
        except NoRecipeError, exc:
            raise HTTP409('Invalid content for subscription: %s' % exc)
    public_recipe.set_recipe(public_recipe_list)
    store.put(public_recipe)
    private_recipe.set_recipe(private_recipe_list)
    store.put(private_recipe)

    start_response('204 No Content', [])
    return ['']


def _create_space(environ, start_response, space_name):
    """
    Create the space named by space_name. Raise 201 on success.
    """
    _validate_space_name(environ, space_name)
    _make_space(environ, space_name)
    start_response('201 Created', [])
    return ['']


def _make_policy(member):
    """
    Make a new private policy with the named member.
    """
    policy = Policy()
    policy.owner = member
    for constraint in ('read', 'write', 'create', 'delete', 'manage'):
        setattr(policy, constraint, [member])
    policy.accept = ['NONE']
    return policy


def _update_policy(policy, add=None, subtract=None):
    """
    Update the policy adding or subtracting the user named in
    add or subtract.
    """
    for constraint in ('read', 'write', 'create', 'delete', 'manage'):
        constraint_values = getattr(policy, constraint)
        if add and add not in constraint_values:
            constraint_values.append(add)
        if subtract and subtract in constraint_values:
            constraint_values.remove(subtract)
    return policy


def _make_space(environ, space_name):
    """
    The details of creating the bags and recipes that make up a space.
    """
    store = environ['tiddlyweb.store']
    member = environ['tiddlyweb.usersign']['name']

    # XXX stub out the clumsy way for now
    # can make this much more declarative

    private_bag = Bag('%s_private' % space_name)
    public_bag = Bag('%s_public' % space_name)
    private_bag.policy = _make_policy(member)
    public_bag.policy = _make_policy(member)
    public_bag.policy.read = []
    store.put(private_bag)
    store.put(public_bag)

    public_recipe = Recipe('%s_public' % space_name)
    public_recipe.set_recipe([
        ('system', ''),
        ('tiddlyspace', ''),
        (public_recipe.name, '')
        ])
    private_recipe = Recipe('%s_private' % space_name)
    private_recipe.set_recipe([
        ('system', ''),
        ('tiddlyspace', ''),
        (public_recipe.name, ''),
        (private_recipe.name, '')
        ])
    private_recipe.policy = _make_policy(member)
    public_recipe.policy = _make_policy(member)
    public_recipe.policy.read = []
    store.put(public_recipe)
    store.put(private_recipe)


def _validate_space_name(environ, name):
    """
    Determine if space name can be used.
    We've already checked if the space exists.
    """
    if not name.islower(): # just a stub for now
        raise HTTP409('Invalid space name, lowercase required: %s' % name)
    # XXX this reserved list should/could be built up from multiple
    # sources.
    reserved_space_names = environ['tiddlyweb.config'].get(
            'socialusers.reserved_names', [])
    if name in reserved_space_names:
        raise HTTP409('Invalid space name: %s' % name)


def _validate_subscription(environ, name):
    """
    Determine if this space can be subscribed to. We know that
    the space exists, what we want to determine here is if it
    has been blacklisted or something similar.
    """
    if name in environ['tiddlyweb.config'].get('blacklisted_spaces', []):
        raise HTTP409('Subscription not allowed to space: %s' % name)