export default {
  setupComponent(attrs, component) {
    Ember.run.scheduleOnce('afterRender', () => {
      component.$('.civically-tag-compose').insertAfter('#draft-status');
    });
  }
}
