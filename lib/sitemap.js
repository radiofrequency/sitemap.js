/*!
 * Sitemap
 * Copyright(c) 2011 Eugene Kalinin
 * MIT Licensed
 */

var ut = require('./utils')
  , err = require('./errors')
  , urlparser = require('url');

exports.Sitemap = Sitemap;
exports.SitemapItem = SitemapItem;
exports.createSitemap = createSitemap;
exports.createSitemapIndex = createSitemapIndex;

/**
 * Shortcut for `new Sitemap (...)`.
 *
 * @param   {Object}        conf
 * @param   {String}        conf.hostname
 * @param   {String|Array}  conf.urls
 * @param   {Number}        conf.cacheTime
 * @return  {Sitemap}
 */
function createSitemap(conf) {
  return new Sitemap(conf.urls, conf.hostname, conf.cacheTime);
}

/**
 * Item in sitemap
 */
function SitemapItem(conf) {
  var conf = conf || {}
    , is_safe_url = conf['safe'];

  if ( !conf['url'] ) {
    throw new err.NoURLError();
  }

  // URL of the page
  this.loc = conf['url'];
  if ( !is_safe_url ) {
    var url_parts = urlparser.parse(conf['url']);
    if ( !url_parts['protocol'] ) {
      throw new err.NoURLProtocolError();
    }

    this.loc = ut.htmlEscape(conf['url']);
  }

  // The date of last modification (YYYY-MM-DD)
  if ( conf['lastmod'] ) {
    // append the timezone offset so that dates are treated as local time. Otherwise the Unit tests fail sometimes.
    var timezoneOffset = 'UTC-' + (new Date().getTimezoneOffset()/60) + '00';
    var dt = new Date( conf['lastmod'] + ' ' + timezoneOffset );
    this.lastmod = [ dt.getFullYear(), ut.lpad(dt.getMonth()+1, 2),
                      ut.lpad(dt.getDate(), 2) ].join('-');
  }

  // How frequently the page is likely to change
  this.changefreq = conf['changefreq'] || 'weekly';
  if ( !is_safe_url ) {
    if ( [ 'always',  'hourly', 'daily', 'weekly', 'monthly',
           'yearly', 'never' ].indexOf(this.changefreq) === -1 ) {
      throw new err.ChangeFreqInvalidError();
    }
  }

  // The priority of this URL relative to other URLs
  this.priority = conf['priority'] || 0.5;
  if ( !is_safe_url ) {
    if ( !(this.priority >= 0.0 && this.priority <= 1.0) ) {
      throw new err.PriorityInvalidError();
    }
  }
}

/**
 *  Create sitemap xml
 *  @return {String}
 */
SitemapItem.prototype.toXML = function () {
  return this.toString();
}

/**
 *  Alias for toXML()
 *  @return {String}
 */
SitemapItem.prototype.toString = function () {
      // result xml
  var xml = '<url> {loc} {lastmod} {changefreq} {priority} </url>'
      // xml property
    , props = ['loc', 'lastmod', 'changefreq', 'priority']
      // property array size (for loop)
    , ps = props.length
      // current property name (for loop)
    , p;

  while ( ps-- ) {
    p = props[ps];

    if (this[p]) {
      xml = xml.replace('{'+p+'}',
                  '<'+p+'>'+this[p]+'</'+p+'>');
    } else {
      xml = xml.replace('{'+p+'}', '');
    }
  }

  return xml.replace('  ', ' ');
}

/**
 * Sitemap constructor
 * @param {String|Array}  urls
 * @param {String}        hostname    optional
 * @param {Number}        cacheTime   optional in milliseconds
 */
function Sitemap(urls, hostname, cacheTime) {

  // This limit is defined by Google. See:
  // http://sitemaps.org/protocol.php#index
  this.limit = 50000

  // Base domain
  this.hostname = hostname;

  // URL list for sitemap
  this.urls = urls || [];
  if ( !(this.urls instanceof Array) ) {
    this.urls = [ this.urls ]
  }

  // sitemap cache
  this.cacheEnable = false;
  this.cache = '';
  if (cacheTime > 0) {
    this.cacheEnable = true;
    this.cacheCleanerId = setInterval(function (self) {
      self.clearCache();
    }, cacheTime, this);
  }
}

/**
 *  Clear sitemap cache
 */
Sitemap.prototype.clearCache = function () {
  this.cache = '';
}

/**
 *  Stop clear sitemap cache job
 */
Sitemap.prototype.clearCacheStop = function () {
  if (this.cacheCleanerId) {
    clearInterval(this.cacheCleanerId);
  }
}

/**
 *  Add url to sitemap
 *  @param {String} url
 */
Sitemap.prototype.add = function (url) {
  return this.urls.push(url);
}

/**
 *  Create sitemap xml
 *  @param {Function}     callback  Callback function with one argument — xml
 */
Sitemap.prototype.toXML = function (callback) {
  var self = this;
  process.nextTick( function () {
    callback( self.toString() );
  });
}

var reProto = /^https?:\/\//i;

Sitemap.prototype.toIndex = function() {
    var items_per_map = 10000;
    var self = this, xml = ['<?xml version="1.0" encoding="UTF-8"?>','<sitemapindex xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd">'];

    var num_maps = this.urls.count % items_per_map;

    for (var c=0; c<num_maps; c++) {
        '<url><loc></loc></url>'
    }
}

/**
 *  Synchronous alias for toXML()
 *  @return {String}
 */

Sitemap.prototype.toString = function () {
  var self = this
    , xml = [ '<?xml version="1.0" encoding="UTF-8"?>',
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  if (this.cacheEnable && this.cache) {
    return this.cache;
  }


  //if (this.urls > 10000) {
/*
 <sitemapindex xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd"><sitemap><loc>http://passion-hd.com/sitemap1.xml</loc><lastmod>2013-12-13T05:02:51-06:00</lastmod></sitemap></sitemapindex>

 <urlset xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://passion-hd.com</loc><lastmod>2013-12-13T05:02:49-06:00</lastmod><changefreq>always</changefreq><priority>1.0</priority></url><url><loc>http://passion-hd.com/video/more-than-a-toy</loc><lastmod>2013-12-13T10:51:43+00:00</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>

 */
 //     xml = ['<sitemapindex xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd">',

 //     sitemapindex xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd"
 // }
  // TODO: if size > limit: create sitemapindex

  this.urls.forEach( function (elem, index) {
    // SitemapItem
    var smi = elem;

    // create object with url property
    if ( typeof elem == 'string' ) {
      smi = {'url': elem};
    }
    // insert domain name
    if ( self.hostname && !reProto.test(smi.url) ) {
      smi.url = self.hostname + smi.url;
    }
    xml.push( new SitemapItem(smi) );
  })
  // close xml
  xml.push('</urlset>');

  this.cache = xml.join('\n');
  return this.cache;
}

/**
 * Shortcut for `new Sitemap (...)`.
 *
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder
 * @param   {String}        conf.hostname
 * @param   {Number}        conf.cacheTime
 * @param   {String}        conf.sitemapName
 * @param   {Number}        conf.sitemapSize
 * @return  {SitemapIndex}
 */
function createSitemapIndex(conf) {
  return new SitemapIndex(conf.urls, conf.targetFolder, conf.hostname, conf.cacheTime, conf.sitemapName, conf.sitemapSize, conf.callback);
}

/**
 * Sitemap index (for several sitemaps)
 * @param {String|Array}  urls
 * @param {String}        targetFolder
 * @param {String}        hostname      optional
 * @param {Number}        cacheTime     optional in milliseconds
 * @param {String}        sitemapName   optionnal
 * @param {Number}        sitemapSize   optionnal
 */
function SitemapIndex(urls, targetFolder, hostname, cacheTime, sitemapName, sitemapSize, callback) {

  try {


      var self = this;

      self.fs = require('fs');

      // Base domain
      self.hostname = hostname;

      if(sitemapName === undefined) {
        self.sitemapName = 'sitemap';
      }
      else {
        self.sitemapName = sitemapName;
      }

      // This limit is defined by Google. See:
      // http://sitemaps.org/protocol.php#index
      self.sitemapSize = sitemapSize;

      self.sitemapId = 0;

      self.sitemaps = [];

      self.targetFolder = '.';

      if(!self.fs.existsSync(targetFolder)) {
        throw new err.UndefinedTargetFolder();
      }

      self.targetFolder = targetFolder;

      // URL list for sitemap
      self.urls = urls || [];
      if ( !(this.urls instanceof Array) ) {
        this.urls = [ this.urls ]
      }


      self.callback = callback;


      for (var i=0; i < self.urls.length; i+=self.sitemapSize) {
           // console.log("i: " + i + " " + self.sitemapSize);

            var chunk =  self.urls.slice(i, i+self.sitemapSize);

            var filename = self.sitemapName + '-' + self.sitemapId++ + '.xml';
            self.sitemaps.push(filename);

            var sitemap = createSitemap ({
              hostname: self.hostname,
              cacheTime: self.cacheTime,        // 600 sec - cache purge period
              urls: chunk
            });
            console.log("writing sitemap:  " + filename);
            self.fs.writeFileSync(targetFolder + '/' + filename, sitemap.toString());
      }


      var xml = [];

      xml.push('<?xml version="1.0" encoding="UTF-8"?>');
      xml.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

      self.sitemaps.forEach( function (sitemap, index) {
        xml.push('<sitemap>');
        xml.push('<loc>' + hostname + '/' + sitemap + '</loc>');
    //    xml.push('<lastmod>' + new Date() + '</lastmod>');
        xml.push('</sitemap>');
      });

      xml.push('</sitemapindex>');

      self.fs.writeFileSync(targetFolder + '/' + self.sitemapName + '-index.xml', xml.join('\n'));

      callback(null, true);

  }  catch (ex) {
        callback(ex, false);
  }

}
