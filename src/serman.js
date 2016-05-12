#!/usr/bin/env node

require('babel-polyfill');
var Promise = require('bluebird');
var path = require('path');
var cp = require('process');
var fs = Promise.promisifyAll(require('fs'));
var fse = Promise.promisifyAll(require('fs-extra'));
var cp = require('child_process');
var execAsync = Promise.promisify(cp.exec, { multiArgs: true });
var hogan = require('hogan.js');
var argv = require('commander');
var _ = require('lodash');

argv.command('install <service-config>')
    .description('install a service: serman install app.xml key1=val1,key2=val2,..')
    .option('--values <values>', 'extra values')
    .action(resolve(handleInstallAsync));

argv.command('uninstall <service_id>')
    .description('uninstall a service')
    .action(resolve(handleUninstallAsync));

function resolve(f) {
    function wrapper() {
        Promise.resolve(f(...arguments)).done();
    }

    return wrapper;
}

function exists(p) {
    try {
        fs.accessSync(p);
        return true;
    }
    catch (e) {
        return false;
    }
}

async function runAsync(cmd) {
    var stdout, stderr;
    try {
        console.log("Executing: %s", cmd);
        [stdout, stderr] = await execAsync(cmd);
    } catch (err) {
        throw err;
    } finally {
        console.log(stdout);
        console.log(stderr);
    }
}

class Provider {
    constructor(kvp) {
        var SERVICEDIR = 'c:\\serman\\services'

        this.config = {
            ServiceDir: SERVICEDIR,
            RawWrapper: path.join(__dirname, '../bin', 'winsw.exe')
        };

        this.kvp = kvp || {};

        if (!exists(this.config.ServiceDir)) {
            console.log("creating folder: %s", this.config.ServiceDir);
            fse.mkdirsSync(this.config.ServiceDir);
        }
    }

    getConfig = (serviceId) => path.join(this.config.ServiceDir, serviceId, serviceId + '.xml');
    getWrapper = (serviceId) => path.join(this.config.ServiceDir, serviceId, serviceId + '.exe');

    deployWrapperAsync = async (serviceId) => {
        var src = this.config.RawWrapper;
        var dest = this.getWrapper(serviceId);
        var dir = path.parse(dest).dir;
        if (!exists(dir)) {
            console.log("Creating folder: %s", dir);
            fse.mkdirsSync(dir);
        }

        console.log("Copying %s to %s", src, dest);
        await fse.copyAsync(src, dest);
    };

    deployConfigAsync = async (configFile) => {
        var file = path.parse(path.resolve(configFile));
        var id = file.name;

        var tmpl = await fs.readFileAsync(configFile, 'utf8');
        var compiled = hogan.compile(tmpl);
        var context = _.merge({ dir: file.dir }, this.kvp);
        console.log("Rendering configuration with %s", JSON.stringify(context));
        var rendered = compiled.render(context);

        var dir = path.parse(this.getConfig(id)).dir;
        if (!exists(dir)) {
            console.log("Creating folder: %s", dir);
            fse.mkdirsSync(dir);
        }

        await fs.writeFileAsync(this.getConfig(id), rendered, 'utf8');
        return id;
    };

    deployAsync = async (serviceConfig) => {
        var id = await this.deployConfigAsync(serviceConfig);
        await this.deployWrapperAsync(id);
        return id;
    };

    installAsync = async (serviceId) => {
        await runAsync(`${this.getWrapper(serviceId)} install`);
    };

    startAsync = async (serviceId) => {
        await runAsync(`${this.getWrapper(serviceId)} start`);
    }

    stopAsync = async (serviceId) => {
        await runAsync(`${this.getWrapper(serviceId)} stop`);
    }

    uninstallAsync = async (serviceId) => {
        await runAsync(`${this.getWrapper(serviceId)} uninstall`);
    }
}

async function logStepAsync(step, f) {
    console.log("Step started: " + step);
    try {
        var res = await f();
    } catch (err) {
        console.log("Step failed: " + step);
        throw err;
    }

    console.log("Step finished: " + step);
    return res;
}

async function handleInstallAsync(serviceConfig, options) {
    console.log("Install service using config: %s", serviceConfig);

    var parse = (kv) => {
        var i = kv.indexOf('=');
        return [kv.substring(0, i), kv.substring(i+1)];
    };

    var keyValuePairs = options.values.split(',');
    var provider = new Provider(_.chain(keyValuePairs).map(parse).fromPairs().value());

    var serviceId = await logStepAsync('deploy', async () => await provider.deployAsync(serviceConfig)); // deploy config, wrapper, etc.
    await logStepAsync('install', async () => await provider.installAsync(serviceId)); // install the service
    await logStepAsync('start', async () => await provider.startAsync(serviceId)); // start the service
}

async function handleUninstallAsync(serviceId) {
    console.log("Uninstall service: %s", serviceId);
    var provider = new Provider();
    await logStepAsync('stop', async () => await provider.stopAsync(serviceId));
    await logStepAsync('uninstall', async () => await provider.uninstallAsync(serviceId));

    console.log("Uninstallation completed.");
}

argv.parse(process.argv);
