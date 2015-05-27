(function () {

    var holder = null;
    var router = null;
    var location = null;
    var lastArgs = [];

    const Router = this.prouter.Router;
    const History = this.prouter.History;

    var beforeRoute = function (router, newRouteData) {
        lastArgs = newRouteData.params;
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
                        activate: function (newRouteData) {
                            holder.query = newRouteData.params.query;
                            holder.page = newRouteData.params.page;
                        }
                    },
                    {
                        route: "search/:query/p:page",
                        activate: function (newRouteData) {
                            holder.query = newRouteData.params.query;
                            holder.page = newRouteData.params.page;
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
                        activate: function (newRouteData) {
                        }
                    },
                    {
                        route: "optional/:item?",
                        activate: function (newRouteData) {
                            holder.arg = newRouteData.params.arg != void 0 ? newRouteData.params.arg : null;
                        }
                    },
                    {
                        route: "query/:entity",
                        activate: function (newRouteData) {
                            holder.entity = newRouteData.params.entity;
                            holder.queryArgs = newRouteData.query;
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
                        route: ":path",
                        activate: function (navigationData) {
                            holder = navigationData;
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
        equal(lastArgs.query, 'news');
    });

    test("routes (simple, but unicode)", 3, function () {
        location.replace('http://example.com#search/тест');
        Router.history._checkUrl();
        equal(holder.query, "тест");
        equal(holder.page, void 0);
        equal(lastArgs.query, "тест");
    });

    test("routes (two part)", 2, function () {
        location.replace('http://example.com#search/nyc/p10');
        Router.history._checkUrl();
        equal(holder.query, 'nyc');
        equal(holder.page, '10');
    });

    test("routes refresh", 7, function () {
        Router.history.stop();
        Router.history = new History();
        Router.history._location = location;
        router = new Router({
            map: [
                {
                    route: 'login',
                    activate: function (newRouteData) {
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
        ok(checked);
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

    test("event parameter.", 4, function () {
        Router.history.stop();
        var message = {type: 'success', msg: 'Item saved'};
        router = new Router({
            map: [
                {
                    route: 'items/:id',
                    activate: function (newRouteData) {
                        equal(newRouteData.path, 'items/a12b');
                        equal(newRouteData.params.id, 'a12b');
                        equal(newRouteData.query, 'param1=val1&param2=val2');
                        strictEqual(newRouteData.message, message);
                    }
                }
            ]
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('items/a12b?param1=val1&param2=val2', message);
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

    test("query string.", 3, function () {
        Router.history.stop();
        const message = {msg: 'Password changed', type: 'success'};
        router = new Router({
            map: [
                {
                    route: 'login',
                    activate: function (newRouteData) {
                        strictEqual(newRouteData.query, 'param1=val1&param2=val2');
                        strictEqual(newRouteData.path, 'login');
                        deepEqual(newRouteData.message, message);
                    }
                }
            ]
        });
        Router.history.start({
            pushState: true,
            hashChange: false
        });
        Router.history.navigate('login?param1=val1&param2=val2', message);
    });

    test("use implicit callback if none provided", 1, function () {
        router.count = 0;
        Router.history.navigate('implicit');
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

    test("routes cancel navigation", 1, function () {
        router.on('route:before', function (evt) {
            ok(true);
            return false;
        });
        router.on('route:after', function (evt) {
            ok(false);
        });
        Router.history.navigate('path');
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

    test("leading slash", 2, function () {
        location.replace('http://example.com/root/foo');

        Router.history.stop();
        Router.history.start({root: '/root', hashChange: false, silent: true});
        strictEqual(Router.history.obtainFragment().full, 'foo');

        Router.history.stop();
        Router.history = new History();
        Router.history._location = location;
        Router.history.start({root: '/root/', hashChange: false, silent: true});
        strictEqual(Router.history.obtainFragment().full, 'foo');
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
        var fragment = Router.history.obtainFragment().full;
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
        strictEqual(Router.history.obtainFragment().full, '');
    });

    test("History does not prepend root to fragment.", 2, function () {
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
        strictEqual(Router.history.obtainFragment().full, '');
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
        strictEqual(history.obtainFragment('fragment   ').full, 'fragment');
    });

    test("Leading slash and trailing space.", 1, function () {
        var history = new History();
        strictEqual(history.obtainFragment('/fragment ').full, 'fragment');
    });

    test("Optional parameters.", 1, function () {
        location.replace('http://example.com#named/optional/y');
        Router.history._checkUrl();
        strictEqual(holder.z, undefined);
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
                strictEqual(url, '/root?x=1');
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
                        activate: function (navigationData) {
                            strictEqual(navigationData.query, 'x=y%3Fz');
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
                        activate: function (navigationData) {
                            strictEqual(navigationData.query, 'x=y');
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
                        activate: function (navigationData) {
                            strictEqual(navigationData.query, 'x=y');
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

    test("History#navigate decodes before comparison.", 2, function () {
        Router.history.stop();
        location.replace('http://example.com/shop/search?keyword=short%20dress');
        Router.history._history = {
            pushState: function () {
                ok(true);
            },
            replaceState: function () {
                ok(false);
            }
        };
        Router.history.start({pushState: true});
        Router.history.navigate('shop/search?keyword=short%20dress');
        strictEqual(Router.history.obtainFragment().full, 'shop/search?keyword=short dress');
    });

    test('Urls in the params', 1, function () {
        Router.history.stop();
        location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
        var router = new Router();
        router.addHandler({
            route: 'login',
            activate: function (newRouteData) {
                strictEqual(newRouteData.query, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
            }
        });
        Router.history.start();
    });

})();
