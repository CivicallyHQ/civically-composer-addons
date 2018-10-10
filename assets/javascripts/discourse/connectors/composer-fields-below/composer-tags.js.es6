export default {
  setupComponent(attrs, component) {
    Ember.run.scheduleOnce('afterRender', () => {
      $('.civically-tag-compose').appendTo('#reply-control .save-or-cancel');
    });
  }
}
