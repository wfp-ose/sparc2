var gulp = require('gulp');
var gutil = require('gulp-util');
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
var argv = require('yargs').argv;
var expandHomeDir = require('expand-home-dir');
var spawn = require('child_process').spawn;

require.extensions['.yml'] = function (module, filename) {
  try {
    module.exports = yaml.parse(fs.readFileSync(filename, 'utf8'));
  }
  catch(err)
  {
    if(argv.debug)
    {
      gutil.log(gutil.colors.magenta('Could not open yaml file '+filename));
    }
    module.exports = null;
  }
};

if(argv.debug)
{
  gutil.log(gutil.colors.magenta('Debugging...'));
  gutil.log(gutil.colors.magenta('Done with imports'));
}

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

  var configObject = require(expandHomeDir(configPath));
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
  var config = require(expandHomeDir(n.path));
  config["path"]["base"] = path.dirname(n.path);
  configs.push(config);

  for(var i = 0; i < n.children.length; i++)
  {
    configs = flatten_configs(n.children[i]).concat(configs);
  }
  return configs;
};

if(argv.debug)
{
  gutil.log(gutil.colors.magenta('Initialized common functions'));
}

var rootConfig = require("./config.yml");
var configs = flatten_configs(load_config("./config.yml"));

var geodash_meta_projects = [];
var geodash_meta_plugins = [];

var compile_templates = [];
var compile_enumerations = [];
var compile_filters = [];
var compile_directives = [];
var compile_controllers = [];
var compile_js = [];
var compile_less = [];
var test_js = [];
var compilelist = [];

if(argv.debug)
{
  gutil.log(gutil.colors.magenta('Loaded configs and ready to build pipelines.'));
}

for(var i = 0; i < configs.length; i++)
{
  var config = configs[i];
  geodash_meta_projects.push({
    'name':config.name,
    'version': config.version,
    'description': config.description});
  if(argv.debug)
  {
    gutil.log(gutil.colors.magenta('########'));
    gutil.log(gutil.colors.magenta('Project '+i+': '+config.name));
  }

  var path_plugins = path.join(config.path.base, config.path.geodash, "plugins")

  var project_templates = [];  // Exported to the compile process
  var project_enumerations = []; // Exported to the compile process
  var project_filters = []; // Exported to the compile process
  var project_directives = []; // Exported to the compile process
  var project_controllers = []; // Exported to the compile process
  var project_less = []; // Exported to the compile process

  for(var j = 0; j < config["plugins"].length; j++)
  {
    if(argv.debug)
    {
      gutil.log(gutil.colors.magenta('Plugin '+i+'.'+j+': '+config["plugins"][j]));
    }

    var pluginPath = expandHomeDir(path.join(path_plugins, config["plugins"][j], "config.yml"));
    if(argv.debug)
    {
      gutil.log(gutil.colors.magenta('Loding plugin from '+pluginPath));
    }
    var geodash_plugin = require(expandHomeDir(pluginPath[0] == "/" ? pluginPath : ("./"+ pluginPath)));
    if(geodash_plugin == null || geodash_plugin == undefined)
    {
      var errorMessage = 'Could not load plugin '+i+'.'+j+' '+ config["plugins"][j];
      if(argv.debug)
      {
        gutil.log(gutil.colors.magenta(errorMessage));
      }
      throw errorMessage;
    }
    geodash_plugin["project"] = config.name;
    geodash_plugin["id"] = config["plugins"][j];
    geodash_meta_plugins.push(geodash_plugin);

    var files = collect_files_all(path_plugins, geodash_plugin,
      ["enumerations", "filters", "controllers", "directives", "templates", "less"]);

    project_templates = project_templates.concat(files["templates"]);
    project_enumerations = project_enumerations.concat(files["enumerations"]);
    project_filters = project_filters.concat(files["filters"]);
    project_directives = project_directives.concat(files["directives"]);
    project_controllers = project_controllers.concat(files["controllers"]);
    project_less = project_less.concat(files["less"]);
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
  compile_less = compile_less.concat(project_less);

  compile_js = compile_js.concat(
    config["dependencies"]["production"]["javascript"].map(function(x){return path.join(config.path.base, x);})
  );

  test_js = test_js.concat(
    config["dependencies"]["test"]["javascript"].map(function(x){return path.join(config.path.base, x);})
  );
}

compile_templates = compile_templates.map(expandHomeDir);

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

compile_less = [].concat(
  rootConfig["less"]["pre"],
  compile_less
);

compilelist = compilelist.concat([
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
        "src": compile_less,
        "outfile": rootConfig["less"]["outfile"],
        "dest": rootConfig["less"]["dest"],
        "paths": rootConfig["less"]["paths"]
    },
]);
compilelist = compilelist.concat(rootConfig["compiler"]["list"]);

compilelist = compilelist.map(function(obj){
  if(Array.isArray(obj['src']))
  {
    obj['src'] = obj['src'].map(expandHomeDir);
  }
  else
  {
    obj['src'] = expandHomeDir(obj['src']);
  }
  obj['dest'] = expandHomeDir(obj['dest']);
  return obj;
});

var copylist =
[
];

if(argv.debug)
{
  gutil.log(gutil.colors.magenta('Compilelist built.'));
  gutil.log(gutil.colors.magenta(yaml.stringify(compilelist, 5)));
}

gulp.task('compile', ['clean', 'geodash:templates'], function(){
    for(var i = 0; i < compilelist.length; i++)
    {
        var t = compilelist[i];
        if(argv.debug)
        {
          gutil.log(gutil.colors.magenta(t.name));
        }
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
            gulp.src(t.src, {base: './'})
                .pipe(less({paths: t.paths}))
                .pipe(concat(t.outfile))
                .pipe(gulp.dest(t.dest));
        }
        else if(t.type=="template"||t.type=="templates")
        {
            gulp.src(t.src)
                .pipe(templateCache('templates.js', {
                  templateHeader: 'geodash.templates = {};\n',
                  templateBody: 'geodash.templates["<%= url %>"] = "<%= contents %>";',
                  templateFooter: '\n'
                }))
                .pipe(gulp.dest(t.dest));
        }
    }
});

gulp.task('geodash:meta', ['clean'], function(cb){

  var lines = [];
  lines.push("geodash.meta = {};");
  lines.push("geodash.meta.projects = "+JSON.stringify(geodash_meta_projects)+";");
  lines.push("geodash.meta.plugins = "+JSON.stringify(geodash_meta_plugins)+";");
  var contents = lines.join("\n");
  if(argv.debug)
  {
    gutil.log(gutil.colors.magenta('Contents of GeoDash meta.js'));
    gutil.log(gutil.colors.magenta(contents));
  }
  if (!fs.existsSync('./build')){ fs.mkdirSync('./build'); }
  if (!fs.existsSync('./build/meta')){ fs.mkdirSync('./build/meta'); }
  fs.writeFile('./build/meta/meta.js',contents, cb);
});

gulp.task('geodash:templates', ['clean'], function(){

  return gulp.src(compile_templates)
      .pipe(templateCache('templates.js', {
        templateHeader: 'geodash.templates = {};\n',
        templateBody: 'geodash.templates["<%= url %>"] = "<%= contents %>";',
        templateFooter: '\n'
      }))
      .pipe(gulp.dest("./build/templates/"));
});

gulp.task('copy', ['clean'], function(){
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

gulp.task('default', [
  'clean',
  'copy',
  'geodash:meta',
  'geodash:templates',
  'compile']);


gulp.task('bootstrap:clean', function() {
    return del([
        './temp/**/*',
        (rootConfig.bootstrap.dest+'/**/*')
    ]);
});
gulp.task('bootstrap:prepareLess', ['bootstrap:clean'], function() {
    var base = rootConfig.bootstrap.src;
    return gulp.src([base+'/**', '!'+base+'/{variables.less}'])
        .pipe(gulp.dest('./temp'));
});
gulp.task('bootstrap:prepareVariables', ['bootstrap:prepareLess'], function() {
    return gulp.src(rootConfig.bootstrap.variables)
        .pipe(gulp.dest('./temp'));
});
gulp.task('bootstrap:compile', ['bootstrap:prepareVariables'], function() {
    return gulp.src('./temp/bootstrap.less')
        .pipe(less())
        .pipe(gulp.dest(rootConfig.bootstrap.dest));
});
