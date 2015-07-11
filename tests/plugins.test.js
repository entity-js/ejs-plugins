/**
 *  ______   __   __   ______  __   ______  __  __
 * /\  ___\ /\ "-.\ \ /\__  _\/\ \ /\__  _\/\ \_\ \
 * \ \  __\ \ \ \-.  \\/_/\ \/\ \ \\/_/\ \/\ \____ \
 *  \ \_____\\ \_\\"\_\  \ \_\ \ \_\  \ \_\ \/\_____\
 *   \/_____/ \/_/ \/_/   \/_/  \/_/   \/_/  \/_____/
 *                                         __   ______
 *                                        /\ \ /\  ___\
 *                                       _\_\ \\ \___  \
 *                                      /\_____\\/\_____\
 *                                      \/_____/ \/_____/
 */

var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    async = require('async'),
    test = require('unit.js'),
    Plugin = require('../lib/plugin'),
    EUndefinedPlugin = require('../lib/errors/EUndefinedPlugin'),
    EUndefinedPluginType = require('../lib/errors/EUndefinedPluginType'),
    EDisabledPlugin = require('../lib/errors/EDisabledPlugin');

var Plugins,
    tmpPath = path.join(
      os.tmpdir(), 'entityjs-tests--indexer--' + process.pid
    ),
    fname = path.normalize(path.join(__dirname, '..', 'lib', 'plugin'));

describe('ejs/plugins', function () {

  'use strict';

  function genPlugin(done, p, info) {

    var queue = [];

    queue.push(function (next) {
      fs.writeFile(
        path.join(p, 'plugin.json'),
        JSON.stringify(info),
        next
      );
    });

    queue.push(function (next) {
      fs.writeFile(
        path.join(p, 'index.js'),
        '\n' +
        'var util = require(\'util\'),\n' +
        '    Plugin = require(\'' + fname + '\');\n' +
        '\n' +
        'function TestPlugin(plugin, info) {\n' +
        '  \'use strict\';\n' +
        '\n' +
        '  TestPlugin.super_.call(this, plugin, info);\n' +
        '}\n' +
        '\n' +
        'util.inherits(TestPlugin, Plugin);\n' +
        '\n' +
        'module.exports = TestPlugin;\n',
        next
      );
    });

    async.series(queue, done);

  }

  beforeEach(function (done) {

    var queue = [];

    Plugins = require('../lib');

    queue.push(function (next) {
      fs.mkdir(tmpPath, next);
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group1'), next);
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group2'), next);
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group1', 'example1'), next);
    });

    queue.push(function (next) {
      genPlugin(next, path.join(tmpPath, 'group1', 'example1'), {
        title: 'Example 1',
        description: 'Example plugin #1.',
        weight: 0,
        version: '1.1.0'
      });
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group1', 'example2'), next);
    });

    queue.push(function (next) {
      genPlugin(next, path.join(tmpPath, 'group1', 'example2'), {
        title: 'Example 2',
        description: 'Example plugin #2.',
        weight: -5,
        version: '1.1.0'
      });
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group2', 'example3'), next);
    });

    queue.push(function (next) {
      genPlugin(next, path.join(tmpPath, 'group2', 'example3'), {
        title: 'Example 3',
        description: 'Example plugin #3.',
        weight: 5,
        version: '1.0.0'
      });
    });

    queue.push(function (next) {
      fs.mkdir(path.join(tmpPath, 'group2', 'example3', 'sub'), next);
    });

    queue.push(function (next) {
      genPlugin(next, path.join(tmpPath, 'group2', 'example3', 'sub'), {
        title: 'Subexample 3',
        description: 'Sub example plugin #3.',
        weight: 4,
        version: '1.0.0',
        dependencies: {
          'example3': '1.0.0'
        }
      });
    });

    async.series(queue, done);

  });

  afterEach(function (done) {

    delete require.cache[require.resolve('../lib')];

    global._ejsStatic['ejs-plugins'] = {
      _types: {},
      _index: {}
    };

    var queue = [];

    function clearPlg(pth) {
      queue.push(function (next) {
        fs.unlink(path.join(pth, 'plugin.json'), next);
      });

      queue.push(function (next) {
        fs.unlink(path.join(pth, 'index.js'), next);
      });

      queue.push(function (next) {
        fs.rmdir(pth, next);
      });
    }

    clearPlg(path.join(tmpPath, 'group1', 'example1'));
    clearPlg(path.join(tmpPath, 'group1', 'example2'));
    clearPlg(path.join(tmpPath, 'group2', 'example3', 'sub'));
    clearPlg(path.join(tmpPath, 'group2', 'example3'));

    queue.push(function (next) {
      fs.rmdir(path.join(tmpPath, 'group1'), next);
    });

    queue.push(function (next) {
      fs.rmdir(path.join(tmpPath, 'group2'), next);
    });

    queue.push(function (next) {
      fs.rmdir(tmpPath, next);
    });

    async.series(queue, done);

  });

  describe('Plugins.register()', function () {

    it('shouldRegisterPluginType', function () {

      Plugins.register(
        'extension',
        'Extension',
        'An extension plugin type.',
        tmpPath
      );

      test.object(
        global._ejsStatic['ejs-plugins']._types
      ).is({
        extension: {
          title: 'Extension',
          description: 'An extension plugin type.',
          paths: [tmpPath]
        }
      });

    });

  });

  describe('Plugins.registered()', function () {

    it('shouldReturnFalseIfNotDefined', function () {

      test.bool(
        Plugins.registered('extension')
      ).isNotTrue();

    });

    it('shouldReturnTrueIfRegistered', function () {

      Plugins.register(
        'extension',
        'Extension',
        'An extension plugin type.',
        tmpPath
      );

      test.bool(
        Plugins.registered('extension')
      ).isTrue();

    });

  });

  describe('Plugins.types()', function () {

    it('shouldReturnTheStaticObject', function () {

      Plugins.register(
        'extension',
        'Extension',
        'An extension plugin type.',
        tmpPath
      );

      test.object(
        Plugins.types()
      ).is(global._ejsStatic['ejs-plugins']._types);

    });

  });

  describe('Plugins.index()', function () {

    it('shouldntFindAnythingIfNotTypesHaveBeenDefined', function (done) {

      Plugins.index(function (err) {

        test.value(err).isNull();

        test.object(
          global._ejsStatic['ejs-plugins']._index
        ).is({});

        done();

      });

    });

    it('shouldIndexAllRegisteredTypes', function (done) {

      var queue = [];

      Plugins.register(
        'extension',
        'Extension',
        'An extension plugin type.',
        tmpPath
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index
        ).is({
          'extension': {
            'example1': {
              '_instance': null,
              '_name': 'example1',
              '_path': path.join(tmpPath, 'group1', 'example1'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #1.',
              'main': 'index',
              'title': 'Example 1',
              'version': '1.1.0',
              'weight': 0
            },
            'example2': {
              '_instance': null,
              '_name': 'example2',
              '_path': path.join(tmpPath, 'group1', 'example2'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #2.',
              'main': 'index',
              'title': 'Example 2',
              'version': '1.1.0',
              'weight': -5
            },
            'example3': {
              '_instance': null,
              '_name': 'example3',
              '_path': path.join(tmpPath, 'group2', 'example3'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #3.',
              'main': 'index',
              'title': 'Example 3',
              'version': '1.0.0',
              'weight': 5
            },
            'sub': {
              '_instance': null,
              '_name': 'sub',
              '_path': path.join(tmpPath, 'group2', 'example3', 'sub'),
              'author': '',
              'dependencies': {
                'example3': '1.0.0'
              },
              'description': 'Sub example plugin #3.',
              'main': 'index',
              'title': 'Subexample 3',
              'version': '1.0.0',
              'weight': 4
            }
          }
        });

        done();

      });

    });

    it('shouldIndexSpecifiedTypes', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next, 'group1');
      });

      queue.push(function (next) {

        test.object(
          global._ejsStatic['ejs-plugins']._index
        ).is({
          'group1': {
            'example1': {
              '_instance': null,
              '_name': 'example1',
              '_path': path.join(tmpPath, 'group1', 'example1'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #1.',
              'main': 'index',
              'title': 'Example 1',
              'version': '1.1.0',
              'weight': 0
            },
            'example2': {
              '_instance': null,
              '_name': 'example2',
              '_path': path.join(tmpPath, 'group1', 'example2'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #2.',
              'main': 'index',
              'title': 'Example 2',
              'version': '1.1.0',
              'weight': -5
            }
          }
        });

        next();

      });

      queue.push(function (next) {
        Plugins.index(next, 'group2');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index
        ).is({
          'group1': {
            'example1': {
              '_instance': null,
              '_name': 'example1',
              '_path': path.join(tmpPath, 'group1', 'example1'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #1.',
              'main': 'index',
              'title': 'Example 1',
              'version': '1.1.0',
              'weight': 0
            },
            'example2': {
              '_instance': null,
              '_name': 'example2',
              '_path': path.join(tmpPath, 'group1', 'example2'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #2.',
              'main': 'index',
              'title': 'Example 2',
              'version': '1.1.0',
              'weight': -5
            }
          },
          'group2': {
            'example3': {
              '_instance': null,
              '_name': 'example3',
              '_path': path.join(tmpPath, 'group2', 'example3'),
              'author': '',
              'dependencies': {},
              'description': 'Example plugin #3.',
              'main': 'index',
              'title': 'Example 3',
              'version': '1.0.0',
              'weight': 5
            },
            'sub': {
              '_instance': null,
              '_name': 'sub',
              '_path': path.join(tmpPath, 'group2', 'example3', 'sub'),
              'author': '',
              'dependencies': {
                'example3': '1.0.0'
              },
              'description': 'Sub example plugin #3.',
              'main': 'index',
              'title': 'Subexample 3',
              'version': '1.0.0',
              'weight': 4
            }
          }
        });

        done();

      });

    });

  });

  describe('Plugins.plugins()', function () {

    it('shouldReturnAnEmptyObjectIfNotIndexed', function () {

      test.object(
        Plugins.plugins()
      ).is({});

    });

    it('shouldReturnAnEmptyObjectIfTypeNotIndexed', function () {

      test.object(
        Plugins.plugins('extension')
      ).is({});

    });

  });

  describe('Plugins.enable()', function () {

    it('shouldEnablePluginOfSpecifiedTypeAndName', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next, 'group1', ['example1']);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        ).isInstanceOf(Plugin);

        test.value(
          global._ejsStatic['ejs-plugins']._index.group1.example2._instance
        ).isNull();

        test.value(
          global._ejsStatic['ejs-plugins']._index.group2.example3._instance
        ).isNull();

        done();

      });

    });

    it('shouldEnableAllPluginsOfSpecifiedType', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next, 'group1');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        ).isInstanceOf(Plugin);

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example2._instance
        ).isInstanceOf(Plugin);

        test.value(
          global._ejsStatic['ejs-plugins']._index.group2.example3._instance
        ).isNull();

        done();

      });

    });

    it('shouldEnableAllPluginsOfMultipleTypes', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next, ['group1', 'group2']);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        ).isInstanceOf(Plugin);

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example2._instance
        ).isInstanceOf(Plugin);

        test.object(
          global._ejsStatic['ejs-plugins']._index.group2.example3._instance
        ).isInstanceOf(Plugin);

        done();

      });

    });

    it('shouldEnableAllPlugins', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        ).isInstanceOf(Plugin);

        test.object(
          global._ejsStatic['ejs-plugins']._index.group1.example2._instance
        ).isInstanceOf(Plugin);

        test.object(
          global._ejsStatic['ejs-plugins']._index.group2.example3._instance
        ).isInstanceOf(Plugin);

        done();

      });

    });

  });

  describe('Plugins.enabled()', function () {

    it('shouldThrowErrorIfUndefinedType', function () {

      test.exception(function () {
        Plugins.enabled('group1', 'example1');
      }).isInstanceOf(EUndefinedPluginType);

    });

    it('shouldThrowErrorIfUnknownPlugin', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.exception(function () {
          Plugins.enabled('group1', 'example5');
        }).isInstanceOf(EUndefinedPlugin);

        done();

      });

    });

    it('shouldReturnFalseIfNotEnabled', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.bool(
          Plugins.enabled('group1', 'example1')
        ).isNotTrue();

        test.bool(
          Plugins.enabled('group1', 'example2')
        ).isNotTrue();

        test.bool(
          Plugins.enabled('group2', 'example3')
        ).isNotTrue();

        test.bool(
          Plugins.enabled('group2', 'sub')
        ).isNotTrue();

        done();

      });

    });

    it('shouldReturnTrue', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.bool(
          Plugins.enabled('group1', 'example1')
        ).isTrue();

        done();

      });

    });

  });

  describe('Plugins.disable()', function () {

    it('shouldDisablePluginOfSpecifiedTypeAndName', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next, 'group1', ['example1']);
      });

      queue.push(function (next) {
        Plugins.disable(next, 'group1', ['example1']);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.value(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        ).isNull();

        test.value(
          global._ejsStatic['ejs-plugins']._index.group1.example2._instance
        ).isNull();

        test.value(
          global._ejsStatic['ejs-plugins']._index.group2.example3._instance
        ).isNull();

        done();

      });

    });

  });

  describe('Plugins.update()', function () {

    it('shouldThrowErrorIfUndefinedPluginType', function (done) {

      Plugins.update(function (err) {

        test.object(
          err
        ).isInstanceOf(EUndefinedPluginType);

        done();

      }, 'group1', 'example1');

    });

    it('shouldThrowErrorIfUndefinedPlugin', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.update(next, 'group1', 'example10');
      });

      async.series(queue, function (err) {

        test.object(
          err
        ).isInstanceOf(EUndefinedPlugin);

        done();

      });

    });

  });

  describe('Plugins.message()', function () {

    it('shouldntMessageDisabledPlugins', function (done) {

      var recieved = {},
          queue = [],
          mockMessage = function (dne, msg, param1, param2) {
            recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
            dne();
          };

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        for (var type in global._ejsStatic['ejs-plugins']._index) {
          var plugins = global._ejsStatic['ejs-plugins']._index[type];
          for (var plg in plugins) {
            if (!plugins[plg]._instance) {
              continue;
            }

            plugins[plg]._instance._message = mockMessage;
          }
        }

        next();
      });

      queue.push(function (next) {
        Plugins.message(next, 'group1', 'example1', 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({});

        done();

      });

    });

    it('shouldSendMessageToSpecifiedPlugin', function (done) {

      var recieved = {},
          queue = [],
          mockMessage = function (next, msg, param1, param2) {
            recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
            next();
          };

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      queue.push(function (next) {
        for (var type in global._ejsStatic['ejs-plugins']._index) {
          var plugins = global._ejsStatic['ejs-plugins']._index[type];
          for (var plg in plugins) {
            if (!plugins[plg]._instance) {
              continue;
            }

            plugins[plg]._instance._message = mockMessage;
          }
        }

        next();
      });

      queue.push(function (next) {
        Plugins.message(next, 'group1', 'example1', 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'example1': 'hello: foo bar'
        });

        done();

      });

    });

    it('shouldSendMessageToSpecifiedPluginTypes', function (done) {

      var recieved = {},
          queue = [],
          mockMessage = function (next, msg, param1, param2) {
            recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
            next();
          };

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      queue.push(function (next) {
        for (var type in global._ejsStatic['ejs-plugins']._index) {
          var plugins = global._ejsStatic['ejs-plugins']._index[type];
          for (var plg in plugins) {
            if (!plugins[plg]._instance) {
              continue;
            }

            plugins[plg]._instance._message = mockMessage;
          }
        }

        next();
      });

      queue.push(function (next) {
        Plugins.message(next, 'group1', null, 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'example1': 'hello: foo bar',
          'example2': 'hello: foo bar'
        });

        done();

      });

    });

    it('shouldSendMessageToAllPlugins', function (done) {

      var recieved = {},
          queue = [],
          mockMessage = function (next, msg, param1, param2) {
            recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
            next();
          };

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      queue.push(function (next) {
        for (var type in global._ejsStatic['ejs-plugins']._index) {
          var plugins = global._ejsStatic['ejs-plugins']._index[type];
          for (var plg in plugins) {
            if (!plugins[plg]._instance) {
              continue;
            }

            plugins[plg]._instance._message = mockMessage;
          }
        }

        next();
      });

      queue.push(function (next) {
        Plugins.message(next, null, null, 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'example1': 'hello: foo bar',
          'example2': 'hello: foo bar',
          'example3': 'hello: foo bar',
          'sub': 'hello: foo bar'
        });

        done();

      });

    });

  });

  describe('Plugins.plugin()', function () {

    it('shouldThrowErrorIfUndefinedPluginType', function () {

      test.exception(function () {
        Plugins.plugin('group1', 'example1');
      }).isInstanceOf(EUndefinedPluginType);

    });

    it('shouldThrowErrorIfUndefinedPlugin', function (done) {

      var queue = [];

            Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.exception(function () {
          Plugins.plugin('group1', 'example10');
        }).isInstanceOf(EUndefinedPlugin);

        done();

      });

    });

    it('shouldThrowErrorIfPluginNotEnabled', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.exception(function () {
          Plugins.plugin('group1', 'example1');
        }).isInstanceOf(EDisabledPlugin);

        done();

      });

    });

    it('shouldReturnThePluginObject', function (done) {

      var queue = [];

      Plugins.register(
        'group1',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group1')
      );

      Plugins.register(
        'group2',
        'Extension',
        'An extension plugin type.',
        path.join(tmpPath, 'group2')
      );

      queue.push(function (next) {
        Plugins.index(next);
      });

      queue.push(function (next) {
        Plugins.enable(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          Plugins.plugin('group1', 'example1')
        ).isInstanceOf(Plugin).is(
          global._ejsStatic['ejs-plugins']._index.group1.example1._instance
        );

        done();

      });

    });

  });

});
