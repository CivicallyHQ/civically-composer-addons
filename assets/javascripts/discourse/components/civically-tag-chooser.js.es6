import { on, observes } from 'ember-addons/ember-computed-decorators';

const groupMap = {
  'subjects': 'subject',
  'actions': 'action',
  'parties': 'party'
};

export default Ember.Component.extend({
  classNames: 'civically-tag-chooser',

  @on('init')
  setup() {
    const civicallyTags = this.get('site.civically_tags');
    const tags = this.get('tags');

    Object.keys(groupMap).forEach((group) => {
      let props = {};

      props[group] = civicallyTags[group];

      let groupTag = groupMap[group];
      if (tags) {
        tags.forEach((t) => {
          if (civicallyTags[group].indexOf(t) > -1) {
            props[groupTag] = t;
          }
        });
      }

      this.setProperties(props);
    });
  },

  @observes('subject', 'action', 'party')
  setTags(sender, key) {
    const civicallyTags = this.get('site.civically_tags');
    let group = Object.keys(groupMap).find((g) => groupMap[g] === key);
    let tags = this.get('tags') || [];

    let newTag = this.get(key);
    if (tags.indexOf(newTag) === -1) {
      tags = tags.filter(t => civicallyTags[group].indexOf(t) === -1);
      tags.push(newTag);
    }

    this.set('tags', tags);
  },
});
