Services Manager (serman)
====

Install
----

    npm install -g serman


serman is a Window services manager. It helps to quickly and correctly turn any
app or script into a Window service. The usage pattern is described as below.

1. The developer writes his/her app (`app.js`) that's meant to be deployed as a
   service. Along with the app, the developer writes a simple manifest
   file (`app.xml`) to describe the service.
2. The developer uploads the application to the machine using whatever
   preferable way it is.
3. The developer run `serman install app.xml` to install and start the service.
4. The developer run `serman uninstall app` to uninstall the service.


### Benefits

Usually, it takes a lot of effort or boilerplate to write a service. With
`serman`, all it takes in extra is a simple manifest file. And the developer can
focus on the app itself.

A sample manifest file looks like this:

    <service>
      <id>hello</id>
      <name>hello</name>
      <description>This service runs hello continuous integration system.</description>
      <env name="NODE_ENV" value="production"/>
      <executable>node</executable>
      <arguments>"{{dir}}\hello.js"</arguments>
      <logmode>rotate</logmode>
    </service>


`serman` wraps [winsw][1]. And the manifest file is used by `winsw` and
documented [here][2] in detail. The only additional feature that `serman` adds
is that the manifest file is actually a [Mustache][3] template. Upon installing
a service, `serman` attempts to fill every double curly brace field (`{{XXX}}`)
with a corresponding substitution.

Currently, the supported fields are:

#### `dir`

The absolute path of the directory containing the manifest file **before**
calling `serman install`.

_Details: This is different than `winsw`'s `%BASE`. `%BASE%` is always
dynamically evaluated by `winsw`. If it's used to specify the app path, it
**only** works with the manifest and app are co-located. However, for ease of
management, `serman` groups all manifest files under a common top level
directory, while the actual location of each app can scatter around the file
system. In this case, you would want to use `{{dir}}` rather than `%BASE%`._


[1]: https://github.com/kohsuke/winsw
[2]: https://github.com/kohsuke/winsw#configuration-file-syntax
[3]: https://en.wikipedia.org/wiki/Mustache_(template_system)
