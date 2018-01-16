import computed from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  tagName: "div",
  classNameBindings: [':topic-type-btn'],

  @computed('active')
  topicTypeClass() {
    const topicType = this.get('topicType');
    let classes = topicType;
    if (this.get('active')) {
      classes += ' active';
    }
    return classes;
  },

  @computed('subtype')
  active() {
    return this.get('subtype') === this.get('topicType');
  },

  @computed()
  topicTypeLabel() {
    return `topic.type.${this.get('topicType')}.label`;
  },

  actions: {
    switchTopicType(){
      this.sendAction('switchTopicType', this.get('topicType'));
    }
  }
});
