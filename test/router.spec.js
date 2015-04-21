(function () {

    var holder = null;
    var router = null;
    var location = null;
    var lastArgs = [];

    const Router = this.easyRouter.Router;

    var onRoute = function (router, args) {
        lastArgs = args.new.params;
    };

    var Location = function (href) {
        this.replace(href);
    };

    Location.prototype.parser = document.createElement('a');

    Location.prototype.replace = function (href) {
        this.parser.href = href;
        var self = this;
        ['href', 'hash', 'host', 'search', 'fragment', 'pathname', 'protocol'].forEach(function (prop) {
            self[prop] = self.parser[prop];
        });
        // In IE, anchor.pathname does not contain a leading slash though
        // window.location.pathname does.
        if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    };

    Location.prototype.toString = function () {
        return this.href;
    };

    module("easyRouter.Router", {

        setup: function () {

            holder = {testing: 101, count: 0};
            location = new Location('http://example.com');
            Router.history = new Router.History();
            Router.history.location = location;

            router = new Router({
                routes: {
                    "noCallback": "noCallback",
                    "search/:query": {
                        on: function (query, page) {
                            holder.query = query;
                            holder.page = page;
                        }
                    },
                    "search/:query/p:page": {
                        on: function (query, page) {
                            holder.query = query;
                            holder.page = page;
                        }
                    },
                    "charñ": {
                        on: function () {
                            holder.charType = 'UTF';
                        }
                    },
                    "char%C3%B1": {
                        on: function () {
                            holder.charType = 'escaped';
                        }
                    },
                    "contacts": {
                        on: function () {
                            holder.contact = 'index';
                        }
                    },
                    "contacts/new": {
                        on: function () {
                            holder.contact = 'new';
                        }
                    },
                    "contacts/:id": {
                        on: function () {
                            holder.contact = 'load';
                        }
                    },
                    "route-event/:arg": {
                        on: function (arg) {
                        }
                    },
                    "optional(/:item)": {
                        on: function (arg) {
                            holder.arg = arg != void 0 ? arg : null;
                        }
                    },
                    "named/optional/(y:z)": {
                        on: function (z) {
                            holder.z = z;
                        }
                    },
                    "splat/*args/end": {
                        on: function (args) {
                            holder.args = args;
                        }
                    },
                    ":repo/compare/*from...*to": {
                        on: function (repo, from, to) {
                            holder.repo = repo;
                            holder.from = from;
                            holder.to = to;
                        }
                    },
                    "decode/:named/*splat": {
                        on: function (named, path) {
                            holder.named = named;
                            holder.path = path;
                        }
                    },
                    "*first/complex-*part/*rest": {
                        on: function (first, part, rest) {
                            holder.first = first;
                            holder.part = part;
                            holder.rest = rest;
                        }
                    },
                    "query/:entity": {
                        on: function (entity, args) {
                            holder.entity = entity;
                            holder.queryArgs = args;
                        }
                    },
                    "function/:value": {
                        on: externalObject.routingFunction
                    },
                    "implicit": {
                        on: function () {
                            holder.count++;
                        }
                    },
                    "*anything": {
                        on: function (whatever) {
                            holder.anything = whatever;
                        }
                    }
                }
            });

            Router.history.start({pushState: false});
            lastArgs = [];
            Router.history.on('route', onRoute);
        },

        teardown: function () {
            Router.history.stop();
            Router.history.off('route', onRoute);
        }

    });

    var externalObject = {
        value: 'unset',
        routingFunction: function (value) {
            this.value = value;
        }
    };

    externalObject.routingFunction = externalObject.routingFunction.bind(externalObject);

    test("initialize", 1, function () {
        equal(holder.testing, 101);
    });

    test("routes (simple)", 3, function () {
        location.replace('http://example.com#search/news');
        Router.history.checkUrl();
        equal(holder.query, 'news');
        equal(holder.page, void 0);
        equal(lastArgs[0], 'news');
    });

    test("routes (simple, but unicode)", 3, function () {
        location.replace('http://example.com#search/тест');
        Router.history.checkUrl();
        equal(holder.query, "тест");
        equal(holder.page, void 0);
        equal(lastArgs[0], "тест");
    });

    test("routes (two part)", 2, function () {
        location.replace('http://example.com#search/nyc/p10');
        Router.history.checkUrl();
        equal(holder.query, 'nyc');
        equal(holder.page, '10');
    });

    test("routes via navigate", 2, function () {
        Router.history.navigate('search/manhattan/p20', {trigger: true});
        equal(holder.query, 'manhattan');
        equal(holder.page, '20');
    });

    test("routes via navigate with params", 1, function () {
        Router.history.navigate('query/test?a=b', {trigger: true});
        equal(holder.queryArgs, 'a=b');
    });

    test("routes via navigate for backwards-compatibility", 2, function () {
        Router.history.navigate('search/manhattan/p20', true);
        equal(holder.query, 'manhattan');
        equal(holder.page, '20');
    });

    test("reports matched route via nagivate", 1, function () {
        ok(Router.history.navigate('search/manhattan/p20', true));
    });

    test("route precedence via navigate", 4, function () {
        // check both 0.9.x and backwards-compatibility options
        [{trigger: true}, true].forEach(function (options) {
            Router.history.navigate('contacts', options);
            equal(holder.contact, 'index');
            Router.history.navigate('contacts/new', options);
            equal(holder.contact, 'new');
        });
    });

    test("loadUrl is not called for identical routes.", 0, function () {
        Router.history.loadUrl = function () {
            ok(false);
        };
        location.replace('http://example.com#route');
        Router.history.navigate('route');
        Router.history.navigate('/route');
        Router.history.navigate('/route');
        Router.history.navigate('/route/');
        Router.history.navigate('route/');
    });

    test("use implicit callback if none provided", 1, function () {
        router.count = 0;
        router.navigate('implicit', {trigger: true});
        equal(holder.count, 1);
    });

    test("routes via navigate with {replace: true}", 1, function () {
        location.replace('http://example.com#start_here');
        Router.history.checkUrl();
        location.replace = function (href) {
            strictEqual(href, new Location('http://example.com#end_here').href);
        };
        Router.history.navigate('end_here', {replace: true});
    });

    test("routes (splats)", 1, function () {
        location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
        Router.history.checkUrl();
        equal(holder.args, 'long-list/of/splatted_99args');
    });

    test("routes (github)", 3, function () {
        location.replace('http://example.com#Router/compare/1.0...braddunbar:with/slash');
        Router.history.checkUrl();
        equal(holder.repo, 'Router');
        equal(holder.from, '1.0');
        equal(holder.to, 'braddunbar:with/slash');
    });

    test("routes (optional)", 2, function () {
        location.replace('http://example.com#optional');
        Router.history.checkUrl();
        ok(!holder.arg);
        location.replace('http://example.com#optional/thing');
        Router.history.checkUrl();
        equal(holder.arg, 'thing');
    });

    test("routes (complex)", 3, function () {
        location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
        Router.history.checkUrl();
        equal(holder.first, 'one/two/three');
        equal(holder.part, 'part');
        equal(holder.rest, 'four/five/six/seven');
    });

    test("routes (query)", 4, function () {
        location.replace('http://example.com#query/mandel?a=b&c=d');
        Router.history.checkUrl();
        equal(holder.entity, 'mandel');
        equal(holder.queryArgs, 'a=b&c=d');
        equal(lastArgs[0], 'mandel');
        equal(lastArgs[1], 'a=b&c=d');
    });

    test("routes (anything)", 1, function () {
        location.replace('http://example.com#doesnt-match-a-route');
        Router.history.checkUrl();
        equal(holder.anything, 'doesnt-match-a-route');
    });

    test("routes (function)", 3, function () {
        router.on('route', function (args) {
            ok(args.new.params[0] === 'set');
        });
        equal(externalObject.value, 'unset');
        location.replace('http://example.com#function/set');
        Router.history.checkUrl();
        equal(externalObject.value, 'set');
    });

    test("routes (function) new & old event", 5, function () {
        location.replace('http://example.com#path/old?a=2');
        Router.history.checkUrl();
        router.on('route', function (args) {
            strictEqual(args.old.fragment, 'path/old?a=2');
            deepEqual(args.old.params, ['path/old', 'a=2']);
            strictEqual(args.new.fragment, 'function/set');
            deepEqual(args.new.params, ['set', null]);
        });
        location.replace('http://example.com#function/set');
        Router.history.checkUrl();
        deepEqual(externalObject.value, 'set');
    });

    test("routes (function) on off", 3, function () {
        Router.history.stop();
        location.replace('http://example.com/path/123');
        router = new Router({
            routes: {
                'path/:val': {
                    on: function () {
                        ok(true);
                    },
                    off: function() {
                        ok(true);
                    }
                }
            }
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('shop/search', true);
        Router.history.navigate('path/abc', true);
    });

    test("Decode named parameters, not splats.", 2, function () {
        location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
        Router.history.checkUrl();
        strictEqual(holder.named, 'a/b');
        strictEqual(holder.path, 'c/d/e');
    });

    test("leading slash", 2, function () {
        location.replace('http://example.com/root/foo');

        Router.history.stop();
        Router.history.start({root: '/root', hashChange: false, silent: true});
        strictEqual(Router.history.getFragment(), 'foo');

        Router.history.stop();
        Router.history = new Router.History();
        Router.history.location = location;
        Router.history.start({root: '/root/', hashChange: false, silent: true});
        strictEqual(Router.history.getFragment(), 'foo');
    });

    test("Route callback gets passed encoded values.", 3, function () {
        var route = 'has%2Fslash/complex-has%23hash/has%20space';
        Router.history.navigate(route, {trigger: true});
        strictEqual(holder.first, 'has/slash');
        strictEqual(holder.part, 'has#hash');
        strictEqual(holder.rest, 'has space');
    });

    test("correctly handles URLs with % (#868)", 2, function () {
        location.replace('http://example.com#search/fat%3A1.5%25');
        Router.history.checkUrl();
        location.replace('http://example.com#search/fat');
        Router.history.checkUrl();
        equal(holder.query, 'fat');
        equal(holder.page, void 0);
    });

    test("Hashes with UTF8 in them.", 2, function () {
        Router.history.navigate('charñ', {trigger: true});
        equal(holder.charType, 'UTF');
        Router.history.navigate('char%C3%B1', {trigger: true});
        equal(holder.charType, 'UTF');
    });

    test("Use pathname when hashChange is not wanted.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/path/name#hash');
        Router.history.start({hashChange: false});
        var fragment = Router.history.getFragment();
        strictEqual(fragment, location.pathname.replace(/^\//, ''));
    });

    test("Strip leading slash before location.assign.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root/');
        Router.history.start({hashChange: false, root: '/root/'});
        location.assign = function (pathname) {
            strictEqual(pathname, '/root/fragment');
        };
        Router.history.navigate('/fragment');
    });

    test("Root fragment without trailing slash.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root');
        Router.history.start({hashChange: false, root: '/root/', silent: true});
        strictEqual(Router.history.getFragment(), '');
    });

    test("History does not prepend root to fragment.", 2, function () {
        Router.history.stop();
        location.replace('http://example.com/root/');
        Router.history.history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/root/x');
            }
        };
        Router.history.start({
            root: '/root/',
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('x');
        strictEqual(Router.history.fragment, 'x');
    });

    test("Normalize root.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root');
        Router.history.history = {
            pushState: function (state, title, url) {
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

    test("Normalize root.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root#fragment');
        Router.history.history = {
            pushState: function (state, title, url) {
            },
            replaceState: function (state, title, url) {
                strictEqual(url, '/root/fragment');
            }
        };
        Router.history.start({
            pushState: true,
            root: '/root'
        });
    });

    test("Normalize root.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root');
        Router.history.loadUrl = function () {
            ok(true);
        };
        Router.history.start({
            pushState: true,
            root: '/root'
        });
    });

    test("Normalize root - leading slash.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root');
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        Router.history.start({root: 'root'});
        strictEqual(Router.history.root, '/root/');
    });

    test("Transition from hashChange to pushState.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root#x/y');
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function (state, title, url) {
                strictEqual(url, '/root/x/y');
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test("Router: Normalize empty root", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/');
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        Router.history.start({root: ''});
        strictEqual(Router.history.root, '/');
    });

    test("Router: nagivate with empty root", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/');
        Router.history.history = {
            pushState: function (state, title, url) {
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

    test("Transition from pushState to hashChange.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root/x/y?a=b');
        location.replace = function (url) {
            strictEqual(url, '/root/#x/y?a=b');
        };
        Router.history.history = {
            pushState: null,
            replaceState: null
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test("hashChange to pushState with search.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root#x/y?a=b');
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function (state, title, url) {
                strictEqual(url, '/root/x/y?a=b');
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true
        });
    });

    test("Trailing space in fragments.", 1, function () {
        var history = new Router.History();
        strictEqual(history.getFragment('fragment   '), 'fragment');
    });

    test("Leading slash and trailing space.", 1, function () {
        var history = new Router.History();
        strictEqual(history.getFragment('/fragment '), 'fragment');
    });

    test("Optional parameters.", 2, function () {
        location.replace('http://example.com#named/optional/y');
        Router.history.checkUrl();
        strictEqual(holder.z, undefined);
        location.replace('http://example.com#named/optional/y123');
        Router.history.checkUrl();
        strictEqual(holder.z, '123');
    });

    test("Trigger 'route' event on router instance.", 1, function () {
        router.on('route', function (args) {
            deepEqual(args.new.params, ['x', null]);
        });
        location.replace('http://example.com#route-event/x');
        Router.history.checkUrl();
    });

    test("hashChange to pushState only if both requested.", 0, function () {
        Router.history.stop();
        location.replace('http://example.com/root?a=b#x/y');
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function () {
                ok(false);
            }
        };
        Router.history.start({
            root: 'root',
            pushState: true,
            hashChange: false
        });
    });

    test('No hash fallback.', 0, function () {
        Router.history.stop();
        Router.history.history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        new Router({
            routes: {
                hash: {
                    on: function () {
                        ok(false);
                    }
                }
            }
        });
        location.replace('http://example.com/');
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        location.replace('http://example.com/nomatch#hash');
        Router.history.checkUrl();
    });

    test('No trailing slash on root.', 1, function () {
        Router.history.stop();
        Router.history.history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/root');
            }
        };
        location.replace('http://example.com/root/path');
        Router.history.start({pushState: true, hashChange: false, root: 'root'});
        Router.history.navigate('');
    });

    test('No trailing slash on root.', 1, function () {
        Router.history.stop();
        Router.history.history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/');
            }
        };
        location.replace('http://example.com/path');
        Router.history.start({pushState: true, hashChange: false});
        Router.history.navigate('');
    });

    test('No trailing slash on root.', 1, function () {
        Router.history.stop();
        Router.history.history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/root/?x=1');
            }
        };
        location.replace('http://example.com/root/path');
        Router.history.start({pushState: true, hashChange: false, root: 'root'});
        Router.history.navigate('?x=1');
    });

    test('Fragment matching sans query/hash.', 2, function () {
        Router.history.stop();
        Router.history.history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/path?query#hash');
            }
        };
        new Router({
            routes: {
                path: {
                    on: function () {
                        ok(true);
                    }
                }
            }
        });
        location.replace('http://example.com/');
        Router.history.start({pushState: true, hashChange: false});
        Router.history.navigate('path?query#hash', true);
    });

    test('Do not decode the search params.', function () {
        new Router({
            routes: {
                path: {
                    on: function (params) {
                        strictEqual(params, 'x=y%3Fz');
                    }
                }
            }
        });
        Router.history.navigate('path?x=y%3Fz', true);
    });

    test('Navigate to a hash url.', function () {
        Router.history.stop();
        Router.history.start({pushState: true});
        new Router({
            routes: {
                path: {
                    on: function (params) {
                        strictEqual(params, 'x=y');
                    }
                }
            }
        });
        location.replace('http://example.com/path?x=y#hash');
        Router.history.checkUrl();
    });

    test('navigate to a hash url.', function () {
        Router.history.stop();
        Router.history.start({pushState: true});
        new Router({
            routes: {
                path: {
                    on: function (params) {
                        strictEqual(params, 'x=y');
                    }
                }
            }
        });
        Router.history.navigate('path?x=y#hash', true);
    });

    test('unicode pathname', 1, function () {
        location.replace('http://example.com/myyjä');
        Router.history.stop();
        new Router({
            routes: {
                myyjä: {
                    on: function () {
                        ok(true);
                    }
                }
            }
        });
        Router.history.start({pushState: true});
    });

    test('newline in route', 1, function () {
        location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
        Router.history.stop();
        new Router({
            routes: {
                'stuff\nnonsense': {
                    on: function () {
                        ok(true);
                    }
                }
            }
        });
        Router.history.start({pushState: true});
    });

    test("History#navigate decodes before comparison.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/shop/search?keyword=short%20dress');
        Router.history.history = {
            pushState: function () {
                ok(false);
            },
            replaceState: function () {
                ok(false);
            }
        };
        Router.history.start({pushState: true});
        Router.history.navigate('shop/search?keyword=short%20dress', true);
        strictEqual(Router.history.fragment, 'shop/search?keyword=short dress');
    });

    test('Urls in the params', 1, function () {
        Router.history.stop();
        location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        var router = new Router();
        router.route('login', {
            on: function (params) {
                strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
            }
        });
        Router.history.start();
    });

})();
