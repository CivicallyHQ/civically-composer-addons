import { on, observes } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  classNames: 'civically-tag-chooser',

  @on('init')
  setup() {
    const civicallyTags = this.get('site.civically_tags');
    ['subjects', 'actions', 'parties'].forEach((type) => {
      this.set(type, civicallyTags[type]);
    });
  },

  @observes('subject', 'action', 'party')
  setTags() {
    let tags = [];

    ['subject', 'action', 'party'].forEach((type) => {
      let tag = this.get(type);
      if (tag) tags.push(tag);
    });

    this.set('tags', tags);
  },
});
