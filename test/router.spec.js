(function () {

    var router = null;
    var location = null;
    var lastRoute = null;
    var lastArgs = [];

    const Router = this.easyRouter;

    var onRoute = function (router, route, args) {
        lastRoute = route;
        lastArgs = args;
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

            location = new Location('http://example.com');
            Router.history = new Router.History();
            Router.history.location = location;

            router = new Router({

                testing: 101,
                count: 0,

                routes: {
                    "noCallback": "noCallback",
                    "counter": "counter",
                    "search/:query": "search",
                    "search/:query/p:page": "search",
                    "charñ": "charUTF",
                    "char%C3%B1": "charEscaped",
                    "contacts": "contacts",
                    "contacts/new": "newContact",
                    "contacts/:id": "loadContact",
                    "route-event/:arg": "routeEvent",
                    "optional(/:item)": "optionalItem",
                    "named/optional/(y:z)": "namedOptional",
                    "splat/*args/end": "splat",
                    ":repo/compare/*from...*to": "github",
                    "decode/:named/*splat": "decode",
                    "*first/complex-*part/*rest": "complex",
                    "query/:entity": "query",
                    "function/:value": externalObject.routingFunction,
                    "*anything": "anything"
                },

                initialize: function (options) {
                    this.testing = options.testing;
                    this.route('implicit', 'implicit');
                },

                counter: function () {
                    this.count++;
                },

                implicit: function () {
                    this.count++;
                },

                search: function (query, page) {
                    this.query = query;
                    this.page = page;
                },

                charUTF: function () {
                    this.charType = 'UTF';
                },

                charEscaped: function () {
                    this.charType = 'escaped';
                },

                contacts: function () {
                    this.contact = 'index';
                },

                newContact: function () {
                    this.contact = 'new';
                },

                loadContact: function () {
                    this.contact = 'load';
                },

                optionalItem: function (arg) {
                    this.arg = arg != void 0 ? arg : null;
                },

                splat: function (args) {
                    this.args = args;
                },

                github: function (repo, from, to) {
                    this.repo = repo;
                    this.from = from;
                    this.to = to;
                },

                complex: function (first, part, rest) {
                    this.first = first;
                    this.part = part;
                    this.rest = rest;
                },

                query: function (entity, args) {
                    this.entity = entity;
                    this.queryArgs = args;
                },

                anything: function (whatever) {
                    this.anything = whatever;
                },

                namedOptional: function (z) {
                    this.z = z;
                },

                decode: function (named, path) {
                    this.named = named;
                    this.path = path;
                },

                routeEvent: function (arg) {
                }

            });

            Router.history.start({pushState: false});
            lastRoute = null;
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
        equal(router.testing, 101);
    });

    test("routes (simple)", 4, function () {
        location.replace('http://example.com#search/news');
        Router.history.checkUrl();
        equal(router.query, 'news');
        equal(router.page, void 0);
        equal(lastRoute, 'search');
        equal(lastArgs[0], 'news');
    });

    test("routes (simple, but unicode)", 4, function () {
        location.replace('http://example.com#search/тест');
        Router.history.checkUrl();
        equal(router.query, "тест");
        equal(router.page, void 0);
        equal(lastRoute, 'search');
        equal(lastArgs[0], "тест");
    });

    test("routes (two part)", 2, function () {
        location.replace('http://example.com#search/nyc/p10');
        Router.history.checkUrl();
        equal(router.query, 'nyc');
        equal(router.page, '10');
    });

    test("routes via navigate", 2, function () {
        Router.history.navigate('search/manhattan/p20', {trigger: true});
        equal(router.query, 'manhattan');
        equal(router.page, '20');
    });

    test("routes via navigate with params", 1, function () {
        Router.history.navigate('query/test?a=b', {trigger: true});
        equal(router.queryArgs, 'a=b');
    });

    test("routes via navigate for backwards-compatibility", 2, function () {
        Router.history.navigate('search/manhattan/p20', true);
        equal(router.query, 'manhattan');
        equal(router.page, '20');
    });

    test("reports matched route via nagivate", 1, function () {
        ok(Router.history.navigate('search/manhattan/p20', true));
    });

    test("route precedence via navigate", 6, function () {
        // check both 0.9.x and backwards-compatibility options
        [{trigger: true}, true].forEach(function (options) {
            Router.history.navigate('contacts', options);
            equal(router.contact, 'index');
            Router.history.navigate('contacts/new', options);
            equal(router.contact, 'new');
            Router.history.navigate('contacts/foo', options);
            equal(router.contact, 'load');
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
    });

    test("use implicit callback if none provided", 1, function () {
        router.count = 0;
        router.navigate('implicit', {trigger: true});
        equal(router.count, 1);
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
        equal(router.args, 'long-list/of/splatted_99args');
    });

    test("routes (github)", 3, function () {
        location.replace('http://example.com#Router/compare/1.0...braddunbar:with/slash');
        Router.history.checkUrl();
        equal(router.repo, 'Router');
        equal(router.from, '1.0');
        equal(router.to, 'braddunbar:with/slash');
    });

    test("routes (optional)", 2, function () {
        location.replace('http://example.com#optional');
        Router.history.checkUrl();
        ok(!router.arg);
        location.replace('http://example.com#optional/thing');
        Router.history.checkUrl();
        equal(router.arg, 'thing');
    });

    test("routes (complex)", 3, function () {
        location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
        Router.history.checkUrl();
        equal(router.first, 'one/two/three');
        equal(router.part, 'part');
        equal(router.rest, 'four/five/six/seven');
    });

    test("routes (query)", 5, function () {
        location.replace('http://example.com#query/mandel?a=b&c=d');
        Router.history.checkUrl();
        equal(router.entity, 'mandel');
        equal(router.queryArgs, 'a=b&c=d');
        equal(lastRoute, 'query');
        equal(lastArgs[0], 'mandel');
        equal(lastArgs[1], 'a=b&c=d');
    });

    test("routes (anything)", 1, function () {
        location.replace('http://example.com#doesnt-match-a-route');
        Router.history.checkUrl();
        equal(router.anything, 'doesnt-match-a-route');
    });

    test("routes (function)", 3, function () {
        router.on('route', function (name) {
            ok(name === '');
        });
        equal(externalObject.value, 'unset');
        location.replace('http://example.com#function/set');
        Router.history.checkUrl();
        equal(externalObject.value, 'set');
    });

    test("Decode named parameters, not splats.", 2, function () {
        location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
        Router.history.checkUrl();
        strictEqual(router.named, 'a/b');
        strictEqual(router.path, 'c/d/e');
    });

    test("fires event when router doesn't have callback on it", 1, function () {
        router.on("route:noCallback", function () {
            ok(true);
        });
        location.replace('http://example.com#noCallback');
        Router.history.checkUrl();
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
        strictEqual(router.first, 'has/slash');
        strictEqual(router.part, 'has#hash');
        strictEqual(router.rest, 'has space');
    });

    test("correctly handles URLs with % (#868)", 3, function () {
        location.replace('http://example.com#search/fat%3A1.5%25');
        Router.history.checkUrl();
        location.replace('http://example.com#search/fat');
        Router.history.checkUrl();
        equal(router.query, 'fat');
        equal(router.page, void 0);
        equal(lastRoute, 'search');
    });

    test("Hashes with UTF8 in them.", 2, function () {
        Router.history.navigate('charñ', {trigger: true});
        equal(router.charType, 'UTF');
        Router.history.navigate('char%C3%B1', {trigger: true});
        equal(router.charType, 'UTF');
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
        strictEqual(router.z, undefined);
        location.replace('http://example.com#named/optional/y123');
        Router.history.checkUrl();
        strictEqual(router.z, '123');
    });

    test("Trigger 'route' event on router instance.", 2, function () {
        router.on('route', function (name, args) {
            strictEqual(name, 'routeEvent');
            deepEqual(args, ['x', null]);
        });
        location.replace('http://example.com#route-event/x');
        Router.history.checkUrl();
    });

    test("Extend routes by making routes a function.", 1, function () {
        var router = new Router({
            routes: {
                home: "root",
                index: "index.html",
                show: "show",
                search: "search"
            }
        });
        deepEqual({home: "root", index: "index.html", show: "show", search: "search"}, router.opts.routes);
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
                hash: function () {
                    ok(false);
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
                path: function () {
                    ok(true);
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
                path: function (params) {
                    strictEqual(params, 'x=y%3Fz');
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
                path: function (params) {
                    strictEqual(params, 'x=y');
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
                path: function (params) {
                    strictEqual(params, 'x=y');
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
                myyjä: function () {
                    ok(true);
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
                'stuff\nnonsense': function () {
                    ok(true);
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
        router.route('login', function (params) {
            strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        });
        Router.history.start();
    });

})();
