import { default as computed } from 'ember-addons/ember-computed-decorators';
import {
  allowedTypes,
  typeText
} from 'discourse/plugins/civically-composer-addons/discourse/lib/topic-type-utilities';

export default Ember.Component.extend({
  classNames: 'create-message',
  canChangeType: true,

  @computed('category')
  topicTypes(category) {
    const user = this.get('currentUser');
    return allowedTypes(user, category).map(type => {
      return {
        value: type,
        name: typeText(type, 'label', { category })
      }
    });
  },

  @computed('type', 'category')
  typeLabel(type, category) {
    return typeText(type, 'label', { category, lowercase: true });
  }
})