# [10.0.0](https://github.com/rogerpadilla/prouter/compare/9.1.2...10.0.0) (2019-05-25)

### Features
* Now the `request` instance is shared between middlewares (similar to express), so it is now possible augment it and to pass custom parameters from a middleware to the next ones (use `req.params.customParamX = 123`).

### BREAKING CHANGES
* Removed property `originalUrl` from `request` object, so only the `path` property is available. It was redundant to have both properties, so it is better to unify it in a single one (simplification).
