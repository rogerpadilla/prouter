(function() {
    'use strict';

    var location;
    var Router = self.prouter.Router;
    var History = self.prouter.History;

    var Location = function(href) {
        this.replace(href);
    };

    Location.prototype.parser = document.createElement('a');

    Location.prototype.replace = function(href) {
        this.parser.href = href;
        var self = this;
        ['href', 'hash', 'host', 'search', 'fragment', 'pathname', 'protocol'].forEach(function(prop) {
            self[prop] = self.parser[prop];
        });
        // In IE, anchor.pathname does not contain a leading slash though
        // window.location.pathname does.
        if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    };

    Location.prototype.toString = function() {
        return this.href;
    };

    module('prouter.Router', {
        setup: function() {
            location = new Location('http://example.com');
            Router.history = new History();
            Router.history._location = location;
        },
        teardown: function() {
            Router.history.stop();
        }
    });

    test('routes (simple)', 2, function() {
        location.replace('http://example.com#search/news');
        var router = new Router([{
            route: 'search/:query',
            activate: function(newRouteData) {
                equal(newRouteData.path, 'search/news');
                equal(newRouteData.params.query, 'news');
            }
        }, {
            route: 'search/:query/p:page',
            activate: function(newRouteData) {
                ok(false);
            }
        }]);
        Router.history.start();
    });

    test('default route 1.', 1, function() {
        location.replace('http://example.com#search/news');
        var router = new Router([{
            route: 'do-not-match',
            activate: function(newRouteData) {
                ok(false);
            }
        }, {
            route: '*',
            activate: function(newRouteData) {
                ok(true);
            }
        }]);
        Router.history.start();
    });

    test('default route 2.', 1, function() {
        location.replace('http://example.com#search/news');
        var router = new Router([{
            route: 'do-not-match',
            activate: function(newRouteData) {
                ok(false);
            }
        }, {
            route: ':any(.*)',
            activate: function(newRouteData) {
                ok(true);
            }
        }]);
        Router.history.start();
    });

    test('routes (simple, but unicode)', 1, function() {
        location.replace('http://example.com#search/тест');
        var router = new Router([{
            route: 'search/:query',
            activate: function(newRouteData) {
                equal(newRouteData.params.query, 'тест');
            }
        }, {
            route: 'search/:query/p:page',
            activate: function(newRouteData) {
                ok(false);
            }
        }]);
        Router.history.start();
    });


    test('routes (two part)', 3, function() {
        location.replace('http://example.com#search/nyc/p10');
        var router = new Router([{
            route: 'search/:query/p:page',
            activate: function(newRouteData) {
                equal(newRouteData.params.query, 'nyc');
                equal(newRouteData.params.page, '10');
            }
        }]);
        var navigated = Router.history.start();
        ok(navigated);
    });

    test('routes refresh', 4, function() {
        var router = new Router([{
            route: 'login',
            activate: function(newRouteData) {
                ok(true);
            }
        }]);
        var navigated = Router.history.navigate('login');
        notOk(navigated);
        Router.history.start();
        location.replace('http://example.com#login');
        throws(
            Router.history.start,
            Error,
            'must throws error if already started'
        );
        navigated = Router.history.navigate('login');
        ok(navigated);
    });

    test('routes via navigate', 2, function() {
        var router = new Router();
        Router.history.start();
        router.add({
            route: 'search/:query/p:page',
            activate: function(newRouteData) {
                equal(newRouteData.params.query, 'manhattan');
                equal(newRouteData.params.page, '20');
            }
        });
        Router.history.navigate('search/manhattan/p20');
    });

    test('routes via navigate with search', 3, function() {
        var router = new Router([{
            route: 'query/*',
            activate: function(newRouteData) {
                equal(newRouteData.query, 'a=b');
                equal(newRouteData.params['0'], 'test');
            }
        }]);
        Router.history.start();
        var navigated = Router.history.navigate('query/test?a=b');
        ok(navigated);
    });


    test('route precedence via navigate', 2, function() {
        var val;
        var router = new Router([{
            route: 'contacts/:any?',
            activate: function(newRouteData) {
                val = 100;
            }
        }, {
            route: 'contacts/fixed',
            activate: function(newRouteData) {
                val = 200;
            }
        }]);
        Router.history.start();
        Router.history.navigate('contacts');
        equal(val, 100);
        Router.history.navigate('contacts/fixed');
        equal(val, 100);
    });


    test('event parameter.', 4, function() {
        var message = {
            type: 'success',
            msg: 'Item saved'
        };
        var router = new Router([{
            route: 'items/:id',
            activate: function(newRouteData) {
                equal(newRouteData.path, 'items/a12b');
                equal(newRouteData.params.id, 'a12b');
                equal(newRouteData.query, 'param1=val1&param2=val2');
                strictEqual(newRouteData.message, message);
            }
        }]);
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('items/a12b?param1=val1&param2=val2', message);
    });

    test('silent parameter.', 1, function() {
        location.replace('http://example.com/#items/123');
        var router = new Router([{
            route: 'items/:id',
            activate: function() {
                ok(false);
            }
        }]);
        var navigated = Router.history.start({
            silent: true
        });
        notOk(navigated);
    });


    test('query string.', 3, function() {
        var message = {
            msg: 'Password changed',
            type: 'success'
        };
        var router = new Router([{
            route: 'login',
            activate: function(newRouteData) {
                strictEqual(newRouteData.query, 'param1=val1&param2=val2');
                strictEqual(newRouteData.path, 'login');
                deepEqual(newRouteData.message, message);
            }
        }]);
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('login?param1=val1&param2=val2', message);
    });

    test('use implicit callback if none provided', 2, function() {
        var router = new Router();
        Router.history.start();
        router.add({
            route: ':any*',
            activate: function(newRouteData) {
                equal(newRouteData.path, 'implicit');
                equal(newRouteData.params.any, 'implicit');
            }
        });
        Router.history.navigate('implicit');
    });

    test('routes via navigate with {replace: true}', 1, function() {
        location.replace = function(href) {
            strictEqual(href, new Location('http://example.com#end_here').href);
        };
        Router.history.start();
        Router.history.navigate('end_here', null, {
            replace: true
        });
    });

    test('routes cancel navigation', 2, function() {
        var router = new Router([{
            route: 'something',
            activate: function(newRouteData) {
                ok(false);
            }
        }]);
        Router.history.on('route:before', function(router, newNavigationData, oldNavigationData) {
            strictEqual(router, router);
            equal(newNavigationData.path, 'something');
            return false;
        });
        Router.history.on('route:after', function(router, newNavigationData, oldNavigationData) {
            ok(false);
        });
        Router.history.start();
        Router.history.navigate('something');
    });

    test('activate / deactivate callbacks', 9, function() {
        location.replace('http://example.com/path/123');
        var router = new Router([{
            route: 'path/:val',
            activate: function(newNavData, oldNavData) {
                equal(newNavData.path, 'path/123');
                equal(newNavData.params.val, '123');
                equal(oldNavData, null);
            },
            deactivate: function(newNavData, oldNavData) {
                equal(newNavData.path, 'other');
                equal(oldNavData.path, 'path/123');
                equal(oldNavData.params.val, '123');
            }
        }, {
            route: 'other',
            activate: function(newNavData, oldNavData) {
                equal(newNavData.path, 'other');
                equal(oldNavData.path, 'path/123');
                equal(oldNavData.params.val, '123');
            }
        }]);
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('other');
    });

    test('leading slash', 2, function() {
        location.replace('http://example.com/the-root/foo');
        Router.history.start({
            root: '/the-root',
            hashChange: false,
            silent: true
        });
        strictEqual(Router.history.obtainFragment().full, 'foo');
        Router.history.stop();
        Router.history = new History();
        Router.history._location = location;
        Router.history.start({
            root: '/the-root/',
            hashChange: false,
            silent: true
        });
        strictEqual(Router.history.obtainFragment().full, 'foo');
    });

    test('correctly handles URLs with %', 2, function() {
        location.replace('http://example.com#search/fat%3A1.5%25');
        var router = new Router([{
            route: 'search/:query',
            activate: function() {
                ok(true);
            }
        }, {
            route: 'search/:query/:page',
            activate: function() {
                ok(false);
            }
        }]);
        Router.history.start();
        Router.history.navigate('search/fat');
    });

    test('Hashes with UTF8 in them.', 2, function() {
        var router = new Router([{
            route: 'charñ',
            activate: function() {
                ok(true);
            }
        }, {
            route: 'char%C3%B1',
            activate: function() {
                ok(false);
            }
        }]);
        Router.history.start();
        Router.history.navigate('charñ');
        Router.history.navigate('char%C3%B1');
    });

    test('Use pathname when hashChange is not wanted.', 1, function() {
        location.replace('http://example.com/path/name#hash');
        Router.history.start({
            hashChange: false
        });
        var fragment = Router.history.obtainFragment().full;
        strictEqual(fragment, location.pathname.replace(/^\//, ''));
    });

    test('Strip leading slash before location.assign.', 1, function() {
        location.replace('http://example.com/root/');
        Router.history.start({
            hashChange: false,
            root: '/root/'
        });
        location.assign = function(pathname) {
            strictEqual(pathname, '/root/fragment');
        };
        Router.history.navigate('/fragment');
    });

    test('Root fragment without trailing slash.', 1, function() {
        location.replace('http://example.com/root');
        Router.history.start({
            hashChange: false,
            root: '/root/',
            silent: true
        });
        strictEqual(Router.history.obtainFragment().full, '');
    });

    test('History does not prepend root to fragment.', 2, function() {
        location.replace('http://example.com/root/');
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/root/x');
            }
        };
        Router.history.start({
            root: '/root/',
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('x');
        strictEqual(Router.history.obtainFragment().full, '');
    });

    test('Normalize root.', 1, function() {
        location.replace('http://example.com/root');
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/root/fragment');
            }
        };
        Router.history.start({
            pushState: true,
            root: '/root',
            hashChange: false
        });
        Router.history.navigate('fragment');
    });

    test('Normalize root.', 1, function() {
        location.replace('http://example.com/root#fragment');
        Router.history._history = {
            pushState: function(state, title, url) {},
            replaceState: function(state, title, url) {
                strictEqual(url, '/root/fragment');
            }
        };
        Router.history.start({
            pushState: true,
            root: '/root'
        });
    });

    test('Normalize root.', 1, function() {
        location.replace('http://example.com/root');
        Router.history._loadUrl = function() {
            ok(true);
        };
        Router.history.start({
            pushState: true,
            root: '/root'
        });
    });

    test('Normalize root - leading slash.', 1, function() {
        location.replace('http://example.com/root');
        Router.history._history = {
            pushState: function() {},
            replaceState: function() {}
        };
        Router.history.start({
            root: 'root'
        });
        strictEqual(Router.history._root, '/root/');
    });

    test('Transition from hashChange to pushState.', 1, function() {
        location.replace('http://example.com/root#x/y');
        Router.history._history = {
            pushState: function() {},
            replaceState: function(state, title, url) {
                strictEqual(url, '/root/x/y');
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test('Router: Normalize empty root', 1, function() {
        location.replace('http://example.com/');
        Router.history._history = {
            pushState: function() {},
            replaceState: function() {}
        };
        Router.history.start({
            root: ''
        });
        strictEqual(Router.history._root, '/');
    });

    test('Router: nagivate with empty root', 1, function() {
        location.replace('http://example.com/');
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/fragment');
            }
        };
        Router.history.start({
            pushState: true,
            root: '',
            hashChange: false
        });
        Router.history.navigate('fragment');
    });

    test('Transition from pushState to hashChange.', 1, function() {
        location.replace('http://example.com/root/x/y?a=b');
        location.replace = function(url) {
            strictEqual(url, '/root#x/y?a=b');
        };
        Router.history._history = {
            pushState: null,
            replaceState: null
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test('hashChange to pushState with search.', 1, function() {
        location.replace('http://example.com/root#x/y?a=b');
        Router.history._history = {
            pushState: function() {},
            replaceState: function(state, title, url) {
                strictEqual(url, '/root/x/y?a=b');
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test('Trailing space in fragments.', 1, function() {
        var history = new History();
        strictEqual(history.obtainFragment('fragment   ').full, 'fragment');
    });

    test('Leading slash and trailing space.', 1, function() {
        var history = new History();
        strictEqual(history.obtainFragment('/fragment ').full, 'fragment');
    });

    test('hashChange to pushState only if both requested.', 0, function() {
        location.replace('http://example.com/root?a=b#x/y');
        Router.history._history = {
            pushState: function() {},
            replaceState: function() {
                ok(false);
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true,
            hashChange: false
        });
    });


    test('No trailing slash on root 1.', 1, function() {
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/root');
            }
        };
        location.replace('http://example.com/root/path');
        Router.history.start({
            pushState: true,
            hashChange: false,
            root: 'root'
        });
        Router.history.navigate('');
    });

    test('No trailing slash on root 2.', 1, function() {
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/');
            }
        };
        location.replace('http://example.com/path');
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('');
    });

    test('No trailing slash on root 3.', 1, function() {
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/root?x=1');
            }
        };
        location.replace('http://example.com/root/path');
        Router.history.start({
            pushState: true,
            hashChange: false,
            root: 'root'
        });
        Router.history.navigate('?x=1');
    });

    test('Fragment matching sans query/hash.', 2, function() {
        Router.history._history = {
            pushState: function(state, title, url) {
                strictEqual(url, '/path?query#hash');
            }
        };
        new Router({
            map: [{
                route: 'path',
                activate: function() {
                    ok(true);
                }
            }]
        });
        location.replace('http://example.com/');
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('path?query#hash');
    });

    test('Do not decode the search params.', 1, function() {
        new Router({
            map: [{
                route: 'path',
                activate: function(navigationData) {
                    strictEqual(navigationData.query, 'x=y%3Fz');
                }
            }]
        });
        Router.history.start();
        Router.history.navigate('path?x=y%3Fz');
    });

    test('Navigate to a hash url.', 1, function() {
        Router.history.start({
            pushState: true
        });
        new Router({
            map: [{
                route: 'path',
                activate: function(navigationData) {
                    strictEqual(navigationData.query, 'x=y');
                }
            }]
        });
        location.replace('http://example.com/path?x=y#hash');
        Router.history._checkUrl();
    });

    test('navigate to a hash url.', 1, function() {
        Router.history.start({
            pushState: true
        });
        new Router({
            map: [{
                route: 'path',
                activate: function(navigationData) {
                    strictEqual(navigationData.query, 'x=y');
                }
            }]
        });
        Router.history.navigate('path?x=y#hash');
    });

    test('unicode pathname', 1, function() {
        location.replace('http://example.com/myyjä');
        new Router({
            map: [{
                route: 'myyjä',
                activate: function() {
                    ok(true);
                }
            }]
        });
        Router.history.start({
            pushState: true
        });
    });

    test('newline in route', 1, function() {
        location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
        new Router({
            map: [{
                route: 'stuff\nnonsense',
                activate: function() {
                    ok(true);
                }
            }]
        });
        Router.history.start({
            pushState: true
        });
    });

    test('preserve context (this)', 2, function() {
        var someVal = Math.random();
        var router = new Router([{
            route: 'one',
            someAttr: someVal,
            activate: function() {
                strictEqual(this.someAttr, someVal);
            },
            deactivate: function() {
                strictEqual(this.someAttr, someVal);
            }
        }, {
            route: 'two',
            activate: function() {

            }
        }]);
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('one');
        Router.history.navigate('two');
    });

    test('History#navigate decodes before comparison.', 2, function() {
        location.replace('http://example.com/shop/search?keyword=short%20dress');
        Router.history._history = {
            pushState: function() {
                ok(true);
            },
            replaceState: function() {
                ok(false);
            }
        };
        Router.history.start({
            pushState: true
        });
        Router.history.navigate('shop/search?keyword=short%20dress');
        strictEqual(Router.history.obtainFragment().full, 'shop/search?keyword=short dress');
    });

    test('Urls in the params', 1, function() {
        location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        var router = new Router();
        router.add({
            route: 'login',
            activate: function(newRouteData) {
                strictEqual(newRouteData.query, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
            }
        });
        Router.history.start();
    });

})();
