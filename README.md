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
