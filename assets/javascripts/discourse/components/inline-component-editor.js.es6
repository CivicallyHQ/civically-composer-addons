import showModal from 'discourse/lib/show-modal';
import { getUploadMarkdown } from 'discourse/lib/utilities';
import { typeText } from '../lib/topic-type-utilities';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';
import UploadMixin from "discourse/mixins/upload";

export default Ember.Component.extend(UploadMixin, {
  classNames: ['inline-component-editor', 'wmd-controls'],
  typingTime: 0,
  emojiPickerIsActive: false,
  bodyLengthClass: 'invalid-length',
  uploadEvent: null,

  didInsertElement() {
    this.$('.d-editor-input').focus();
  },

  @computed('currentType', 'category')
  bodyPlaceholder(type, category) {
    return typeText(type, 'body_placeholder', {
      category,
      keyOnly: true
    });
  },

  keyUp: _.throttle(function(){
    let typingTime = this.get("typingTime") || 0;
    let newTime = typingTime + 100;

    this.sendAction('setTypingTime', newTime);

    const postError = this.get('postError');
    if (postError) {
      this.sendAction('clearPostError');
    }

  }, 100, { leading: false, trailing: true }),

  @computed('body')
  bodyLength(body) {
    return body ? body.length : 0;
  },

  @observes('bodyLength')
  checkifBodyReady() {
    const requiredLength = Number(this.siteSettings.min_first_post_length);
    const bodyLength = Number(this.get('bodyLength'));
    if (bodyLength >= requiredLength) {
      this.set('bodyLengthClass', '');
      this.sendAction('ready', true);
    } else {
      const ready = this.get('componentReady');
      if (ready) {
        this.set('bodyLengthClass', 'invalid-length');
        this.sendAction('ready', false);
      }
    }
  },

  uploadDone(upload) {
    const text = getUploadMarkdown(upload);
    const uploadEvent = this.get('uploadEvent')

    if (uploadEvent) {
      uploadEvent.addText(text);
    }

    this.set('uploadEvent', null);
  },

  actions: {
    showUploadModal(toolbarEvent) {
      this.set('uploadEvent', toolbarEvent);
      showModal('uploadSelector').setProperties({ toolbarEvent, imageUrl: null, imageLink: null });
    },

    extraButtons(toolbar) {
      toolbar.addButton({
        id: 'upload',
        group: 'insertions',
        icon: 'upload',
        title: 'upload',
        sendAction: 'showUploadModal'
      });
    }
  }
});
