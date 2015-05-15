(function () {

    var holder = null;
    var router = null;
    var location = null;
    var lastArgs = [];

    const Router = this.prouter.Router;
    const History = this.prouter.History;

    var beforeRoute = function (router, args) {
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

    module("prouter.Router", {

        setup: function () {

            holder = {count: 0};
            location = new Location('http://example.com');
            Router.history = new History();
            Router.history._location = location;

            router = new Router({
                map: [
                    {
                        route: "search/:query",
                        activate: function (query, page) {
                            holder.query = query;
                            holder.page = page;
                        }
                    },
                    {
                        route: "search/:query/p:page",
                        activate: function (query, page) {
                            holder.query = query;
                            holder.page = page;
                        }
                    },
                    {
                        route: "charñ",
                        activate: function () {
                            holder.charType = 'UTF';
                        }
                    },
                    {
                        route: "char%C3%B1",
                        activate: function () {
                            holder.charType = 'escaped';
                        }
                    },
                    {
                        route: "contacts",
                        activate: function () {
                            holder.contact = 'index';
                        }
                    },
                    {
                        route: "contacts/new",
                        activate: function () {
                            holder.contact = 'new';
                        }
                    },
                    {
                        route: "contacts/:id",
                        activate: function () {
                            holder.contact = 'load';
                        }
                    },
                    {
                        route: "route-event/:arg",
                        activate: function (arg) {
                        }
                    },
                    {
                        route: "optional(/:item)",
                        activate: function (arg) {
                            holder.arg = arg != void 0 ? arg : null;
                        }
                    },
                    {
                        route: "named/optional/(y:z)",
                        activate: function (z) {
                            holder.z = z;
                        }
                    },
                    {
                        route: "splat/*args/end",
                        activate: function (args) {
                            holder.args = args;
                        }
                    },
                    {
                        route: ":repo/compare/*from...*to",
                        activate: function (repo, from, to) {
                            holder.repo = repo;
                            holder.from = from;
                            holder.to = to;
                        }
                    },
                    {
                        route: "decode/:named/*splat",
                        activate: function (named, path) {
                            holder.named = named;
                            holder.path = path;
                        }
                    },
                    {
                        route: "*first/complex-*part/*rest",
                        activate: function (first, part, rest) {
                            holder.first = first;
                            holder.part = part;
                            holder.rest = rest;
                        }
                    },
                    {
                        route: "query/:entity",
                        activate: function (entity, args) {
                            holder.entity = entity;
                            holder.queryArgs = args;
                        }
                    },
                    {
                        route: "function/:value",
                        activate: externalObject.routingFunction
                    },
                    {
                        route: "implicit",
                        activate: function () {
                            holder.count++;
                        }
                    },
                    {
                        route: "*anything",
                        activate: function (whatever) {
                            holder.anything = whatever;
                        }
                    }
                ]
            });

            Router.history.start({pushState: false});
            lastArgs = [];
            Router.history.on('route:before', beforeRoute);
        },

        teardown: function () {
            Router.history.stop();
            Router.history.off('route:before', beforeRoute);
        }

    });

    var externalObject = {
        value: 'unset',
        routingFunction: function (value) {
            this.value = value;
        }
    };

    externalObject.routingFunction = externalObject.routingFunction.bind(externalObject);

    test("routes (simple)", 3, function () {
        location.replace('http://example.com#search/news');
        Router.history._checkUrl();
        equal(holder.query, 'news');
        equal(holder.page, void 0);
        equal(lastArgs[0], 'news');
    });

    test("routes (simple, but unicode)", 3, function () {
        location.replace('http://example.com#search/тест');
        Router.history._checkUrl();
        equal(holder.query, "тест");
        equal(holder.page, void 0);
        equal(lastArgs[0], "тест");
    });

    test("routes (two part)", 2, function () {
        location.replace('http://example.com#search/nyc/p10');
        Router.history._checkUrl();
        equal(holder.query, 'nyc');
        equal(holder.page, '10');
    });

    test("routes no changes", 6, function () {
        Router.history.stop();
        Router.history = new History();
        Router.history._location = location;
        router = new Router({
            map: [
                {
                    route: 'login',
                    activate: function (queryString, evt) {
                        ok(true);
                    }
                }
            ]
        });
        var navigated = Router.history.navigate('login');
        notOk(navigated);
        Router.history.start();
        location.replace('http://example.com#login');
        var checked = Router.history._checkUrl();
        ok(checked);
        checked = Router.history._checkUrl();
        notOk(checked);
        throws(
            Router.history.start,
            Error,
            "throws error if already started"
        );
        location.replace('http://example.com#not-mapped');
        var loaded = Router.history._loadUrl();
        notOk(loaded);
    });

    test("routes via navigate", 2, function () {
        Router.history.navigate('search/manhattan/p20');
        equal(holder.query, 'manhattan');
        equal(holder.page, '20');
    });

    test("routes via navigate with params", 1, function () {
        Router.history.navigate('query/test?a=b');
        equal(holder.queryArgs, 'a=b');
    });

    test("routes via navigate for backwards-compatibility", 2, function () {
        Router.history.navigate('search/manhattan/p20');
        equal(holder.query, 'manhattan');
        equal(holder.page, '20');
    });

    test("reports matched route via nagivate", 1, function () {
        ok(Router.history.navigate('search/manhattan/p20'));
    });

    test("route precedence via navigate", 2, function () {
        // check both 0.9.x and backwards-compatibility options
        Router.history.navigate('contacts');
        equal(holder.contact, 'index');
        Router.history.navigate('contacts/new');
        equal(holder.contact, 'new');
    });

    test("loadUrl is not called for identical routes.", 0, function () {
        Router.history._loadUrl = function () {
            ok(false);
        };
        location.replace('http://example.com#route');
        Router.history.navigate('route', null, {trigger: false});
        Router.history.navigate('route', null, {trigger: false});
    });

    test("event parameter.", 6, function () {
        Router.history.stop();
        router = new Router({
            map: [
                {
                    route: 'items/:id',
                    activate: function (id, queryString, evt) {
                        strictEqual(id, 'a12b');
                        strictEqual(queryString, 'param1=val1&param2=val2');
                        strictEqual(evt.new.fragment, 'items/a12b?param1=val1&param2=val2');
                        strictEqual(evt.new.params[0], id);
                        strictEqual(evt.new.params[1], queryString);
                        strictEqual(evt.new.message, 'Item saved');
                    }
                }
            ]
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('items/a12b?param1=val1&param2=val2', 'Item saved');
    });

    test("silent parameter.", 0, function () {
        Router.history.stop();
        location.replace('http://example.com/#items/123');
        router = new Router({
            map: [
                {
                    route: 'items/:id',
                    activate: function () {
                        ok(false);
                    }
                }
            ]
        });
        Router.history.start({
            silent: true
        });
    });

    test("query string.", 4, function () {
        Router.history.stop();
        router = new Router({
            map: [
                {
                    route: 'login',
                    activate: function (queryString, evt) {
                        strictEqual(queryString, 'param1=val1&param2=val2');
                        strictEqual(evt.new.fragment, 'login?param1=val1&param2=val2');
                        strictEqual(evt.new.params[0], queryString);
                        deepEqual(evt.new.message, {msg: 'Password changed', type: 'success'});
                    }
                }
            ]
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('login?param1=val1&param2=val2', {msg: 'Password changed', type: 'success'});
    });

    test("use implicit callback if none provided", 1, function () {
        router.count = 0;
        router.navigate('implicit');
        equal(holder.count, 1);
    });

    test("routes via navigate with {replace: true}", 1, function () {
        location.replace('http://example.com#start_here');
        Router.history._checkUrl();
        location.replace = function (href) {
            strictEqual(href, new Location('http://example.com#end_here').href);
        };
        Router.history.navigate('end_here', null, {replace: true});
    });

    test("routes (splats)", 1, function () {
        location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
        Router.history._checkUrl();
        equal(holder.args, 'long-list/of/splatted_99args');
    });

    test("routes (github)", 3, function () {
        location.replace('http://example.com#Router/compare/1.0...braddunbar:with/slash');
        Router.history._checkUrl();
        equal(holder.repo, 'Router');
        equal(holder.from, '1.0');
        equal(holder.to, 'braddunbar:with/slash');
    });

    test("routes (optional)", 2, function () {
        location.replace('http://example.com#optional');
        Router.history._checkUrl();
        ok(!holder.arg);
        location.replace('http://example.com#optional/thing');
        Router.history._checkUrl();
        equal(holder.arg, 'thing');
    });

    test("routes (complex)", 3, function () {
        location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
        Router.history._checkUrl();
        equal(holder.first, 'one/two/three');
        equal(holder.part, 'part');
        equal(holder.rest, 'four/five/six/seven');
    });

    test("routes (query)", 4, function () {
        location.replace('http://example.com#query/mandel?a=b&c=d');
        Router.history._checkUrl();
        equal(holder.entity, 'mandel');
        equal(holder.queryArgs, 'a=b&c=d');
        equal(lastArgs[0], 'mandel');
        equal(lastArgs[1], 'a=b&c=d');
    });

    test("routes (anything)", 1, function () {
        location.replace('http://example.com#doesnt-match-a-route');
        Router.history._checkUrl();
        equal(holder.anything, 'doesnt-match-a-route');
    });

    test("routes (function)", 3, function () {
        router.on('route:after', function (args) {
            ok(args.new.params[0] === 'set');
        });
        equal(externalObject.value, 'unset');
        location.replace('http://example.com#function/set');
        Router.history._checkUrl();
        equal(externalObject.value, 'set');
    });

    test("routes (function) new & old event", 5, function () {
        location.replace('http://example.com#path/old?a=2');
        Router.history._checkUrl();
        router.on('route:after', function (args) {
            strictEqual(args.old.fragment, 'path/old?a=2');
            deepEqual(args.old.params, ['path/old', 'a=2']);
            strictEqual(args.new.fragment, 'function/set');
            deepEqual(args.new.params, ['set', undefined]);
        });
        location.replace('http://example.com#function/set');
        Router.history._checkUrl();
        deepEqual(externalObject.value, 'set');
    });

    test("routes cancel navigation", 1, function () {
        router.on('route:before', function (evt) {
            ok(true);
            evt.canceled = true;
        });
        router.on('route:after', function (evt) {
            ok(false);
        });
        router.navigate('path');
    });

    test("routes (function) on off", 2, function () {
        Router.history.stop();
        location.replace('http://example.com/path/123');
        router = new Router({
            map: [
                {
                    route: 'path/:val',
                    activate: function () {
                        ok(true);
                    },
                    deactivate: function () {
                        ok(true);
                    }
                },
                {
                    route: 'other',
                    activate: function() {

                    }
                }
            ]
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('other');
    });

    test("Decode named parameters, not splats.", 2, function () {
        location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
        Router.history._checkUrl();
        strictEqual(holder.named, 'a/b');
        strictEqual(holder.path, 'c/d/e');
    });

    test("leading slash", 2, function () {
        location.replace('http://example.com/root/foo');

        Router.history.stop();
        Router.history.start({root: '/root', hashChange: false, silent: true});
        strictEqual(Router.history.getFragment(), 'foo');

        Router.history.stop();
        Router.history = new History();
        Router.history._location = location;
        Router.history.start({root: '/root/', hashChange: false, silent: true});
        strictEqual(Router.history.getFragment(), 'foo');
    });

    test("Route callback gets passed encoded values.", 3, function () {
        var route = 'has%2Fslash/complex-has%23hash/has%20space';
        Router.history.navigate(route);
        strictEqual(holder.first, 'has/slash');
        strictEqual(holder.part, 'has#hash');
        strictEqual(holder.rest, 'has space');
    });

    test("correctly handles URLs with % (#868)", 2, function () {
        location.replace('http://example.com#search/fat%3A1.5%25');
        Router.history._checkUrl();
        location.replace('http://example.com#search/fat');
        Router.history._checkUrl();
        equal(holder.query, 'fat');
        equal(holder.page, void 0);
    });

    test("Hashes with UTF8 in them.", 2, function () {
        Router.history.navigate('charñ');
        equal(holder.charType, 'UTF');
        Router.history.navigate('char%C3%B1');
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

    test("History does not prepend root to fragment.", 3, function () {
        Router.history.stop();
        location.replace('http://example.com/root/');
        Router.history._history = {
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
        strictEqual(Router.history._fragment, 'x');
        strictEqual(Router.history.getFragment(), '');
    });

    test("Normalize root.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root');
        Router.history._history = {
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
        Router.history._history = {
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
        Router.history._loadUrl = function () {
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
        Router.history._history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        Router.history.start({root: 'root'});
        strictEqual(Router.history._root, '/root/');
    });

    test("Transition from hashChange to pushState.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/root#x/y');
        Router.history._history = {
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
        Router.history._history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        Router.history.start({root: ''});
        strictEqual(Router.history._root, '/');
    });

    test("Router: nagivate with empty root", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/');
        Router.history._history = {
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
        Router.history._history = {
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
        Router.history._history = {
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
        var history = new History();
        strictEqual(history.getFragment('fragment   '), 'fragment');
    });

    test("Leading slash and trailing space.", 1, function () {
        var history = new History();
        strictEqual(history.getFragment('/fragment '), 'fragment');
    });

    test("Optional parameters.", 2, function () {
        location.replace('http://example.com#named/optional/y');
        Router.history._checkUrl();
        strictEqual(holder.z, undefined);
        location.replace('http://example.com#named/optional/y123');
        Router.history._checkUrl();
        strictEqual(holder.z, '123');
    });

    test("Trigger 'route' event on router instance.", 1, function () {
        router.on('route:before', function (args) {
            deepEqual(args.new.params, ['x', undefined]);
        });
        location.replace('http://example.com#route-event/x');
        Router.history._checkUrl();
    });

    test("hashChange to pushState only if both requested.", 0, function () {
        Router.history.stop();
        location.replace('http://example.com/root?a=b#x/y');
        Router.history._history = {
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
        Router.history._history = {
            pushState: function () {
            },
            replaceState: function () {
            }
        };
        new Router({
            map: [
                {
                    route: "hash",
                    activate: function () {
                        ok(false);
                    }
                }
            ]
        });
        location.replace('http://example.com/');
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        location.replace('http://example.com/nomatch#hash');
        Router.history._checkUrl();
    });

    test('No trailing slash on root.', 1, function () {
        Router.history.stop();
        Router.history._history = {
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
        Router.history._history = {
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
        Router.history._history = {
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
        Router.history._history = {
            pushState: function (state, title, url) {
                strictEqual(url, '/path?query#hash');
            }
        };
        new Router({
                map: [
                    {
                        route: "path",
                        activate: function () {
                            ok(true);
                        }
                    }
                ]
            }
        );
        location.replace('http://example.com/');
        Router.history.start({pushState: true, hashChange: false});
        Router.history.navigate('path?query#hash');
    });

    test('Do not decode the search params.', function () {
        new Router({
                map: [
                    {
                        route: "path",
                        activate: function (params) {
                            strictEqual(params, 'x=y%3Fz');
                        }
                    }
                ]
            }
        );
        Router.history.navigate('path?x=y%3Fz');
    });

    test('Navigate to a hash url.', function () {
        Router.history.stop();
        Router.history.start({pushState: true});
        new Router({
                map: [
                    {
                        route: "path",
                        activate: function (params) {
                            strictEqual(params, 'x=y');
                        }
                    }
                ]
            }
        );
        location.replace('http://example.com/path?x=y#hash');
        Router.history._checkUrl();
    });

    test('navigate to a hash url.', function () {
        Router.history.stop();
        Router.history.start({pushState: true});
        new Router({
                map: [
                    {
                        route: "path",
                        activate: function (params) {
                            strictEqual(params, 'x=y');
                        }
                    }]
            }
        );
        Router.history.navigate('path?x=y#hash');
    });

    test('unicode pathname', 1, function () {
        location.replace('http://example.com/myyjä');
        Router.history.stop();
        new Router({
                map: [
                    {
                        route: "myyjä",
                        activate: function () {
                            ok(true);
                        }
                    }
                ]
            }
        );
        Router.history.start({pushState: true});
    });

    test('newline in route', 1, function () {
        location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
        Router.history.stop();
        new Router({
                map: [
                    {
                        route: 'stuff\nnonsense',
                        activate: function () {
                            ok(true);
                        }
                    }
                ]
            }
        );
        Router.history.start({pushState: true});
    });

    test('preserve context (this)', 2, function () {
        Router.history.stop();
        const someVal = Math.random();
        router = new Router({
                map: [
                    {
                        route: 'one',
                        someAttr: someVal,
                        activate: function () {
                            strictEqual(this.someAttr, someVal);
                        },
                        deactivate: function () {
                            strictEqual(this.someAttr, someVal);
                        }
                    },
                    {
                        route: 'two',
                        activate: function() {

                        }
                    }
                ]
            }
        );
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('one');
        Router.history.navigate('two');
    });

    test("History#navigate decodes before comparison.", 1, function () {
        Router.history.stop();
        location.replace('http://example.com/shop/search?keyword=short%20dress');
        Router.history._history = {
            pushState: function () {
                ok(false);
            },
            replaceState: function () {
                ok(false);
            }
        };
        Router.history.start({pushState: true});
        Router.history.navigate('shop/search?keyword=short%20dress');
        strictEqual(Router.history.getFragment(), 'shop/search?keyword=short dress');
    });

    test('Urls in the params', 1, function () {
        Router.history.stop();
        location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        var router = new Router();
        router.addHandler({
            route: 'login',
            activate: function (params) {
                strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
            }
        });
        Router.history.start();
    });

})();
