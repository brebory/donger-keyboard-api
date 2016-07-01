// jshint esversion: 6

const util    = require('util');
const gulp    = require('gulp');
const gutil   = require('gulp-util');
const use     = require('rekuire');
const through = require('through2');
const _       = require('lodash');
const Promise = require('bluebird');
const File    = require('vinyl');
const grename = require('gulp-rename');

gulp.task('scrape', function() {
    const Scraper = use('scraper');

    return gulp.src('config.json')
    .pipe(through.obj(function(file, enc, cb) {
        let contents = JSON.parse(file.contents);

        gutil.log(`Parsing config file: ${file.path}`);

        let promises = _.reduce(contents.sites, function(acc, site) {

            gutil.log(`Scraping site: ${site}`);

            let scraper = new Scraper(site);
            return _.concat(acc, scraper.scrape());
        }, []);

        Promise.all(promises).then(function(results) {
            results = _.reduce(results, _.merge, {});
            file.contents = new Buffer(JSON.stringify(results, null, 4));
            this.push(file);
            cb();
        }.bind(this));
    }))
    .pipe(grename('dongers.json'))
    .pipe(gulp.dest('.'));
});
