# EntityJS - Utilities

## Plugins

Provides a simple plugin framework.

### Usage

```javascript
var Plugins = require('ejs-plugins');
var plugins = new Plugins(['/path/to/plugins']);

plugins.index(function (err) {

  plugins.initialize(done);

});
```
