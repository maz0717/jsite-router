class Router {

  constructor(r) {
    this.routes = [];
    if(r) {
      this.root = r;
    }
    else {
      this.root = location.origin;
    }
  }

  on(...args) {
    if(args.length >= 2) {
      this._add(args[0], args[1], args[2]);
    }
    else if (typeof args[0] === 'object') {
      let orderedRoutes = Object.keys(args[0]).sort(this.compareUrlDepth);
      orderedRoutes.forEach(route => {
        this.on(route, args[0][route]);
      });
    }
    return this;
  }

  resolve(current) {
    const url = (current || this._cLoc()).replace(this.root, '');
    let GETParameters = this.extractGetParameters(current || this._cLoc());
    let onlyURL = this.getOnlyUrl(url);

    let m = this.match(onlyURL);
    if(m) {
      const handler = m.route.handler;
      m.route.route instanceof RegExp ?
        handler(...(m.match.slice(1, m.match.length))) :
        handler(m.params, GETParameters);
      return m;
    }
    return false;
  }

  _add(route, handler) {
    if(typeof route === 'string') {
      route =encodeURI(route);
    }
    this.routes.push(
      { route, handler }
    );
    return this;
  }

  _cLoc() {
    if (typeof window !== 'undefined') {
      return this.clean(window.location.href);
    }
    return '';
  }

  getUrlDepth(url) {
    return url.replace(/\/$/, '').split('/').length;
  }

  compareUrlDepth(urlA, urlB) {
    return this.getUrlDepth(urlB) - this.getUrlDepth(urlA);
  }

  extractGetParameters(url) {
    return url.split(/\?(.*)?$/).slice(1).join('');
  }

  getOnlyUrl(url) {
    const cleanGETParam = str => str.split(/\?(.*)?$/)[0];
    return cleanGETParam(url);
  }

  replaceDynamicUrlParts(route) {
    let paramNames = [], regexp;

    if(route instanceof RegExp) {
      regexp = route;
    }
    else {
      regexp = new RegExp(
        route.replace(Router.PARAMETER_REGEXP, function (full, dots, name) {
          paramNames.push(name);
          return Router.REPLACE_VARIABLE_REGEXP;
        })
          .replace(Router.WILDCARD_REGEXP, Router.REPLACE_WILDCARD) + Router.FOLLOWED_BY_SLASH_REGEXP
        , Router.MATCH_REGEXP_FLAGS);
    }
    return { regexp, paramNames };
  }

  regExpResultsToParams(match,names) {
    if(names.length === 0) return null;
    if(!match) return null;
    return match
      .slice(1, match.length)
      .reduce((params, value, index) => {
        if(params === null) params = {};
        params[names[index]] = decodeURIComponent(value);
        return params;
      }, null);
  }

  clean(s) {
    if (s instanceof RegExp) return s;
    return s.replace(/\/+$/, '').replace(/^\/+/, '^/');
  }

  match(url) {
    return this.findMatchedRoutes(url)[0] || false;
  }

  findMatchedRoutes(url) {
    return this.routes.map(route => {
      let { regexp, paramNames } = this.replaceDynamicUrlParts(this.clean(route.route));
      let match = url.replace(/^\/+/, '/').match(regexp);
      let params = this.regExpResultsToParams(match, paramNames);

      return match ? { match, route, params } : false;
    })
      .filter(m => m);
  }

}

Router.PARAMETER_REGEXP = /([:*])(\w+)/g;
Router.WILDCARD_REGEXP = /\*/g;
Router.REPLACE_VARIABLE_REGEXP = '([^\/]+)';
Router.REPLACE_WILDCARD = '(?:.*)';
Router.FOLLOWED_BY_SLASH_REGEXP = '(?:\/$|$)';
Router.MATCH_REGEXP_FLAGS = '';

export default Router;
