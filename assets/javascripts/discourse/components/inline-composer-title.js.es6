import { allowedTypes, typeText } from '../lib/topic-type-utilities';
import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';

export default Ember.Component.extend({
  classNames: 'inline-composer-title',
  showLength: Ember.computed.alias('focus'),
  showRightInput: Ember.computed.or('showLength', 'loading', 'showTitleIcon'),
  showTitleIcon: Ember.computed.or('titleValid', 'identicalTitle'),
  titleContentsValid: Ember.computed.not('identicalTitle'),
  titleContentsWarning: Ember.computed.alias('similarTitles'),
  titleValid: Ember.computed.and('titleLengthValid', 'titleContentsValid'),
  searchDisabled: Ember.computed.not('titleLengthValid'),
  loading: Ember.computed.or('loadingUrl', 'searchingTitle'),
  isContent: Ember.computed.equal('currentType', 'content'),
  showFeaturedLink: Ember.computed.and('isContent', 'focus'),

  didInsertElement() {
    Ember.$(document).on('click', Ember.run.bind(this, this.documentClick));
  },

  willDestroyElement() {
    Ember.$(document).off('click', Ember.run.bind(this, this.documentClick));
  },

  documentClick(e) {
    let $element = this.$();
    let $target = $(e.target);
    if ($target.closest($element).length < 1 &&
        $target.closest($('.d-modal')).length < 1 &&
        this._state !== 'destroying') {
      this.clickOutside();
    }
  },

  click(e) {
    const similarTitles = this.get('similarTitles');
    const identicalTitle = this.get('identicalTitle');
    let $target = $(e.target);

    if ((similarTitles || identicalTitle) &&
        $target.closest($('.inline-composer-title-wrapper')).length > 0) {
      this.set('showResults', true);
    }

    this.set('focus', true);
  },

  clickOutside() {
    this.set('showResults', false);
  },

  @computed('rawTitle')
  title(rawTitle) {
    return rawTitle ? rawTitle.trim() : '';
  },

  @computed('title')
  titleLength(title) {
    return title ? title.length : 0;
  },

  @computed('titleValid')
  titleLengthClass(valid) {
    return valid ? '' : 'invalid';
  },

  @computed('titleLength')
  titleLengthValid(titleLength) {
    const min = this.siteSettings.min_topic_title_length;
    const max = this.siteSettings.max_topic_title_length;
    return titleLength >= min && titleLength <= max;
  },

  @computed('titleContentsValid', 'titleContentsWarning')
  titleIcon(valid, warning) {
    if (valid) {
      return warning ? 'exclamation' : 'check';
    } else {
      return 'times';
    }
  },

  @computed('featuredLink', 'currentType')
  hasFeaturedLink(featuredLink, currentType) {
    return featuredLink && currentType === 'content';
  },

  @on('init')
  @observes('titleLength', 'identicalTitle', 'similarTitles')
  handleTitleChanges() {
    const titleValid = this.get('titleValid');
    const _titleValid = this.get('_titleValid');

    if (!titleValid && !_titleValid) return;

    const title = this.get('title');
    const _title = this.get('_title');

    if (title === _title) return;

    this.set('_title', title);

    let opts = {
      title
    };

    if (titleValid !== _titleValid) {
      opts['titleValid'] = titleValid;
    } else {
      this.set('showResults', false);
    }

    this.set('_titleValid', titleValid);

    if (this.isExternalUrl(title)) {
      this.sendAction('addTextToBody', title);

      Ember.run.next(() => {
        this.setProperties({
          rawTitle: '',
          featuredLink: title
        });
      });

      opts['currentType'] = 'content';
      opts['displayPreview'] = true;
      opts['title'] = '';
    }

    this.sendAction('titleChanged', opts);
  },

  isExternalUrl(t) {
    return /^(https?:)?\/\/[\w\.\-]+/i.test(t) &&
           !/\s/.test(t) &&
           !t.match(new RegExp("^https?:\\/\\/" + window.location.hostname, "i"));
  },

  @computed('currentUser', 'currentType', 'category')
  placeholder(currentUser, currentType, category) {
    if (currentType) {
      return typeText(currentType, 'title_placeholder', { category });
    } else {
      return I18n.t('composer.title_or_link_placeholder');
    }
  },

  actions: {
    removeFeaturedLink() {
      this.set('featuredLink', null);
    },

    afterTitleSearch(result) {
      let identicalTitle = false;
      let similarTitles = false;

      if (result.length) {
        similarTitles = true;
        if (result.filter(t => t.identical).length > 0) {
          identicalTitle = true;
        }
      }

      this.setProperties({
        similarTitles,
        identicalTitle
      });

      if (this.get('focus')) {
        this.set('showResults', similarTitles || identicalTitle);
      }
    },

    searching(value) {
      this.set('searchingTitle', value);
    },

    toggleResults() {
      this.toggleProperty('showResults');
    },

    addFeaturedLink() {
      let input = this.get('featuredLinkInput');
      if (this.isExternalUrl(input)) {
        this.setProperties({
          invalidLink: false,
          featuredLinkInput: null,
          featuredLink: input
        });
      } else {
        this.set('invalidLink', true);
      }
    }
  }
});
