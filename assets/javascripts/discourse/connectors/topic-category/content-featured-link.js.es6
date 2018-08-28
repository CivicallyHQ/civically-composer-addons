export default {
  setupComponent(attrs, component) {
    component.set('showFeaturedLink', attrs.topic.subtype === 'content');
    Ember.run.scheduleOnce('afterRender', () => {
      $('.content-featured-link').insertBefore('.title-wrapper .topic-category');
    });
  }
};
