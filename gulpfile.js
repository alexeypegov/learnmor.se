'use strict';

var gulp = require('gulp');
// var bb = require('bitballoon');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var tsify = require('tsify');
var ts = require('gulp-typescript');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var buffer = require('vinyl-buffer');
var clean = require('gulp-clean');
var less = require('gulp-less');

var tsProject = ts.createProject('tsconfig.json');

var paths = {
  pages: ['src/index.html']
};

// gulp.task('deploy', ['default'], function() {
//   bb.deploy({
//     access_token: process.env.BB_ACCESS_TOKEN,
//     site_id: 'learnmor.se',
//     dir: 'dist'
//   }, function(err, deploy) {
//     if (err) throw err;
//   })
// });

gulp.task('clean', function () {
  return gulp.src('dist/**/*', {read: false}).pipe(clean());
});

// todo: minimize
gulp.task('build-css', ['clean'], function() {
  return gulp.src('css/**/*').pipe(less()).pipe(gulp.dest('dist/css'));
});

gulp.task('copy-img', ['build-css'], function() {
  return gulp.src('img/**/*.svg').pipe(gulp.dest('dist/img'));
});

gulp.task('copy-html', ['copy-img'], function() {
  return gulp.src(paths.pages).pipe(gulp.dest('dist'));
});

gulp.task('copy-libs', ['copy-html'], function() {
  return gulp.src('lib/**/*.js').pipe(gulp.dest('dist'));
});

// todo: call clean synchronyously
gulp.task('default', ['copy-libs'], function() {
  return browserify({
    basedir: '.',
    debug: true,
    entries: ['src/browser.ts', 'src/morse.ts', 'src/data.ts', 'src/app.ts'],
    cache: {},
    packageCache: {}
  })
  .plugin(tsify)
  .bundle()
  .pipe(source('app.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('release', ['copy-libs'], function() {
  return browserify({
    basedir: '.',
    debug: false,
    entries: ['src/browser.ts', 'src/morse.ts', 'src/data.ts', 'src/app.ts'],
    cache: {},
    packageCache: {}
  })
  .plugin(tsify)
  .bundle()
  .pipe(source('app.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('dist'));
});
