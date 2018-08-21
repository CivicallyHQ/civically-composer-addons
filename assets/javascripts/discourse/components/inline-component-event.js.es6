import InlineComponent from './inline-component';

export default InlineComponent.extend({
  classNames: ['inline-component-event'],
  needsProperties: ['customProperties.event'],

  didInsertElement() {
    this.sendAction('updateTip', 'inline_composer.tip.add_event', 'top');
  }
});
