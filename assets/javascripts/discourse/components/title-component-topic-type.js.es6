import { default as computed } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  classNameBindings: [':composer-component', ':topic-type-container', 'isTitleComposer:show-descriptions' ],
  subtype: '',

  didInsertElement() {
    this.sendAction('updateTip', 'composer.tip.type_choice', 'top');
  },

  @computed('category.topic_types')
  topicTypes(categoryTopicTypes) {
    const isAdmin = this.get('currentUser.admin');
    return categoryTopicTypes && !isAdmin ? categoryTopicTypes.split('|') :
      this.siteSettings.composer_topic_types.split('|');
  },

  actions: {
    switchTopicType(type) {
      this.set('subtype', type);
      this.sendAction('addComposerProperty', 'subtype', type);

      if (type === 'event') {
        this.sendAction('setNextTarget', 'event');
      }

      this.sendAction('ready');
    }
  }
});
