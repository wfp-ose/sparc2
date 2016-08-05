var gulp = require('gulp');
var gutil = require('gulp-util');
var pkg = require('./package.json');
var fs = require('fs');
var concat = require('gulp-concat');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
//
//var uglifyjs = require('uglify-js');
//uglifyjs.dead_code = false;
//var minifier = require('gulp-uglify/minifier');
var uglify = require('gulp-uglify');
//
var jshint = require('gulp-jshint');
var less = require('gulp-less');
var templateCache = require('gulp-angular-templatecache');
var yaml = require("yamljs");
var del = require('del');
var path = require('path');
var merge = require('merge');
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

var geodash =
{
  config: {}, // Project Name --> Config
  var:
  {
    compile_js: undefined,
    compile_less: undefined,
    controllers: undefined // Controller Name --> {handlers: {...}}
  },
  resolveBuild: function(x, minified){
    geodash.log(["!","!", "!", "resolveBuild("+x+","+minified+")"]);
    var outfile = rootConfig['build'][x]['outfile'];
    if(minified == true)
    {
      outfile = path.basename(outfile, path.extname(outfile)) + ".min.js";
    }
    geodash.log(["build "+ outfile, minified]);
    return path.join(rootConfig['build'][x]['dest'], outfile);
  },
  resolveVariable: function(x)
  {
    return geodash.var[x];
  },
  resolveResource: function(project, name, version, minified)
  {
    var resourcePath = undefined;
    if(geodash.config[project]['resources'] == undefined)
    {
      geodash.error("Missing project "+ project+" when trying to get resource "+name+".");
    }
    var config = geodash.config[project];
    var resources = config['resources'];
    for(var i = 0; i < resources.length; i++)
    {
      if(resources[i].name == name)
      {
        resourcePath = (minified == true && (resources[i].minified != undefined)) ? resources[i].minified : resources[i].path;
        break;
      }
    }
    if(version != undefined)
    {
      resourcePath = resourcePath.replace(new RegExp("{{(\\s*)version(\\s*)}}",'gi'), version);
    }
    try{
      resourcePath = path.join(config.path.base, resourcePath);
    }catch(err){
      geodash.error(["Could not resolve resource named "+name+" with version "+version+"."]);
    };
    return resourcePath;
  },
  log: function(message)
  {
    if(argv.debug)
    {
      if(Array.isArray(message))
      {
        for(var i = 0; i < message.length; i++)
        {
          gutil.log(gutil.colors.magenta(message[i]));
        }
      }
      else
      {
        gutil.log(gutil.colors.magenta(message));
      }
    }
  },
  error: function(message)
  {
    geodash.log(message);
    throw message;
  },
  resolve: function(x)
  {
    geodash.log(["\n","resolve("+JSON.stringify(x.name)+")"]);
    x = merge(true, x);
    if(Array.isArray(x.src))
    {
      var newSource = [];
      for(var i = 0; i < x.src.length; i++)
      {
        var y = x.src[i];
        if(typeof y == 'string')
        {
          newSource.push(y);
        }
        else
        {
          if(y.type == "resource" || y.type == "res")
          {
            var names = Array.isArray(y.names) ? y.names : [y.name];
            for(var j = 0; j < names.length; j++)
            {
              var z = geodash.resolveResource(y.project, names[j], y.version, (x.minified == true));
              if(z == undefined)
              {
                geodash.error("Resolved resource "+y.project+":"+y.name+" is undefined.");
              }
              newSource.push(z);
            }
          }
          else if(y.type == "variable" || y.type == "var")
          {
            var z = geodash.resolveVariable(y.name);
            if(Array.isArray(z))
            {
              newSource = newSource.concat(z);
            }
            else if(typeof y == 'string')
            {
              newSource.push(z);
            }
            else
            {
              geodash.error("Resolved variable "+y.name+" is not an array or string.");
            }
          }
          else if(y.type == "build")
          {
            newSource.push(geodash.resolveBuild(y.name, (x.minified == true)));
          }
          else
          {
            geodash.error("Unknown source type (\""+y.type+"\").  Can be either string, resource, variable, or build.");
          }
        }
      }
      geodash.log(JSON.stringify(x.src));
      newSource = newSource.map(function(a){
        geodash.log(a);
        return (a[0] == "/" || a[0] == "." || a[0] == "~") ? a : ("./" + a);
      });
      x.src = newSource.map(expandHomeDir);
      geodash.log(JSON.stringify(x.src));
    }
    else
    {
      x.src = expandHomeDir(x.src);
    }
    x.dest = expandHomeDir(x.dest);
    return x;
  },
  compile: function(t)
  {
    t = geodash.resolve(t); // Important to pass copy to resolve
    geodash.log(["", "geodash.compile(\""+t.name+"\")"]);

    if(Array.isArray(t.src) && t.src.length == 0)
    {
      geodash.log(["Nothing to do since t.src is empty array."]);
      return true;
    }

    if(t.type=="js")
    {
      // when t.minified is true, then t.src returns the minified versions
      if(t.uglify == true)
      {
        return gulp.src(t.src, {base: './'})
          .pipe(concat(t.outfile))
          .pipe(gulp.dest(t.dest))
          .pipe(rename({ extname: '.min.js'}))
          .pipe(uglify({mangle: false}))
          //.pipe(uglify({mangle: false, preserveComments: 'all'}))
          //.pipe(minifier({mangle: false, preserveComments: 'all'}, uglifyjs))
          .pipe(gulp.dest(t.dest));
      }
      else
      {
        return gulp.src(t.src, {base: './'})
          .pipe(concat(t.outfile))
          .pipe(gulp.dest(t.dest));
      }

    }
    else if(t.type=="css")
    {
      return gulp.src(t.src)
        .pipe(concat(t.outfile))
        .pipe(gulp.dest(t.dest));
    }
    else if(t.type=="less")
    {
      return gulp.src(t.src, {base: './'})
        .pipe(less({paths: t.paths}))
        .pipe(concat(t.outfile))
        .pipe(gulp.dest(t.dest));
    }
    else if(t.type=="template"||t.type=="templates")
    {
      return gulp.src(t.src)
        .pipe(templateCache('templates.js', {
          templateHeader: 'geodash.templates = {};\n',
          templateBody: 'geodash.templates["<%= url %>"] = "<%= contents %>";',
          templateFooter: '\n'
        }))
        .pipe(gulp.dest(t.dest));
    }
    else
    {
      return undefined;
    }
  }
};

geodash.log(['Debugging...', 'Done with imports']);

var collect_files = function(basePath, plugin, sType)
{
  var arr = [];
  if(plugin[sType] != undefined)
  {
    var prefix = path.join(basePath, plugin["id"]);
    for(var i = 0; i < plugin[sType].length; i++)
    {
      var x = plugin[sType][i];
      arr.push(path.join(prefix, sType, (typeof x == 'string' ? x : x['path'])));
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

geodash.log('Initialized common functions');

var rootConfig = require("./config.yml");
var configs = flatten_configs(load_config("./config.yml"));

var geodash_meta_projects = [];
var geodash_meta_plugins = [];
var geodash_meta_controllers = [];

var compile_schemas = [];
var compile_templates = [];
var compile_enumerations = [];
var compile_filters = [];
var compile_handlers = [];
var compile_directives = [];
var compile_controllers = [];
var compile_js = [];
var compile_less = [];
var test_js = [];
var compilelist = [];

geodash.log('Loaded configs and ready to build pipelines.');

for(var i = 0; i < configs.length; i++)
{
  var config = configs[i];
  geodash_meta_projects.push({
    'name':config.name,
    'version': config.version,
    'description': config.description});

  geodash.config[config.name] = config;
  //geodash.resources[config.name] = config.resources;

  geodash.log(['########', 'Project '+i+': '+config.name]);

  var path_plugins = path.join(config.path.base, config.path.geodash, "plugins")

  var project_schemas = [];
  var project_templates = [];  // Exported to the compile process
  var project_enumerations = []; // Exported to the compile process
  var project_filters = []; // Exported to the compile process
  var project_handlers = []; // Exported to the compile process
  var project_directives = []; // Exported to the compile process
  var project_controllers = []; // Exported to the compile process
  var project_less = []; // Exported to the compile process

  for(var j = 0; j < config["plugins"].length; j++)
  {
    geodash.log('Plugin '+i+'.'+j+': '+config["plugins"][j]);
    var pluginPath = expandHomeDir(path.join(path_plugins, config["plugins"][j], "config.yml"));
    geodash.log('Loding plugin from '+pluginPath);
    var geodash_plugin = require(expandHomeDir(pluginPath[0] == "/" ? pluginPath : ("./"+ pluginPath)));
    if(geodash_plugin == null || geodash_plugin == undefined)
    {
      geodash.error('Could not load plugin '+i+'.'+j+' '+ config["plugins"][j]);
    }
    geodash_plugin["project"] = config.name;
    geodash_plugin["id"] = config["plugins"][j];
    geodash_meta_plugins.push(geodash_plugin);

    if(geodash_plugin["controllers"] != undefined)
    {
      for(var k = 0; k < geodash_plugin.controllers.length; k++)
      {
        var c = geodash_plugin.controllers[k];
        if(typeof c != "string")
        {
          geodash_meta_controllers.push({'name': c.name, 'handlers': c.handlers});
        }
      }
    }

    var files = collect_files_all(path_plugins, geodash_plugin,
      ["enumerations", "schemas", "filters", "handlers", "controllers", "directives", "templates", "less"]);

    project_enumerations = project_enumerations.concat(files["enumerations"]);
    project_schemas = project_schemas.concat(files["schemas"]);
    project_templates = project_templates.concat(files["templates"]);
    project_filters = project_filters.concat(files["filters"]);
    project_handlers = project_handlers.concat(files["handlers"]);
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
  compile_enumerations = compile_enumerations.concat(project_enumerations);
  compile_schemas = compile_schemas.concat(project_schemas);
  compile_templates = compile_templates.concat(project_templates);
  compile_filters = compile_filters.concat(project_filters);
  compile_handlers = compile_handlers.concat(project_handlers);
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
    compile_handlers,
    compile_directives,
    compile_controllers);

test_js = test_js.concat(
    compile_enumerations,
    compile_filters,
    compile_handlers,
    compile_directives,
    compile_controllers);

geodash.var['compile_js'] = compile_js;
geodash.var['compile_less'] = compile_less;

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

var copylist = [];

geodash.log(['Compilelist built.', yaml.stringify(compilelist, 8, 2)]);

gulp.task('compile', ['clean', 'geodash:schema', 'geodash:templates'], function(){
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
  lines.push("geodash.meta.controllers = "+JSON.stringify(geodash_meta_controllers)+";");
  var contents = lines.join("\n");
  geodash.log(['Contents of GeoDash meta.js', contents]);
  if (!fs.existsSync('./build')){ fs.mkdirSync('./build'); }
  if (!fs.existsSync('./build/meta')){ fs.mkdirSync('./build/meta'); }
  fs.writeFile('./build/meta/meta.js',contents, cb);
});

gulp.task('geodash:schema', ['clean'], function(cb){

  var schema = {};

  for(var i = 0; i < compile_schemas.length; i++)
  {
    var plugin_schema = require(expandHomeDir(compile_schemas[i]));
    schema = merge(schema, plugin_schema);
  }

  geodash.log(['Schema', yaml.stringify(schema, 8, 2)]);

  if (!fs.existsSync('./build')){ fs.mkdirSync('./build'); }
  if (!fs.existsSync('./build/schema')){ fs.mkdirSync('./build/schema'); }

  fs.writeFile('./build/schema/schema.yml', '---\n'+yaml.stringify(schema, 8, 2), cb);
  //fs.writeFile('./build/schema/schema.json', JSON.stringify(schema), cb);
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

gulp.task('compile:main.css', ['clean'], function(){
  return geodash.compile(rootConfig['build']['main.css']);
});

gulp.task('compile:monolith.css', ['clean','compile:main.css'], function(){
  return geodash.compile(rootConfig['build']['monolith.css']);
});

gulp.task('compile:polyfill.js', ['clean'], function(){
  return geodash.compile(rootConfig['build']['polyfill.js']);
});

gulp.task('compile:main.js', ['clean', 'geodash:templates'], function(){
  return geodash.compile(rootConfig['build']['main.js']);
});

gulp.task('compile:monkeypatch.js', ['clean'], function(){
  return geodash.compile(rootConfig['build']['monkeypatch.js']);
});

gulp.task('compile:monolith.js', ['clean', 'geodash:templates', 'compile:main.js', 'compile:monkeypatch.js'], function(){
  var build = rootConfig['build']['monolith.js'];
  return geodash.compile(build);
});
gulp.task('compile:monolith.min.js', ['clean', 'geodash:templates', 'compile:main.js', 'compile:monkeypatch.js'], function(){
  var build = rootConfig['build']['monolith.js'];
  build.minified = true;
  build.outfile = path.basename(build.outfile, path.extname(build.outfile)) + ".min.js";
  return geodash.compile(build);
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
  'geodash:schema',
  'geodash:templates',
  'compile',
  'compile:main.css',
  'compile:monolith.css',
  'compile:polyfill.js',
  'compile:main.js',
  'compile:monkeypatch.js',
  'compile:monolith.js',
  'compile:monolith.min.js'
]);


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
