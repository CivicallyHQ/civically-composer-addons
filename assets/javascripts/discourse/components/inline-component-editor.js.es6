import showModal from 'discourse/lib/show-modal';
import { getUploadMarkdown } from 'discourse/lib/utilities';
import { typeText } from '../lib/topic-type-utilities';
import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import UploadMixin from "discourse/mixins/upload";
import { formatUsername } from "discourse/lib/utilities";
import { load } from "pretty-text/oneboxer";
import { ajax } from "discourse/lib/ajax";

export default Ember.Component.extend(UploadMixin, {
  classNames: ['inline-component-editor', 'wmd-controls'],
  typingTime: 0,
  emojiPickerIsActive: false,
  bodyValid: false,
  uploadEvent: null,
  markdownOptions: {
    previewing: true,
    formatUsername
  },

  @on('didInsertElement')
  @observes('displayPreview')
  togglePreview() {
    const displayPreview = this.get('displayPreview');
    const $preview = this.$('.d-editor-preview-wrapper');
    const $editor = this.$('.d-editor-textarea-wrapper');
    $editor.toggle(!displayPreview);
    $preview.toggle(displayPreview);
  },

  @computed('currentType', 'category')
  bodyPlaceholder(currentType, category) {
    return typeText(currentType, 'body_placeholder', {
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

  @computed('bodyValid')
  bodyLengthClass(bodyValid) {
    let bodyLengthClass = "body-length";
    if (bodyValid) {
      bodyLengthClass += " valid";
    }
    return bodyLengthClass
  },

  @computed('displayPreview')
  previewKey(displayPreview) {
    return `inline_composer.${displayPreview ? 'edit' : 'preview'}`;
  },

  @computed('displayPreview')
  previewIcon(displayPreview) {
    return displayPreview ? 'edit' : 'television';
  },

  @on('didInsertElement')
  @observes('bodyLength')
  checkifBodyReady() {
    const requiredLength = Number(this.siteSettings.min_first_post_length);
    const bodyLength = Number(this.get('bodyLength'));
    const ready = this.get('componentReady');

    if (bodyLength >= requiredLength) {
      this.set('bodyValid', true);
      if (!ready) {
        this.sendAction('ready', true);
      }
    } else {
      if (ready) {
        this.set('bodyValid', false);
        this.sendAction('ready', false);
      }
    }
  },

  uploadDone(upload) {
    const text = getUploadMarkdown(upload);
    const uploadEvent = this.get('uploadEvent');

    if (uploadEvent) {
      uploadEvent.addText(text);
    }

    this.set('uploadEvent', null);
  },

  _loadOneboxes($oneboxes) {
    let refresh = false;
    $oneboxes.each((_, o) =>
      load({
        elem: o,
        refresh,
        ajax,
        categoryId: this.get("composer.category.id"),
        topicId: this.get("composer.topic.id")
      })
    );
  },

  actions: {
    showUploadModal(toolbarEvent) {
      this.set('uploadEvent', toolbarEvent);
      showModal('uploadSelector').setProperties({ toolbarEvent, imageUrl: null, imageLink: null });
    },

    togglePreview() {
      this.toggleProperty('displayPreview');
    },

    extraButtons(toolbar) {
      toolbar.addButton({
        id: 'upload',
        group: 'insertions',
        icon: 'picture-o',
        title: 'upload',
        sendAction: 'showUploadModal'
      });

      const mobileView = this.get('site.mobileView');
      if (mobileView) {
        toolbar.groups.forEach((g) => {
          if (g.group === 'extras') {
            g.lastGroup = true;
          }
        });
      }
    },

    previewUpdated($preview) {
      const $oneboxes = $("a.onebox", $preview);
      const maxOneboxes = this.siteSettings.max_oneboxes_per_post;
      if ($oneboxes.length > 0 && $oneboxes.length <= maxOneboxes) {
        Ember.run.debounce(this, this._loadOneboxes, $oneboxes, 450);
      }
    },

    openComposer() {
      this.sendAction('openComposer');
    }
  }
});
