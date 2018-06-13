import { default as computed, on, observes } from 'ember-addons/ember-computed-decorators';
import { topicTypes } from '../lib/topic-type-utilities';
import InlineComponent from './inline-component';

const typeComponents = [
  'event',
  'rating'
];

const hasComponent = function(type) {
  return typeComponents.indexOf(type) > -1;
};

export default InlineComponent.extend({
  classNameBindings: [':composer-component', ':topic-type-container', 'isInlineComposer:show-descriptions' ],
  needsProperties: ['currentType'],

  didInsertElement() {
    this.sendAction('updateTip', 'inline_composer.tip.type_choice', 'top');
  },

  @computed('category')
  topicTypes(category) {
    return topicTypes(category);
  },

  @observes('currentType')
  handleTypeChange() {
    const type = this.get('currentType');

    if (type) {
      let topicTypes = $.extend([], this.get('topicTypes'));
      topicTypes.splice(topicTypes.indexOf(type), 1);
      let otherComponents = topicTypes.map((c) => {
        return {
          name: c
        }
      });

      this.sendAction('removeComponents', otherComponents);

      if (hasComponent(type)) {
        this.sendAction('addComponents', { name: type });
      }
    }
  }
});
