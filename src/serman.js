#!/usr/bin/env node

require('babel-polyfill');
var Promise = require('bluebird');
var path = require('path');
var path = require('process');
var fs = Promise.promisifyAll(require('fs'));
var fse = Promise.promisifyAll(require('fs-extra'));
var cp = require('child_process');
var execAsync = Promise.promisify(cp.exec, { multiArgs: true });
var hogan = require('hogan.js');
var argv = require('commander');

function exists(p) {
    try {
        fs.accessSync(p);
        return true;
    }
    catch (e) {
        return false;
    }
}

async function run(cmd) {
    var stdout, stderr;
    try {
        console.log("Executing: %s", cmd);
        [stdout, stderr] = await execAsync(cmd);
    } catch (err) {
        throw err;
    } finally {
        console.log("STDOUT:");
        console.log("=======");
        console.log(stdout);

        console.log("STDERR:");
        console.log("=======");
        console.log(stderr);
    }
}

function Provider() {
    var SERVICEDIR = 'c:\\serman\\services'

    this.config = {
        ServiceDir: SERVICEDIR,
        RawWrapper: path.join(__dirname, '../bin', 'winsw.exe')
    };

    if (!exists(this.config.ServiceDir)) {
        console.log("creating folder: %s", this.config.ServiceDir);
        fse.mkdirsSync(this.config.ServiceDir);
    }
}

Provider.prototype.getWrapper = (serviceId) => path.join(this.config.ServiceDir, serviceId + '.xml');

Provider.prototype.deployWrapper = async (serviceId) => {
    var src = this.config.RawWrapper;
    var dest = this.getWrapper(serviceId);
    console.log("Copying %s to %s", src, dest);
    await fse.copyAsync(src, dest);
};

Provider.prototype.deployConfig = async (configFile) => {
    var file = path.parse(path.resolve(configFile));
    var id = file.name;

    var tmpl = await fs.readFileAsync(configFile, 'utf8');
    var compiled = hogan.compile(tmpl);
    var rendered = hogan.render(compiled, { dir: file.dir });
    await fs.writeFileAsync(path.join(this.config.ServiceDir, file.base), rendered, 'utf8');
    return id;
};

Provider.prototype.deploy = async (serviceConfig) => {
    var id = await this.deployConfig(serviceConfig);
    await this.deployWrapper(id);
};

Provider.prototype.install = async (serviceId) => {
    await run(`${this.getWrapper(serviceId)} install`);
};

Provider.prototype.start = async (serviceId) => {
    await run(`${this.getWrapper(serviceId)} start`);
}

var provider = new Provider();

async function logStep(step, f) {
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

async function handleInstall(serviceConfig, {start}) {
    var serviceId = logStep(
        'deploy', 
        async () => await provider.deploy(serviceConfig)); // deploy config, wrapper, etc.

    logStep(
        'install', 
        async () => await provider.install(serviceId)); // install the service

    if (start === true) {
        logStep(
            'start',
            async () => await provider.start(serviceId)); // start the service
    }
}

async function handleUninstall(serviceId) {
    throw "NotImplemented";
}

function resolve(f) {
    return () => {
        var promise = f(...arguments);
        console.log("Resolving function...");
        Promise.resolve(promise);
    };
}

argv.command('install <service-config>')
    .description('install a service')
    .action(resolve(handleInstall));

argv.command('uninstall <service_id>')
    .description('uninstall a service')
    .action(resolve(handleUninstall));

argv.parse(process.argv);
