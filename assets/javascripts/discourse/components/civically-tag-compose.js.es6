import { default as computed } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  classNames: 'civically-tag-compose',

  @computed('showTagChooser')
  tagToggleLabel(showTagChooser) {
    return showTagChooser ? '' : 'inline_composer.tags.show';
  },

  @computed('showTagChooser')
  tagToggleIcon(showTagChooser) {
    return showTagChooser ? 'times' : '';
  },

  actions: {
    toggleTagChooser() {
      this.toggleProperty('showTagChooser');
    }
  }
})
