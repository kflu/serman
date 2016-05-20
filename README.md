Services Manager (serman)
====

Install
----

    npm install -g serman


Usage
----

    Usage: serman [options] [command]

    Commands:

      install [options] <service-config>  install a service: serman install app.xml key1=val1,key2=val2,..
      uninstall <service_id>              uninstall a service
      init <serviceId>                    initiate a service config file in the current directory

    Options:

      -h, --help  output usage information


serman is a language agnostic Windows services manager. It helps to quickly and correctly turn any
app or script into a Window service. The usage pattern is described as below.

1. The developer writes his/her app (`app.js`) that's meant to be deployed as a
   service. Along with the app, the developer writes a simple manifest
   file (`app.xml`) by running `serman init app` to describe the service.
2. The developer uploads the application to the machine using whatever
   preferable way it is.
3. The developer runs `serman install app.xml` to install and start the service.
4. The developer runs `serman uninstall app` to uninstall the service.


### Benefits

Usually, it takes a lot of effort or boilerplate to write a service. With
`serman`, all it takes in addition to the app itself is a simple manifest file,
allowing the developer to better focus on the app.

An example manifest file looks like this ([document][2]):

    <service>
      <id>hello</id>
      <name>hello</name>
      <description>This service runs hello continuous integration system.</description>
      <env name="NODE_ENV" value="production"/>
      <executable>node</executable>
      <arguments>"{{dir}}\hello.js"</arguments>
      <logmode>rotate</logmode>
	  <persistent_env name="FOO_SERVICE_PORT" value="8989" />
    </service>


`serman` wraps [winsw][1]. And the manifest file is used by `winsw` and
documented [here][2] in detail. The additional features that `serman` adds
are described below.

### Variable Substitutions In Service Configuration

The manifest file is actually a [Mustache][3] template. Upon installing a
service, `serman` attempts to fill every double curly brace field (`{{XXX}}`)
with a corresponding substitution.

Currently, the supported fields are:

#### `dir`

The absolute path of the directory containing the manifest file **before**
calling `serman install`.

_Details: This is different than `winsw`'s `%BASE%`. `%BASE%` is always
dynamically evaluated by `winsw`. If it's used to specify the app path, it
**only** works when the manifest and app are co-located. However, for ease of
management (by human), `serman` groups all manifest files under a common top
level directory (by default `c:\serman\services\`), while the actual locations
of each app are scattered around the file system. In this case, you would want
to use `{{dir}}` rather than `%BASE%`._


#### Additional substitutions

A powerful feature is that `serman install` allows you to pass in additional substitutions
as an argument. This is suitable for cases you want to pass secret API key as environment variable
to your app, but don't want to directly put that in the manifest.

For example, specify `{{API_KEY}}` in the manifest:

    <!-- manifest file -->
    <service>
      <id>hello</id>
      <name>hello</name>
      <description>This service runs hello continuous integration system.</description>
      <env name="API_KEY" value="{{API_KEY}}"/>
      <env name="NODE_ENV" value="{{NODE_ENV}}"/>
      <executable>node</executable>
      <arguments>"{{dir}}\hello.js"</arguments>
      <logmode>rotate</logmode>
    </service>


When installing the service, run:

    serman install app.xml --values API_KEY=1234_abcd,NODE_ENV=development


The installed manifest file would have:

    <!-- manifest file -->
    <service>
      <id>hello</id>
      <name>hello</name>
      <description>This service runs hello continuous integration system.</description>
      <env name="API_KEY" value="1234_abcd"/>
      <env name="NODE_ENV" value="development"/>
      <executable>node</executable>
      <arguments>"c:\path\to\app\hello.js"</arguments>
      <logmode>rotate</logmode>
    </service>


### Persistent Environment Variables

`<persistent_env name="FOO" value="BAR">` can be used to add `FOO=BAR` as a
machine-wide persistent environment variable. This is great for service
discoverability where an installed service can make itself discoverable to
other apps by looking at the global environment variables.

Environment variable persisting is done after the variable substitutions, so that you can use
`{{}}` in `<persistent_env>`.


[1]: https://github.com/kohsuke/winsw
[2]: https://github.com/kohsuke/winsw#configuration-file-syntax
[3]: https://en.wikipedia.org/wiki/Mustache_(template_system)
