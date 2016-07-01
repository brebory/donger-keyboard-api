
// jshint esversion: 6

const scraper = (function() {
    const util    = require('util');
    const cheerio = require('cheerio');
    const extend  = require('extensive');
    const Promise = require('bluebird');
    const _       = require('lodash');
    const request = Promise.promisify(require('request'), { multiArgs: true });

    const Scraper = extend(function(url) {
        this.url = url;
        let options = Scraper.getOptionsForURL(url);
        this.parse = options.parse.bind(this);
        this.categoriesPath = options.categoriesPath;
        this.categories = options.categories.bind(this);
    }, {
        scrape: Promise.method(function(options) {
            console.log(`Scraping, context is: ${util.inspect(this)}`);
            return request(this.url).bind(this).then(function(args) {
                if (args.length < 2) {
                    throw new ArgumentError("There was an error processing the request.");
                }

                let response = args[0];
                let body = args[1];

                return this.categories(body);
            }).then(function(categories) {
                let promises = _.reduce(categories, function(results, category) {
                    console.log(`Requesting URL: ${this.url + this.categoriesPath + category}`);
                    return (results[category] = request(this.url + this.categoriesPath + category)) && results;
                }.bind(this), {});
                return Promise.props(promises);
            }).then(function(requests) {
                let results = _.transform(requests, function(result, args, key) {
                    if (args.length < 2) {
                        throw new ArgumentError("There was an error processing the request.");
                    }

                    let response = args[0];
                    let body = args[1];

                    let dongers = this.parse(body);

                    result[key] = _.concat((result[key] || (result[key] = [])), dongers);
                }.bind(this), {});

                console.log(`Found results: ${util.inspect(results)}`);

                return results;
            });
        })
    }, {
        defaults: {
            defaultOptions: {
                parse: function(body) {
                    let html = cheerio.load(body);


                    let result = _.map(html(".text"), function(el) {
                        return cheerio(el).text();
                    });

                    return result;
                },
                categoriesPath: '',
                categories: function(body) {
                    return [''];
                }
            }
        },
        supportedURLs: {
            'dongerlist': {
                parse: function(body) {
                    let html = cheerio.load(body);

                    let result = _.map(html('.donger'), function(el) {
                        return cheerio(el).text();
                    });

                    let nextURL = html('.nextpostslink').attr('href');

                    if (nextURL) {
                        request(nextURL).then(function(body) {
                            let nextResults = this.parse(body);
                            _.merge(result, nextResults);
                        }.bind(this));
                    }

                    return result;
                },
                categoriesPath: '/category/',
                categories: function(body) {
                    let html = cheerio.load(body);

                    let result = _.map(html('.list-2-anchor'), function(el) {
                        return cheerio(el).text();
                    });

                    return result;
                }
            }
        },
        getOptionsForURL: function(url) {
            let options = Scraper.defaults.defaultOptions;

            let key = _.findKey(Scraper.supportedURLs, function(key) {
                return url.match(key);
            });

            if (key) {
                options = Scraper.supportedURLs[key];
            }

            console.log(`URL: ${url}\nOptions: ${util.inspect(options)}`);
            return options;
        }
    });

    return Scraper;
}());

module.exports = scraper;
