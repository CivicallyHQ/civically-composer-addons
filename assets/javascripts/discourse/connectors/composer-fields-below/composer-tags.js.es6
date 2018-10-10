export default {
  setupComponent(attrs, component) {
    Ember.run.scheduleOnce('afterRender', () => {
      component.$('.civically-tag-compose').appendTo('.save-or-cancel');
    });
  }
}
