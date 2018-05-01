import { default as computed } from 'ember-addons/ember-computed-decorators';
import { statuses, statusForType, statusLink, canPostType, typeText } from '../lib/topic-type-utilities';

export default Ember.Component.extend({
  classNameBindings: [":topic-type", "active", "type"],
  disabled: Ember.computed.alias('needMinTrust'),

  @computed('type', 'category')
  needMinTrust(type, category) {
    const user = this.get('currentUser');
    return !canPostType(user, type, category);
  },

  @computed('type', 'btnLabel')
  minTrustDescription(type, btnLabel) {
    let status = statusForType(type);
    return new Handlebars.SafeString(
      I18n.t('topic.type.min_trust', {
        status: statusLink(status),
        type: btnLabel
      })
    );
  },

  @computed('active')
  btnClasses(active) {
    let classes = '';
    if (active) classes += 'btn-primary';
    return classes;
  },

  @computed('type', 'category')
  btnLabel(type, category) {
    return typeText(type, 'label', { category });
  },

  @computed('type', 'category')
  description(type, category) {
    return typeText(type, 'description', { category });
  },

  @computed('currentType', 'type')
  active(currentType, type) {
    return currentType === type;
  },

  actions: {
    toggle() {
      const type = this.get('type');
      this.set('currentType', type);
    }
  }
})
