import { on } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  @on('didInsertElement')
  setup() {
    const needsProperties = this.get('needsProperties');

    if (needsProperties && needsProperties.length) {
      needsProperties.forEach((p) => {
        this.checkIfReady(p);
        this.addObserver(p, () => this.checkIfReady(p));
      });
    }
  },

  checkIfReady(property) {
    const ready = this.get('componentReady');
    const value = this.get(property);

    if (value && !ready) {
      this.sendAction('ready', true);
    }

    if (!value && ready) {
      this.sendAction('ready', false);
    }
  },

  @on('willDestroyElement')
  teardown() {
    const needsProperties = this.get('needsProperties');

    if (needsProperties && needsProperties.length) {
      needsProperties.forEach((p) => {
        this.removeObserver(p, () => this.checkIfReady(p));
      });
    }
  }
});
