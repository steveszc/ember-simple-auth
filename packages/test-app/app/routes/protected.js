import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default Route.extend({
  session: service(),
  store: service(),

  beforeModel(transition) {
    this.get('session').requireAuthentication(transition, 'login');
  },

  model() {
    return this.get('store').findAll('post');
  }
});
