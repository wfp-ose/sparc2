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

var collect_files = function(basePath, plugin, sType)
{
  var arr = [];
  if(plugin[sType] != undefined)
  {
    var prefix = path.join(basePath, plugin["id"]);
    for(var i = 0; i < plugin[sType].length; i++)
    {
      arr.push(path.join(prefix, sType, plugin[sType][i]));
    }
  }
  return arr;
};
var collect_files_all = function(basePath, plugin, aType)
{
  var files = {};
  for(var i = 0; i < aType.length; i++)
  {
    files[aType[i]] = collect_files(basePath, plugin, aType[i]);
  }
  return files;
};

var load_config = function(configPath)
{
  var children = [];

  var configObject = require(configPath);
  if("project" in configObject["dependencies"]["production"])
  {
    var projects = configObject["dependencies"]["production"]["project"];
    for (var i = 0; i < projects.length; i++)
    {
      var project = projects[i];
      children.push(load_config(project));
    }
  }

  return {
    'path': configPath,
    "children": children
  };
};
var flatten_configs = function(n)
{
  var configs = [];
  var config = require(n.path);
  config["path"]["base"] = path.dirname(n.path);
  configs.push(config);

  for(var i = 0; i < n.children.length; i++)
  {
    configs = flatten_configs(n.children[i]).concat(configs);
  }
  return configs;
};

var configs = flatten_configs(load_config("./config.yml"));

var geosite_projects = [];
var geosite_plugins = [];

var compile_templates = [];
var compile_enumerations = [];
var compile_filters = [];
var compile_directives = [];
var compile_controllers = [];
var compile_js = [];
var test_js = [];
var compilelist = [];

for(var i = 0; i < configs.length; i++)
{
  var config = configs[i];

  var path_plugins = path.join(config.path.base, config.path.geosite, "plugins")

  var project_templates = [];  // Exported to the compile process
  var project_enumerations = []; // Exported to the compile process
  var project_filters = []; // Exported to the compile process
  var project_directives = []; // Exported to the compile process
  var project_controllers = []; // Exported to the compile process

  for(var j = 0; j < config["plugins"].length; j++)
  {
    var pluginPath = path.join(path_plugins, config["plugins"][j], "config.yml");

    var geosite_plugin = require(pluginPath[0] == "/" ? pluginPath : ("./"+ pluginPath));
    geosite_plugin["id"] = config["plugins"][j];

    var files = collect_files_all(path_plugins, geosite_plugin,
      ["enumerations", "filters", "controllers", "directives", "templates"]);

    project_templates = project_templates.concat(files["templates"]);
    project_enumerations = project_enumerations.concat(files["enumerations"]);
    project_filters = project_filters.concat(files["filters"]);
    project_directives = project_directives.concat(files["directives"]);
    project_controllers = project_controllers.concat(files["controllers"]);
  }

  if("templates" in config["dependencies"]["production"])
  {
    compile_templates = compile_templates.concat(
      config["dependencies"]["production"]["templates"].map(function(x){return path.join(config.path.base, x);})
    );
  }
  compile_templates = compile_templates.concat(project_templates);

  compile_enumerations = compile_enumerations.concat(project_enumerations);
  compile_filters = compile_filters.concat(project_filters);
  compile_directives = compile_directives.concat(project_directives);
  compile_controllers = compile_controllers.concat(project_controllers);

  compile_js = compile_js.concat(
    config["dependencies"]["production"]["javascript"].map(function(x){return path.join(config.path.base, x);})
  );

  test_js = test_js.concat(
    config["dependencies"]["test"]["javascript"].map(function(x){return path.join(config.path.base, x);})
  );
}

compile_js = compile_js.concat(
    compile_enumerations,
    compile_filters,
    compile_directives,
    compile_controllers);

test_js = test_js.concat(
    compile_enumerations,
    compile_filters,
    compile_directives,
    compile_controllers);

compilelist = compilelist.concat([
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
    }
]);
compilelist = compilelist.concat(require("./config.yml")["compiler"]["list"]);

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
    for(var i = 0; i < test_js.length; i++)
    {
        gulp.src(test_js[i])
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
