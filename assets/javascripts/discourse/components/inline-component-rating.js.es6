import { observes } from 'ember-addons/ember-computed-decorators';
import InlineComponent from './inline-component';

export default InlineComponent.extend({
  classNames: ['inline-component-rating'],
  needsProperties: ['customProperties.rating']
});
