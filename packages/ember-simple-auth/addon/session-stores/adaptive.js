import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';
import Base from 'ember-simple-auth/session-stores/base';

const LOCAL_STORAGE_TEST_KEY = '_ember_simple_auth_test_key';

const proxyToInternalStore = function() {
  return computed({
    get(key) {
      return this.get(`_${key}`);
    },
    set(key, value) {
      this.set(`_${key}`, value);
      let _store = this.get('_store');
      if (_store) {
        _store.set(key, value);
      }
      return value;
    }
  });
};

/**
  Session store that persists data in the browser's `localStorage` (see
  {{#crossLink "LocalStorageStore"}}{{/crossLink}}) if that is available or in
  a cookie (see {{#crossLink "CookieStore"}}{{/crossLink}}) if it is not.

  __This is the default store that Ember Simple Auth will use when the
  application doesn't define a custom store.__

  __This session store does not work with FastBoot. In order to use Ember
  Simple Auth with FastBoot, configure the
  {{#crossLink "CookieStore"}}{{/crossLink}} as the application's session
  store.__

  @class AdaptiveStore
  @module ember-simple-auth/session-stores/adaptive
  @extends BaseStore
  @public
*/
export default Base.extend({
  /**
    The `localStorage` key the store persists data in if `localStorage` is
    available.

    @property localStorageKey
    @type String
    @default 'ember_simple_auth-session'
    @public
  */
  localStorageKey: 'ember_simple_auth-session',

  /**
    The domain to use for the cookie if `localStorage` is not available, e.g.,
    "example.com", ".example.com" (which includes all subdomains) or
    "subdomain.example.com". If not explicitly set, the cookie domain defaults
    to the domain the session was authenticated on.

    @property cookieDomain
    @type String
    @default null
    @public
  */
  _cookieDomain: null,
  cookieDomain: proxyToInternalStore(),

  /**
    Allows servers to assert that a cookie ought not to be sent along with
    cross-site requests, which provides some protection against cross-site
    request forgery attacks (CSRF).

    Available options:
    - "Strict"
    - "Lax"

    @property sameSite
    @type String
    @default null
    @public
  */
  _sameSite: null,
  sameSite: proxyToInternalStore(),

  /**
    The name of the cookie to use if `localStorage` is not available.

    @property cookieName
    @type String
    @default ember_simple_auth-session
    @public
  */
  _cookieName: 'ember_simple_auth-session',
  cookieName: proxyToInternalStore(),

  /**
    The path to use for the cookie, e.g., "/", "/something".

    @property cookiePath
    @type String
    @default '/'
    @public
  */
  _cookiePath: '/',
  cookiePath: proxyToInternalStore(),

  /**
    The expiration time for the cookie in seconds if `localStorage` is not
    available. A value of `null` will make the cookie a session cookie that
    expires and gets deleted when the browser is closed.

    @property cookieExpirationTime
    @default null
    @type Integer
    @public
  */
  _cookieExpirationTime: null,
  cookieExpirationTime: proxyToInternalStore(),

  _cookies: service('cookies'),

  _isLocalStorageAvailable: computed({
    get() {
      return testLocalStorageAvailable();
    },

    set(key, value) {
      return value;
    }
  }),

  init() {
    this._super(...arguments);

    let owner = getOwner(this);
    if (owner && !this.hasOwnProperty('_fastboot')) {
      this._fastboot = owner.lookup('service:fastboot');
    }

    let store;
    if (this.get('_isLocalStorageAvailable')) {
      const localStorage = owner.lookup('session-store:local-storage');
      const options = { key: this.get('localStorageKey') };

      options._isFastBoot = false;
      localStorage.setProperties(options);

      store = localStorage;
    } else {
      const cookieStorage = owner.lookup('session-store:cookie');
      const options = this.getProperties('cookieDomain', 'cookieName', 'cookieExpirationTime', 'cookiePath', 'sameSite');

      cookieStorage.setProperties(options);
      this.set('cookieExpirationTime', cookieStorage.get('cookieExpirationTime'));

      store = cookieStorage;
    }

    this.set('_store', store);
    this._setupStoreEvents(store);
  },

  _setupStoreEvents(store) {
    store.on('sessionDataUpdated', (data) => {
      this.trigger('sessionDataUpdated', data);
    });
    return store;
  },

  /**
    Persists the `data` in the `localStorage` if it is available or in a cookie
    if it is not.

    @method persist
    @param {Object} data The data to persist
    @return {Ember.RSVP.Promise} A promise that resolves when the data has successfully been persisted and rejects otherwise.
    @public
  */
  persist() {
    return this.get('_store').persist(...arguments);
  },

  /**
    Returns all data currently stored in the `localStorage` if that is
    available - or if it is not, in the cookie - as a plain object.

    @method restore
    @return {Ember.RSVP.Promise} A promise that resolves with the data currently persisted in the store when the data has been restored successfully and rejects otherwise.
    @public
  */
  restore() {
    return this.get('_store').restore();
  },

  /**
    Clears the store by deleting the
    {{#crossLink "LocalStorageStore/key:property"}}{{/crossLink}} from
    `localStorage` if that is available or by deleting the cookie if it is not.

    @method clear
    @return {Ember.RSVP.Promise} A promise that resolves when the store has been cleared successfully and rejects otherwise.
    @public
  */
  clear() {
    return this.get('_store').clear();
  }
});

function testLocalStorageAvailable() {
  try {
    localStorage.setItem(LOCAL_STORAGE_TEST_KEY, true);
    localStorage.removeItem(LOCAL_STORAGE_TEST_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
