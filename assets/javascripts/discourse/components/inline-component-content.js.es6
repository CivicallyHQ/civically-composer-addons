import InlineComponent from './inline-component';

export default InlineComponent.extend({
  classNames: ['inline-component-content'],

  didInsertElement() {
    this.sendAction('showAddMessage');
    this.sendAction('ready', true);
  }
});
