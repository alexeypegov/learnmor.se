'use strict';

var gulp = require('gulp'),
// var bb = require('bitballoon');
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    tsify = require('tsify'),
    ts = require('gulp-typescript'),
    uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    buffer = require('vinyl-buffer'),
    clean = require('gulp-clean'),
    less = require('gulp-less'),
    uncache = require('gulp-uncache'),
    bb = require('bitballoon');

var tsProject = ts.createProject('tsconfig.json');

var paths = {
  pages: ['src/index.html']
};

gulp.task('clean', function () {
  return gulp.src('dist/**/*', {read: false}).pipe(clean());
});

function css() {
  return gulp.src('css/**/*').pipe(less()).pipe(gulp.dest('dist/css'));
}

// todo: minimize
gulp.task('build-css', ['clean'], function() {
  return css();
});

gulp.task('copy-img', ['build-css'], function() {
  return gulp.src('img/**/*.svg').pipe(gulp.dest('dist/img'));
});

gulp.task('copy-html', ['copy-img'], function() {
  return gulp.src(paths.pages).pipe(uncache()).pipe(gulp.dest('dist'));
});

gulp.task('copy-libs', ['copy-html'], function() {
  return gulp.src('lib/**/*.js').pipe(gulp.dest('dist'));
});

function compile(debug) {
  return browserify({
    // basedir: '.',
    debug: true,
    entries: ['src/app.ts'],
    cache: {},
    packageCache: {}
  })
  .plugin(tsify)
  .bundle()
  .pipe(source('app.js'));
}

// todo: call clean synchronyously
gulp.task('default', ['copy-libs'], function() {
  return compile(true).pipe(gulp.dest('dist'));
});

gulp.task('release', ['copy-libs'], function() {
  return compile(false)
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'));
});

gulp.task('deploy', ['release'], function() {
  bb.deploy({
   access_token: process.env.BB_ACCESS_TOKEN,
   site_id: 'learnmor.se',
   dir: 'dist'
  }, function(err, deploy) {
   if (err) throw err;
  })
});

gulp.task('watch-compile', [], function() {
  return compile(true).pipe(gulp.dest('dist'));
})

gulp.task('watch-less', [], function() {
  return css();
});

gulp.task('watch', [], function() {
  gulp.watch('src/**/*.html', ['copy-html']);
  gulp.watch('css/**/*.less', ['watch-less']);
  gulp.watch('src/**/*.ts', ['watch-compile']);
});
