"use strict";

var con = require('yacon');
var execFile = require('child_process').execFile;
var inpathSync = require('inpath').sync;
var kext = require('kext');
var spawn = require('child_process').spawn;
var sudo = require('sudo');

var path = process.env['PATH'].split(':');

var openconnectBinary = inpathSync('openconnect', path);

exports = module.exports = {
    available: available,
    connect: connect,
    disconnect: disconnect,
};

function available(callback) {
    function run(err, loaded) {
        if (err) {
            return callback(err);
        }
        if (!loaded) {
            callback(new Error('Tunnel module not loadable'));
        }

        execFile(openconnectBinary, ['--version'], function (err, stdout, stderr) {
            if (err) {
                callback(err);
            } else {
                var v = (stdout + stderr).match(/(OpenConnect version v[0-9.]+)/);
                if (v) {
                    callback(null, { openConnect: openconnectBinary, version: v[1] });
                } else {
                    callback(new Error('Could not parse OpenConnect version string'));
                }
            }
        });
    }

    if (!openconnectBinary) {
        process.nextTick(function () {
            callback(new Error('Could not find vpnc in $PATH'));
        });
    } else {
        if (process.platform === 'darwin')
            kext.ensure(['foo.tun', 'net.tunnelblick.tun', 'com.viscosityvpn.Viscosity.tun'], '/Library/Extensions/tun.kext', run);
        else
            run(null, true);
    }
}

var child;
function connect(config, extraOptions, callback) {
    var args = ['openconnect', '--non-inter', '--passwd-on-stdin'];

    for (var key in config) {
        if (Object.prototype.hasOwnProperty.call(config, key)) {
            if (key === 'password') {
                continue;
            } else if (key === 'server') {
                args.push(config[key]);
            } else if (config[key] === 'yes') {
                args.push('--' + key);
            } else {
                args.push('--' + key + '=' + config[key]);
            }
        }
    }

    con.debug('sudo', args);
    child = sudo(args);
    child.on('started', function () {
        con.debug('started');

        child.stdout.on('data', function (data) {
            data.toString().split('\n').forEach(function logStdout(line) { con.debug(line); });
            if (data.toString().match(/Established DTLS connection/)) {
                callback(null, 0);
            };
        });

        child.stderr.on('data', function (data) {
            data.toString().split('\n').forEach(function logStderr(line) { con.debug(line); });
            if (data.toString().match(/Login failed/)) {
                console.warn(args.join(' '));
                console.warn('openconnect: Login failed');
                callback(/* error= */ null, /* exit code = */ 1);
            }
        });

        child.stdin.write(config.password + '\n');
    });

    return child;
}

function disconnect(callback) {
    con.debug('sudo -s kill ' + child.pid);
    sudo(['-s', 'kill', '' + child.pid], { cachePassword: true }).on('exit', function (code) {
        callback(null, code);
    });
}

