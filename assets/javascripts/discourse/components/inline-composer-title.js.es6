import { allowedTypes, typeText } from '../lib/topic-type-utilities';
import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import { ajax } from "discourse/lib/ajax";
import { load, lookupCache } from "pretty-text/oneboxer";

export default Ember.Component.extend({
  classNames: 'inline-composer-title',
  showLength: Ember.computed.alias('focus'),
  showRightInput: Ember.computed.or('showLength', 'searching', 'showTitleIcon'),
  showTitleIcon: Ember.computed.or('titleValid', 'identicalTitle'),
  titleContentsValid: Ember.computed.not('identicalTitle'),
  titleContentsWarning: Ember.computed.alias('similarTitles'),
  titleValid: Ember.computed.and('titleLengthValid', 'titleContentsValid'),
  searchDisabled: Ember.computed.not('titleLengthValid'),

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

  click() {
    const similarTitles = this.get('similarTitles');
    const identicalTitle = this.get('identicalTitle');
    if (similarTitles || identicalTitle) {
      this.setProperties({
        showResults: true,
        focus: true
      });
    }
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

  @on('init')
  @observes('titleLength', 'identicalTitle', 'similarTitles')
  handleTitleChanges() {
    const titleValid = this.get('titleValid');
    const _titleValid = this.get('_titleValid');

    if (!titleValid && !_titleValid) return;

    const title = this.get('title');

    let opts = {
      title
    };

    if (titleValid !== _titleValid) {
      opts['titleValid'] = titleValid;
    } else {
      this.set('showResults', false);
    }

    this.set('_titleValid', titleValid);

    this.sendAction('titleChanged', opts);
  },

  @observes('titleValid')
  checkForUrl() {
    const titleValid = this.get('titleValid');
    if (!titleValid || !this.element || this.isDestroying || this.isDestroyed) {
      return;
    }

    const title = this.get('title');

    const isAbsoluteUrl = function(t) {
      return /^(https?:)?\/\/[\w\.\-]+/i.test(t) &&
             !/\s/.test(t);
    };

    if (isAbsoluteUrl(title)) {
      let civicallyLink = title.match(new RegExp("^https?:\\/\\/" + window.location.hostname, "i"));
      if (civicallyLink) return;

      const link = document.createElement("a");
      link.href = title;

      const loadOnebox = load({
        elem: link,
        refresh: false,
        ajax,
        synchronous: true,
        categoryId: this.get("category.id")
      });

      if (loadOnebox && loadOnebox.then) {
        loadOnebox
          .then(() => {
            const v = lookupCache(title);
            this.handleUrl((v ? v : link), title);
          });
      } else {
        this.handleUrl(loadOnebox, title);
      }
    }
  },

  handleUrl(html, url) {
    if (html) {
      const $h = $(html);
      const heading = $h.find(":header");
      let title = null;

      if (heading.length > 0 && heading.text().length > 0) {
        title = heading.text();
      } else {
        const firstTitle = $h.attr("title") || $h.find("[title]").attr("title");

        if (firstTitle && firstTitle.length > 0) {
          title = firstTitle;
        } else {
          let path = $h.attr("href").split('/');
          title = path[path.length - 1];
        }
      }

      this.sendAction('hasFeaturedLink', url);

      this.setProperties({
        featuredLink: url,
        rawTitle: title
      });
    }
  },

  @computed('currentUser', 'category')
  placeholder(currentUser, category) {
    const topicTypes = allowedTypes(currentUser, category);

    if (topicTypes && topicTypes.length === 1) {
      return typeText(topicTypes[0], 'title_placeholder', { category });
    } else {
      return I18n.t('composer.title_or_link_placeholder');
    }
  },

  actions: {
    removeFeaturedLink() {
      this.set('featuredLink', null);

      if (this.get('component') !== 'inline-component-editor') {
        this.sendAction('resetDisplay');
      }
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
      this.set('searching', value);
    },

    toggleResults() {
      this.toggleProperty('showResults');
    }
  }
});
