var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var inpathSync = require('inpath').sync;

var path = process.env['PATH'].split(':');

var openconnectBinary = inpathSync('openconnect', path);

exports = module.exports = {
    available: available,
    connect: connect,
    disconnect: disconnect,
};

var spawnOptions = { stdio: 'inherit' };
if (process.version.indexOf('v0.6.') === 0) {
    spawnOptions = { customFd: [ 0, 1, 2 ] };
}

function available(callback) {
    if (!openconnectBinary) {
        process.nextTick(function () {
            callback(new Error('Could not find vpnc in $PATH'));
        });
    } else {
        exec(openconnectBinary + ' --version', function (err, stdout, stderr) {
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

function connect(config, callback) {
}

function disconnect(callback) {
}
