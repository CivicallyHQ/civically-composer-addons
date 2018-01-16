import computed from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  tagName: "div",
  classNameBindings: [":topic-type-text", "ext"],

  @computed('type')
  text() {
    return I18n.t(`topic.type.${this.get('type')}.${this.get('ext')}`);
  }
});
