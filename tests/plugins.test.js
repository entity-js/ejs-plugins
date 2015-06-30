/**
 *  ______   __   __   ______  __   ______  __  __
 * /\  ___\ /\ "-.\ \ /\__  _\/\ \ /\__  _\/\ \_\ \
 * \ \  __\ \ \ \-.  \\/_/\ \/\ \ \\/_/\ \/\ \____ \
 *  \ \_____\\ \_\\"\_\  \ \_\ \ \_\  \ \_\ \/\_____\
 *   \/_____/ \/_/ \/_/   \/_/  \/_/   \/_/  \/_____/
 *                          ______   __    __   ______
 *                         /\  ___\ /\ "-./  \ /\  ___\
 *                         \ \ \____\ \ \-./\ \\ \___  \
 *                          \ \_____\\ \_\ \ \_\\/\_____\
 *                           \/_____/ \/_/  \/_/ \/_____/
 */

var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    async = require('async'),
    test = require('unit.js');

describe('ejs/plugins', function () {

  'use strict';

  var Plugins = require('../lib'),
      Plugin = require('../lib/plugin'),
      EUndefinedPlugin = require('../lib/errors/EUndefinedPlugin');

  var tmpPath = path.join(
        os.tmpdir(), 'entityjs-tests--indexer--' + process.pid
      ),
      fname = path.normalize(path.join(__dirname, '..', 'lib', 'plugin'));

  function genPlugin(title, description, weight, version) {
    return '\n' +
      'var util = require(\'util\'),\n' +
      '    Plugin = require(\'' + fname + '\');\n' +
      '\n' +
      'function TestPlugin(plugin) {\n' +
      '  \'use strict\';\n' +
      '\n' +
      '  TestPlugin.super_.call(this, plugin, {\n' +
      '    title: \'' + title + '\',\n' +
      '    description: \'' + description + '\',\n' +
      '    weight: ' + weight + ',\n' +
      '    version: \'' + version + '\'\n' +
      '  });\n' +
      '}\n' +
      '\n' +
      'util.inherits(TestPlugin, Plugin);\n' +
      '\n' +
      'module.exports = TestPlugin;\n';
  }

  beforeEach(function () {
    fs.mkdirSync(tmpPath);
    fs.mkdirSync(path.join(tmpPath, 'group1'));
    fs.mkdirSync(path.join(tmpPath, 'group2'));

    fs.mkdirSync(path.join(tmpPath, 'group1', 'example1'));
    fs.writeFileSync(
      path.join(tmpPath, 'group1', 'example1', 'index.js'),
      genPlugin('Example 1', 'Example plugin #1.', 0, '1.0')
    );

    fs.mkdirSync(path.join(tmpPath, 'group1', 'example2'));
    fs.writeFileSync(
      path.join(tmpPath, 'group1', 'example2', 'index.js'),
      genPlugin('Example 2', 'Example plugin #2.', -5, '1.1')
    );

    fs.mkdirSync(path.join(tmpPath, 'group2', 'example3'));
    fs.writeFileSync(
      path.join(tmpPath, 'group2', 'example3', 'index.js'),
      genPlugin('Example 3', 'Example plugin #3.', 5, '1.0')
    );

    fs.mkdirSync(path.join(tmpPath, 'group2', 'example3', 'sub'));
    fs.writeFileSync(
      path.join(tmpPath, 'group2', 'example3', 'sub', 'index.js'),
      genPlugin('Subexample 3', 'Sub example plugin #3.', 4, '1.0')
    );
  });

  afterEach(function () {
    fs.unlinkSync(path.join(tmpPath, 'group1', 'example1', 'index.js'));
    fs.rmdirSync(path.join(tmpPath, 'group1', 'example1'));

    fs.unlinkSync(path.join(tmpPath, 'group1', 'example2', 'index.js'));
    fs.rmdirSync(path.join(tmpPath, 'group1', 'example2'));

    fs.unlinkSync(path.join(
      tmpPath, 'group2', 'example3', 'sub', 'index.js'
    ));
    fs.rmdirSync(path.join(tmpPath, 'group2', 'example3', 'sub'));

    fs.unlinkSync(path.join(tmpPath, 'group2', 'example3', 'index.js'));
    fs.rmdirSync(path.join(tmpPath, 'group2', 'example3'));

    fs.rmdirSync(path.join(tmpPath, 'group1'));
    fs.rmdirSync(path.join(tmpPath, 'group2'));
    fs.rmdirSync(tmpPath);
  });

  describe('Plugins.index()', function () {

    it('indexerIsCalledAndCallsCallbackWithResults', function (done) {

      var plugins = new Plugins(tmpPath);
      plugins.index(function (err) {

        test.value(err).isNull();
        test.object(
          plugins._index
        )
        .hasProperty('group1/example1')
        .hasProperty('group1/example2')
        .hasProperty('group2/example3')
        .hasProperty('group2/example3/sub');

        done();

      });

    });

    it('resultsShouldBeSortedByWeight', function (done) {

      var plugins = new Plugins(tmpPath);
      plugins.index(function (err) {

        test.value(err).isNull();

        var idx = 0;
        for (var plugin in plugins._index) {
          idx++;
          if (idx === 1) {
            test.value(plugin).is('group1/example2');
          }
          else if (idx === 2) {
            test.value(plugin).is('group1/example1');
          }
          else if (idx === 3) {
            test.value(plugin).is('group2/example3/sub');
          }
          else if (idx === 4) {
            test.value(plugin).is('group2/example3');
          }
        }

        test.value(idx).is(4);

        done();

      });

    });

  });

  describe('Plugins.plugins()', function () {

    it('shouldReturnAnEmptyArrayIfNotIndexed', function () {

      var plugins = new Plugins(tmpPath);

      test.array(
        plugins.plugins()
      ).hasLength(0);

    });

    it('shouldReturnIndexedNames', function (done) {

      var plugins = new Plugins(tmpPath),
          queue = [];

      queue.push(function (next) {
        plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        var names = plugins.plugins();

        test.array(names).hasLength(4);
        test.value(names[0]).is('group1/example2');
        test.value(names[1]).is('group1/example1');
        test.value(names[2]).is('group2/example3/sub');
        test.value(names[3]).is('group2/example3');

        done();

      });

    });

  });

  describe('Plugins.initialize()', function () {

    it('shouldInitializeAllThePlugins', function (done) {

      var plugins = new Plugins(tmpPath),
          initd = {},
          queue = [];

      function mockInit(plugin) {
        return function (next) {
          initd[plugin] = true;

          next();
        };
      }

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        for (var plg in plugins._index) {
          plugins._index[plg].initialize = mockInit(plg);
        }

        next();
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(initd).is({
          'group1/example1': true,
          'group1/example2': true,
          'group2/example3': true,
          'group2/example3/sub': true
        });

        done();

      });

    });

    it('shouldEmitEvents', function (done) {

      var plugins = new Plugins(tmpPath),
          initd = {},
          initialized = false,
          queue = [];

      plugins.on('initialize', function (plugin) {
        initd[plugin] = true;
      });

      plugins.on('initialized', function () {
        initialized = true;
      });

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(initd).is({
          'group1/example1': true,
          'group1/example2': true,
          'group2/example3': true,
          'group2/example3/sub': true
        });

        test.bool(initialized).isTrue();

        done();

      });

    });

  });

  describe('Plugins.initialized()', function () {

    it('shouldReturnFalseIfNotInitialized', function (done) {

      var plugins = new Plugins(tmpPath),
          queue = [];

      queue.push(function (next) {
        plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.bool(
          plugins.initialized('group1/example1')
        ).isNotTrue();

        test.bool(
          plugins.initialized('group1/example2')
        ).isNotTrue();

        test.bool(
          plugins.initialized('group2/example3')
        ).isNotTrue();

        test.bool(
          plugins.initialized('group2/example3/sub')
        ).isNotTrue();

        done();

      });

    });

    it('shouldReturnTrueForInitializedPlugins', function (done) {

      var plugins = new Plugins(tmpPath),
          queue = [];

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.bool(
          plugins.initialized('group1/example1')
        ).isTrue();

        test.bool(
          plugins.initialized('group1/example2')
        ).isTrue();

        test.bool(
          plugins.initialized('group2/example3')
        ).isTrue();

        test.bool(
          plugins.initialized('group2/example3/sub')
        ).isTrue();

        done();

      });

    });

  });

  describe('Plugins.message()', function () {

    it('shouldntMessageUninitializedPlugins', function (done) {

      var plugins = new Plugins(tmpPath),
          recieved = {},
          queue = [];

      function mockMessage(next, plugin, msg, param1, param2) {
        recieved[plugin] = msg + ': ' + param1 + ' ' + param2;
        next();
      }

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        for (var plg in plugins._index) {
          plugins._index[plg].message = mockMessage;
        }

        next();
      });

      queue.push(function (next) {
        plugins.message(next, 'group1/example1', 'hello', 'foo', 'bar');
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

      var plugins = new Plugins(tmpPath),
          recieved = {},
          queue = [];

      function mockMessage(next, msg, param1, param2) {
        recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
        next();
      }

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        for (var plg in plugins._index) {
          plugins._index[plg]._message = mockMessage;
        }

        next();
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      queue.push(function (next) {
        plugins.message(next, 'group1/example1', 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'group1/example1': 'hello: foo bar'
        });

        done();

      });

    });

    it('shouldSendMessageToSpecifiedPlugins', function (done) {

      var plugins = new Plugins(tmpPath),
          recieved = {},
          queue = [];

      function mockMessage(next, msg, param1, param2) {
        recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
        next();
      }

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        for (var plg in plugins._index) {
          plugins._index[plg]._message = mockMessage;
        }

        next();
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      queue.push(function (next) {
        plugins.message(next, [
          'group1/example1',
          'group2/example3'
        ], 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'group1/example1': 'hello: foo bar',
          'group2/example3': 'hello: foo bar'
        });

        done();

      });

    });

    it('shouldSendMessageToAllPlugins', function (done) {

      var plugins = new Plugins(tmpPath),
          recieved = {},
          queue = [];

      function mockMessage(next, msg, param1, param2) {
        recieved[this.plugin] = msg + ': ' + param1 + ' ' + param2;
        next();
      }

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        for (var plg in plugins._index) {
          plugins._index[plg]._message = mockMessage;
        }

        next();
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      queue.push(function (next) {
        plugins.message(next, null, 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          recieved
        ).is({
          'group1/example1': 'hello: foo bar',
          'group1/example2': 'hello: foo bar',
          'group2/example3': 'hello: foo bar',
          'group2/example3/sub': 'hello: foo bar'
        });

        done();

      });

    });

    it('shouldEmitEvents', function (done) {

      var plugins = new Plugins(tmpPath),
          msgs = {},
          queue = [];

      plugins.on('message', function (plugin, msg, param1, param2) {
        msgs[plugin] = msg + ': ' + param1 + ' ' + param2;
      });

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      queue.push(function (next) {
        plugins.message(next, null, 'hello', 'foo', 'bar');
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(msgs).is({
          'group1/example1': 'hello: foo bar',
          'group1/example2': 'hello: foo bar',
          'group2/example3': 'hello: foo bar',
          'group2/example3/sub': 'hello: foo bar'
        });

        done();

      });

    });

  });

  describe('Plugins.plugin()', function () {

    it('shouldThrowErrorIfUndefined', function (done) {

      var plugins = new Plugins(tmpPath),
          queue = [];

      queue.push(function (next) {
        plugins.index(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.exception(function () {
          plugins.plugin('test');
        }).isInstanceOf(EUndefinedPlugin);

        done();

      });

    });

    it('shouldReturnThePluginObject', function (done) {

      var plugins = new Plugins(tmpPath),
          queue = [];

      queue.push(function (next) {
        plugins.index(next);
      });

      queue.push(function (next) {
        plugins.initialize(next);
      });

      async.series(queue, function (err) {

        if (err) {
          return done(err);
        }

        test.object(
          plugins.plugin('group1/example1')
        ).isInstanceOf(Plugin).is(plugins._index['group1/example1']);

        done();

      });

    });

  });

});
