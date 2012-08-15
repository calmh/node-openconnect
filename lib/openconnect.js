"use strict";

var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var inpathSync = require('inpath').sync;
var sudo = require('sudo');

var path = process.env['PATH'].split(':');

var openconnectBinary = inpathSync('openconnect', path);

exports = module.exports = {
    available: available,
    connect: connect,
    disconnect: disconnect,
};

function available(callback) {
    if (!openconnectBinary) {
        process.nextTick(function () {
            callback(new Error('Could not find vpnc in $PATH'));
        });
    } else {
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
}

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
    
    var cp = sudo(args);
    cp.stderr.on('data', function (data) {
        console.warn(data.toString());
        if (data.toString().match(/Login failed/)) {
            console.warn(args.join(' '));
            console.warn('openconnect: Login failed');
            callback(/* error= */ null, /* exit code = */ 1);
        }
    });
    cp.stdin.write(config.password + '\n');

    return cp;
}

function disconnect(cp, callback) {
    sudo(['-s', 'kill', '' + cp.pid], { cachePassword: true }).on('exit', callback);
}

