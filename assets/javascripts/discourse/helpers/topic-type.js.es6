import { registerUnbound } from 'discourse-common/lib/helpers';
import { typeText } from '../lib/topic-type-utilities';

registerUnbound('type-text', function(type, text, opts) {
  return new Handlebars.SafeString(typeText(type, text, opts));
});
