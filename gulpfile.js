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
    bb = require('bitballoon'),
    autoprefixer = require('gulp-autoprefixer'),
    cssnano = require('gulp-cssnano');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('clean', function () {
  return gulp.src('dist/**/*', {read: false}).pipe(clean());
});

function css(release) {
  var result = gulp.src('css/**/*.less')
    .pipe(less())
    .pipe(autoprefixer('last 2 version'));

  if (release) {
    result = result.pipe(cssnano());
  }

  return result.pipe(gulp.dest('dist/css'));
}

gulp.task('build-css', [], function() {
  return css();
});

gulp.task('build-css-release', [], function() {
  return css(true);
});

gulp.task('copy-html', [], function() {
  return gulp.src('src/**/*.html')
    .pipe(uncache())
    .pipe(gulp.dest('dist'));
});

gulp.task('copy-libs', [], function() {
  return gulp.src('lib/**/*.js').pipe(gulp.dest('dist'));
});

function compile(debug) {
  return browserify({
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
gulp.task('default', ['copy-html', 'build-css', 'copy-libs'], function() {
  return compile(true).pipe(gulp.dest('dist'));
});

gulp.task('build-release', ['copy-html', 'build-css-release', 'copy-libs'], function() {
  return compile(false)
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('release', ['clean'], function() {
  gulp.start('build-release');
});

gulp.task('deploy', [], function() {
  bb.deploy({
   access_token: process.env.BB_ACCESS_TOKEN,
   site_id: 'learnmor.se',
   dir: 'dist'
  }, function(err, deploy) {
   if (err) throw err;
  });
});

gulp.task('watch-compile', [], function() {
  return compile(true).pipe(gulp.dest('dist'));
})

gulp.task('watch-less', [], function() {
  return css();
});

gulp.task('watch', ['default'], function() {
  gulp.watch('src/**/*.html', ['copy-html']);
  gulp.watch('css/**/*.less', ['watch-less']);
  gulp.watch('src/**/*.ts', ['watch-compile']);
});
