// Generated on 2015-06-10 using generator-angular 0.11.1
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  var os = require('os');
  os.tmpDir = os.tmpdir;

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || 'app',
    dist: 'dist'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    yeoman: appConfig,

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json']
      },
      js: {
        files: ['<%= yeoman.app %>/components/{,*/}*.js', '<%= yeoman.app %>/shared/{,*/}*.js', '<%= yeoman.app %>/components/**/{,*/}*.js'],
        tasks: ['newer:jshint:all'],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      jsTest: {
        files: ['<%= yeoman.app %>/components/{,*/}*.spec.js', '<%= yeoman.app %>/components/**/{,*/}*.spec.js'],
        tasks: ['karma']
      },
      compass: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['compass:server', 'autoprefixer']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= yeoman.app %>app.js',
          '<%= yeoman.app %>index.html',
          '<%= yeoman.app %>/**/{,*/}*.html',
          '<%= yeoman.app %>/{,*/}*.html',
          '<%= yeoman.app %>/shared/partials/{,*/}*.html',
          '.tmp/styles/{,*/}*.css',
          '.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/shared/taxonomy/taxonomy.css',
          '<%= yeoman.app %>/shared/search/search.css',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // The actual grunt server settings
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect().use(
                '/node_modules',
                connect.static('./node_modules')
              ),
              connect().use(
                '/app/styles',
                connect.static('./app/styles')
              ),
              connect.static(appConfig.app)
            ];
          }
        }
      },
      dist: {
        options: {
          open: true,
          base: '<%= yeoman.dist %>'
        }
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: 'test/.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= yeoman.app %>/components/{,*/}*.js',
          '<%= yeoman.app %>/shared/{,*/}*.js',
          '!<%= yeoman.app %>/**/**/*.spec.js',
          '!<%= yeoman.app %>/vendors/**/*.js',
          '<%= yeoman.app %>/components/**/{,*/}*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
//        src: ['<%= yeoman.app %>/components/{,*/}*spec.js',
//          '<%= yeoman.app %>/components/**/{,*/}*.spec.js']
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/{,*/}*',
            '!<%= yeoman.dist %>/.git{,*/}*'
          ]
        }]
      },
      server: '.tmp'
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      server: {
        options: {
          map: true,
        },
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    // Compiles Sass to CSS and generates necessary files if requested
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>/styles',
        cssDir: '.tmp/styles',
        generatedImagesDir: '.tmp/images/generated',
        imagesDir: '<%= yeoman.app %>/images',
        javascriptsDir: '<%= yeoman.app %>/components',
        fontsDir: '<%= yeoman.app %>/fonts',
        importPath: './node_modules',
        httpImagesPath: '/images',
        httpGeneratedImagesPath: '/images/generated',
        httpFontsPath: '/fonts',
        relativeAssets: false,
        assetCacheBuster: false,
        raw: 'Sass::Script::Number.precision = 10\n'
      },
      dist: {
        options: {
          generatedImagesDir: '<%= yeoman.dist %>/images/generated'
        }
      },
      server: {
        options: {
          sourcemap: true
        }
      }
    },

    // Renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '<%= yeoman.dist %>/components/{,*/}*.js',
          '<%= yeoman.dist %>/components/**/{,*/}*.js',
            '<%= yeoman.dist %>/shared/{,*/}*.js',

          '<%= yeoman.dist %>fonts/*'
        ]
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html','<%= yeoman.dist %>/components/{,*/}*.html', '<%= yeoman.app %>/shared/partials/{,*/}*.html', '<%= yeoman.dist %>/components/**/{,*/}*.html', '<%= yeoman.dist %>/shared/**/{,*/}*.html', 'layout/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
      options: {
        assetsDirs: [
          '<%= yeoman.dist %>',
          '<%= yeoman.dist %>/images',
          '<%= yeoman.dist %>/styles'
        ]
      }
    },

     cssmin: {
       dist: {
         files: {
           '<%= yeoman.dist %>/styles/main.css': [
             '.tmp/styles/{,*/}*.css'
           ]
         }
       }
     },
     concat: {
       options: {
           sourceMap : true
       }
     },

    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg,gif}',
          dest: 'dist/images'
        }]
      }
    },

    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: false,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: ['*.html', 'components/**/{,*/}*.html', 'shared/**/{,*/}*.html', 'shared/partials/{,*/}*.html', 'shared/partials/**/{,*/}*.html', 'components/{,*/}*.html','utilities/{,*/}*.html', 'layout/{,*/}*.html'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },

    // ng-annotate tries to make the code safe for minification automatically
    // by using the Angular long form for dependency injection.
    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/scripts',
          src: '*.js',
          dest: '.tmp/concat/scripts'
        }]
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            '*.html',
            'components/{,*/}*.html',
            'components/**/{,*/}*.html',
            'shared/**/{,*/}*.html',
            'utilities/{,*/}*.html',
            'layout/{,*/}*.html',
            'images/{,*/}*.{png,jpg,jpeg,gif}',
            'fonts/{,*/}*.*',
            'validationConfig/validationConfig.json'
          ]
        }, {
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          dest: '<%= yeoman.dist %>/images',
          src: ['generated/*']
        }, {
          expand: true,
          cwd: '.',
          src: 'node_modules/bootstrap-sass-official/assets/fonts/bootstrap/*',
          dest: '<%= yeoman.dist %>'
        }, {
          expand: true,
          cwd: '.',
          src: 'node_modules/snomed-ecl-builder/output/*',
          dest: '<%= yeoman.dist %>'
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= yeoman.app %>/styles',
        dest: '.tmp/styles/',
        src: '{,*/}*.css'
      }
    },
      
    cacheBust: {
      taskName: {
        options: {
            baseDir: 'dist/',
            assets: ['**/**'],
            queryString: true
        },
        files: [{
                expand: true,
                cwd: 'dist/',
                src: [['**/*.html', '**/**/*.html','styles/*.css', '**/*.js', '**/**/*.js']]
        }]
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        'compass:server'
      ],
      test: [
        'compass'
      ],
      dist: [
        'compass:dist'
      ]
    }
  });


  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'concurrent:server',
      'autoprefixer:server',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('server', 'DEPRECATED TASK. Use the "serve" task instead', function (target) {
    grunt.task.run(['serve:' + target]);
  });
  
  grunt.registerTask('build', [
    'clean:dist',
    'useminPrepare',
    'concurrent:dist',
    'autoprefixer',
    'concat',
    'ngAnnotate',
    'copy:dist',
    'cssmin',
    'filerev',
    'usemin',
    'htmlmin',
    'cacheBust'
  ]);
  
  grunt.registerTask('test', [
  ]);

  grunt.registerTask('default', [
    'newer:jshint',
    'build'
  ]);
};
