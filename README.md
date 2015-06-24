# angular-app-template

This project is generated with [yo angular generator](https://github.com/yeoman/generator-angular)
version 0.11.1.

## Build & development

Run `mvn clean install` for deb build,  `grunt` for build and `grunt serve` for preview.

## Local configuration and testing

You may need to set up your local environment for grunt, bower and compass to get `grunt serve` to work - from your application root, run the following as needed:

Run `npm install grunt -g` to make the local application aware of your grunt installation.ß
Run `npm update` to ensure grunt dependencies are up to date.

Run `bower install` to catch all build dependencies.

Run `gem update --system` to ensure all Ruby gems are up to date.
Run `gem install compass` to install the Compass SASS compiler.

## Testing

Running `grunt test` will run the unit tests with karma.

## App Structure

The template application is based on a 'Folder per Feature' formula. Each significant component within the application should have it's own folder within the 'components' section. This folder should contain a html template, javascript file (containing it's module definition, controller, config and any feature specific factories or services), and the feature's Karma unit test (via Jasmine. File name should be appended with .spec.js). 

Any modules, services, directives, filters etc should be included within the /shared directory. Here they will be picked up automatically by the compiler. 

## Additional Configuration


In order to obtain api-endpoint information within the local environment and avoid CORS errors when accessing SNOWOWL endpoints a configuration similar to the following (very basic) should be used: 

```
user 'details here';
worker_processes  1;
 
events {
    worker_connections  1024;
}
 
http {
	include    mime.types;
	server {
		listen		80;
		server_name	localhost;
 
		location / {
			proxy_pass http://127.0.0.1:9000;
		}
        location /config {
			alias /Users/chrisswires/angular-app-template;
		}
 
		location /snowowl {
			proxy_pass https://dev-term.ihtsdotools.org/snowowl;
			proxy_set_header Authorization "Basic c25vd293bDpzbm93b3ds";
		}
	}
}
```