import Composer from 'discourse/models/composer';
import ComposerMessages from 'discourse/components/composer-messages';
import ComposerController from 'discourse/controllers/composer';
import DEditor from 'discourse/components/d-editor';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';
import { getOwner } from 'discourse-common/lib/get-owner';

const hasLocation = [
  'event',
  'rating'
];

export default {
  name: 'composer-edits',
  initialize(){
    Composer.serializeOnCreate('topic_type', 'subtype');

    Composer.reopen({
      showCreateMessage: Ember.computed.alias('creatingTopic'),
      showCategoryChooser: false,
      similarTitleTopics: Ember.A(),
      typePlaceholderEnabled: true,

      @computed('subtype', 'topicFirstPost', 'category')
      showTypeControls(type, topicFirstPost, category) {
        return topicFirstPost && category && category.get('is_active') && this.siteSettings.composer_topic_types.split('|').indexOf(type) > -1;
      },

      @computed('subtype')
      forceLocationControls(subtype) {
        return hasLocation.indexOf(subtype) > -1;
      },

      @computed('subtype', 'topicFirstPost')
      typeBodyPlaceholder(type, topicFirstPost) {
        return topicFirstPost && type ? `topic.type.${type}.body_placeholder` : false;
      },

      @computed('canEditTopicFeaturedLink', 'subtype', 'topicFirstPost')
      titlePlaceholder(canEditTopicFeaturedLink, type, topicFirstPost) {
        if (type && topicFirstPost) return `topic.type.${type}.title_placeholder`;
        return canEditTopicFeaturedLink ? 'composer.title_or_link_placeholder' : 'composer.title_placeholder';
      },

      @observes('post')
      _setupPostSubtype: function() {
        const post = this.get('post');
        if (post) {
          this.set('subtype', post.get('topic.subtype'));
        }
      },
    });

    ComposerMessages.reopen({
      queuedForTyping: []
    });

    ComposerController.reopen({
      _setModel(composerModel, opts) {
        this._super(composerModel, opts);
        const addProps = opts.addProperties;
        if (addProps) {
          Object.keys(addProps).forEach((k) => {
            this.set(`model.${k}`, addProps[k]);
          });
        }
      }
    });

    DEditor.reopen({
      init() {
        this._super(...arguments);
        const controller = getOwner(this).lookup('controller:composer');
        if (controller) {
          this.set('typeBodyPlaceholder', controller.get('model.typeBodyPlaceholder'));
          controller.addObserver('model.subtype', this, function() {
            if (this._state === 'destroying') return;

            this.set('typeBodyPlaceholder', controller.get('model.typeBodyPlaceholder'));
          });
        }
      },

      @computed('placeholder', 'typeBodyPlaceholder')
      placeholderTranslated(placeholder, typeBodyPlaceholder) {
        if (typeBodyPlaceholder) return I18n.t(typeBodyPlaceholder);
        if (placeholder) return I18n.t(placeholder);
        return null;
      }
    });
  }
};
