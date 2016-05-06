var gulp = require('gulp');
var pkg = require('./package.json');
var fs = require('fs');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var less = require('gulp-less');
var templateCache = require('gulp-angular-templatecache');
var yaml = require("yamljs");
var del = require('del');
var path = require('path');
var spawn = require('child_process').spawn;

require.extensions['.yml'] = function (module, filename) {
    module.exports = yaml.parse(fs.readFileSync(filename, 'utf8'));
};

var geosite_config = require("./src/geosite/config.yml");
var geosite_plugins = [];
var geosite_enumerations = []; // Exported to the compile process
var geosite_filters = []; // Exported to the compile process
var geosite_templates = [];  // Exported to the compile process
var geosite_directives = []; // Exported to the compile process
var geosite_controllers = []; // Exported to the compile process
//
for(var i = 0; i < geosite_config["plugins"].length; i++)
{
  var geosite_plugin = require("./src/geosite/plugins/"+geosite_config["plugins"][i]+"/config.yml");
  geosite_plugin["id"] = geosite_config["plugins"][i];
  geosite_plugins.push(geosite_plugin);
}
for(var i = 0; i < geosite_plugins.length; i++)
{
    var geosite_plugin = geosite_plugins[i];
    if(geosite_plugin["enumerations"] != undefined)
    {
      for(var j = 0; j < geosite_plugin["enumerations"].length; j++)
      {
        var geosite_enumeration = geosite_plugin["enumerations"][j];
        geosite_enumerations.push("./src/geosite/plugins/"+geosite_plugin["id"]+"/enumerations/"+geosite_enumeration);
      }
    }
    if(geosite_plugin["filters"] != undefined)
    {
      for(var j = 0; j < geosite_plugin["filters"].length; j++)
      {
        var geosite_filter = geosite_plugin["filters"][j];
        geosite_filters.push("./src/geosite/plugins/"+geosite_plugin["id"]+"/filters/"+geosite_filter);
      }
    }
    for(var j = 0; j < geosite_plugin["controllers"].length; j++)
    {
      var geosite_controller = geosite_plugin["controllers"][j];
      geosite_controllers.push("./src/geosite/plugins/"+geosite_plugin["id"]+"/controllers/"+geosite_controller);
    }
    for(var j = 0; j < geosite_plugin["directives"].length; j++)
    {
      var geosite_directive = geosite_plugin["directives"][j];
      geosite_directives.push("./src/geosite/plugins/"+geosite_plugin["id"]+"/directives/"+geosite_directive);
    }
    for(var j = 0; j < geosite_plugin["templates"].length; j++)
    {
      var geosite_template = geosite_plugin["templates"][j];
      geosite_templates.push("./src/geosite/plugins/"+geosite_plugin["id"]+"/templates/"+geosite_template);
    }
}

var compile_templates = ["./src/templates/*.html"];
compile_templates = compile_templates.concat(geosite_templates);

var compile_js = ["./src/js/main/*.js", "./build/templates/templates.js"];
compile_js = compile_js.concat(geosite_enumerations);
compile_js = compile_js.concat(geosite_filters);
compile_js = compile_js.concat(geosite_directives);
compile_js = compile_js.concat(geosite_controllers);

var compilelist =
[
    {
        "name": "templates",
        "type": "template",
        "src": compile_templates,
        "dest":"./build/templates/"
    },
    {
        "name": "main_js",
        "type": "js",
        "src": compile_js,
        "outfile":"main.js",
        "dest":"./build/js/"
    },
    {
        "name": "main_less",
        "type": "less",
        "src": "./src/less/main/*.less",
        "outfile":"main.css",
        "dest":"./build/css/"
    },
    {
        "name": "monkeypatch_js",
        "type": "js",
        "src": "./src/js/monkeypatch/*.js",
        "outfile":"monkeypatch.js",
        "dest":"./build/js/"
    },
    {
        "name": "polyfill_js",
        "type": "js",
        "src": "./src/js/polyfill/*.js",
        "outfile":"polyfill.js",
        "dest":"./build/js/"
    }
];

var copylist =
[
];

gulp.task('compile', function(){
    for(var i = 0; i < compilelist.length; i++)
    {
        var t = compilelist[i];
        process.stdout.write(t.name);
        process.stdout.write("\n");
        if(t.type=="js")
        {
            gulp.src(t.src, {base: './'})
                .pipe(concat(t.outfile))
                .pipe(gulp.dest(t.dest))
                .pipe(uglify())
                .pipe(rename({ extname: '.min.js'}))
                .pipe(gulp.dest(t.dest));
        }
        else if(t.type=="css")
        {
            gulp.src(t.src)
                .pipe(concat(t.outfile))
                .pipe(gulp.dest(t.dest));
        }
        else if(t.type=="less")
        {
            gulp.src(t.src)
                .pipe(less())
                .pipe(concat(t.outfile))
                .pipe(gulp.dest(t.dest));
        }
        else if(t.type=="template"||t.type=="templates")
        {
            gulp.src(t.src)
                .pipe(templateCache('templates.js', {
                  templateHeader: 'geosite.templates = {};\n',
                  templateBody: 'geosite.templates["<%= url %>"] = "<%= contents %>";',
                  templateFooter: '\n'
                }))
                .pipe(gulp.dest(t.dest));
        }
    }
});

gulp.task('copy', function(){
    for(var i = 0; i < copylist.length; i++)
    {
        var t = copylist[i];
        gulp.src(t.src).pipe(gulp.dest(t.dest));
    }
});

gulp.task('clean', function () {
  return del([
    './temp/**/*',
    './build/js/**/*',
    './build/css/**/*'
  ]);
});

gulp.task('test', function(){
    var scripts =
    [
        "./src/js/main/*.js",
        "./src/js/polyfill/*.js"
    ];
    for(var i = 0; i < scripts.length; i++)
    {
        gulp.src(scripts[i])
            .pipe(jshint()).
            pipe(jshint.reporter('default'));
    }
});

gulp.task('default', ['clean', 'copy','compile']);


gulp.task('bootstrap:clean', function() {
    return del([
        './temp/**/*',
        './build/bootstrap/**/*'
    ]);
});
gulp.task('bootstrap:prepareLess', ['bootstrap:clean'], function() {
    var base = "./lib/bootstrap/3.3.5/less/";
    return gulp.src([base+'/**', '!'+base+'/{variables.less}'])
        .pipe(gulp.dest('./temp'));
});
gulp.task('bootstrap:prepareVariables', ['bootstrap:prepareLess'], function() {
    return gulp.src('./src/less/bootstrap/variables.less')
        .pipe(gulp.dest('./temp'));
});
gulp.task('bootstrap:compile', ['bootstrap:prepareVariables'], function() {
    return gulp.src('./temp/bootstrap.less')
        .pipe(less())
        .pipe(gulp.dest('./build/bootstrap'));
});
