var fs = require('graceful-fs')
var path = require('path')
var existsSync = fs.existsSync || path.existsSync

var mkdirp = require('mkdirp')
var osenv = require('osenv')
var rimraf = require('rimraf')
var test = require('tap').test

var common = require('../common-tap.js')

var monorepoDir = path.resolve(__dirname, 'circular-dep-local-monorepo')
var dep1Dir = path.join(monorepoDir, 'dep1')
var dep2Dir = path.join(monorepoDir, 'dep2')

var EXEC_OPTS = {
  cwd: dep1Dir,
  npm_config_cache: path.join(monorepoDir, 'cache')
}

var dep1Pkg = {
  name: 'dep1',
  version: '1.0.0',
  dependencies: {
    dep2: 'file:../dep2'
  }
}

var dep2Pkg = {
  name: 'dep2',
  version: '1.0.0',
  dependencies: {
    dep1: 'file:../dep1'
  }
}

test('setup', function (t) {
  t.comment('test for circular dep local monorepo')
  setup(function () {
    t.end()
  })
})

test('installing a package that depends on the current package', function (t) {
  var cp
  var timeout = setTimeout(function () {
    t.error('Install timed out.')
    if (cp) {
      cp.kill()
    }
  }, 5000)
  cp = common.npm(
    [
      '--registry', common.registry,
      '--loglevel', 'silent',
      'install'
    ],
    EXEC_OPTS,
    function (err, code, stdout, stderr) {
      t.ifError(err, 'npm ran without issue')
      t.notOk(code, 'npm ran without raising an error code')
      t.notOk(stderr, 'no error output')

      t.ok(existsSync(path.resolve(
        dep1Dir,
        'node_modules', 'dep2'
      )), 'dep2 in place')
      t.ok(existsSync(path.resolve(
        dep1Dir,
        'node_modules', 'dep1'
      )), 'dep1 in place')
      clearTimeout(timeout)
      t.end()
    }
  )
})

test('cleanup', function (t) {
  cleanup()
  t.end()
})

function setup (cb) {
  cleanup()
  mkdirp.sync(dep1Dir)
  fs.writeFileSync(
    path.join(dep1Dir, 'package.json'),
    JSON.stringify(dep1Pkg, null, 2)
  )
  mkdirp.sync(dep2Dir)
  fs.writeFileSync(
    path.join(dep2Dir, 'package.json'),
    JSON.stringify(dep2Pkg, null, 2)
  )
  cb()
}

function cleanup () {
  process.chdir(osenv.tmpdir())
  rimraf.sync(monorepoDir)
}
