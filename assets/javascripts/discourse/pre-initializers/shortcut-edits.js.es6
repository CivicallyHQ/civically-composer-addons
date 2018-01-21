import KeyboardShortcuts from 'discourse/lib/keyboard-shortcuts';
import Category from 'discourse/models/category';
import Composer from 'discourse/models/composer';

export default {
  name: 'shortcut-edits',
  initialize() {
    KeyboardShortcuts['createTopic'] = function() {
      const userPlaceCategoryId = this.currentUser.place_category_id;
      if (userPlaceCategoryId) {
        const category = Category.findById(userPlaceCategoryId);
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
