import Composer from 'discourse/models/composer';
import ComposerMessages from 'discourse/components/composer-messages';
import ComposerController from 'discourse/controllers/composer';
import DEditor from 'discourse/components/d-editor';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';
import { getOwner } from 'discourse-common/lib/get-owner';
import { withPluginApi } from 'discourse/lib/plugin-api';
import { typeText } from '../lib/topic-type-utilities';

const hasLocation = [
  'event',
  'rating'
];

export default {
  name: 'composer-edits',
  initialize(){
    Composer.serializeOnCreate('subtype', 'subtype');

    Composer.reopen({
      showCreateMessage: Ember.computed.alias('creatingTopic'),
      showCategoryChooser: false,
      similarTitleTopics: Ember.A(),
      typePlaceholderEnabled: true,

      @computed('subtype', 'topicFirstPost', 'category')
      showTypeControls(type, topicFirstPost, category) {
        return topicFirstPost && category && category.get('is_active') && this.siteSettings.compose_topic_types.split('|').indexOf(type) > -1;
      },

      @computed('subtype')
      forceLocationControls(subtype) {
        return hasLocation.indexOf(subtype) > -1;
      },

      @computed('subtype', 'topicFirstPost', 'category')
      typeBodyPlaceholder(type, topicFirstPost, category) {
        return topicFirstPost && type ? typeText(type, 'body_placeholder', {
          category,
          keyOnly: true
        }) : false;
      },

      @computed('canEditTopicFeaturedLink', 'subtype', 'topicFirstPost', 'category')
      titlePlaceholder(canEditTopicFeaturedLink, type, topicFirstPost, category) {
        if (type && topicFirstPost) return typeText(type, 'title_placeholder', {
          category,
          keyOnly: true
        });
        return canEditTopicFeaturedLink ? 'composer.title_or_link_placeholder' : 'composer.title_placeholder';
      },

      @observes('post')
      _setupPostSubtype: function() {
        const post = this.get('post');
        if (post) {
          this.set('subtype', post.get('topic.subtype'));
        }
      },

      @computed("privateMessage")
      minimumTitleLength(privateMessage) {
        const currentUser = Discourse.User.current();
        const admin = currentUser.admin;
        if (admin) return 1;

        if (privateMessage) {
          return this.siteSettings.min_personal_message_title_length;
        } else {
          return this.siteSettings.min_topic_title_length;
        }
      },
    });

    ComposerMessages.reopen({
      didInsertElement() {},
      willDestroyElement() {}
    });

    ComposerController.reopen({
      canEditTags: false,

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

    withPluginApi('0.8.12', api => {
      api.modifyClass('controller:discovery', {
        @computed('path')
        showInlineComposer(path) {
          if (!path) return false;
          return path.indexOf('calendar') === -1;
        }
      });

      api.modifyClass('controller:topic', {
        canEditTags: false
      });
    });
  }
};
