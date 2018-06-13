import KeyboardShortcuts from 'discourse/lib/keyboard-shortcuts';
import Category from 'discourse/models/category';
import Composer from 'discourse/models/composer';

export default {
  name: 'shortcut-edits',
  initialize() {
    KeyboardShortcuts['createTopic'] = function() {
      const townId = this.currentUser.town_category_id;
      if (townId) {
        const category = Category.findById(townId);
        if (category && category.get('permission') === 1) {
          this.container.lookup('controller:composer').open({
            action: Composer.CREATE_TOPIC,
            draftKey: Composer.CREATE_TOPIC
          });
        }
      }
    };
  }
};
