import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import { escapeExpression } from 'discourse/lib/utilities';
import { getOwner } from 'discourse-common/lib/get-owner';
import { extractError } from 'discourse/lib/ajax-error';
import { topicTypes } from '../lib/topic-type-utilities';
import DiscourseURL from 'discourse/lib/url';

const allowedProperties = {
  'event': ['event', 'location'],
  'rating': ['rating'],
  'general': [],
  'question': [],
};

export default Ember.Component.extend({
  classNameBindings: [':inline-composer', 'showLength:show-length', 'cantPostClass', 'showResults:has-similar-titles'],
  inputDisabled: Ember.computed.bool('cantPost'),
  placeholder: I18n.t('composer.title_or_link_placeholder'),
  hasTopTip: Ember.computed.notEmpty('topTip'),
  hasBottomTip: Ember.computed.notEmpty('bottomTip'),
  showRightInput: Ember.computed.or('showLength', 'searching', 'showSearchIcon'),
  customProperties: Ember.Object.create(),
  currentType: null,
  isEvent: Ember.computed.equal('currentType', 'event'),
  isRating: Ember.computed.equal('currentType', 'rating'),
  component: null,
  showLength: false,
  displayPreview: false,
  step: 0,
  bottomTip: 'inline_composer.tip.title_length',
  componentReady: false,
  _titleLength: 0,
  loading: false,
  postError: null,

  @computed('rawTitle')
  title(rawTitle) {
    return rawTitle ? rawTitle.trim() : '';
  },

  @computed('category', 'currentUser.place')
  cantPost(category, userPlace) {
    const user = this.get('currentUser');

    if (user && user.admin) return false;
    if (!category) return true;
    if (category.meta && !category.permission) return true;
    if (category.meta) return false;
    if (!userPlace) return 'no_place';

    if (category.is_place) {
      if (category.place_type === 'country') {
        if (!category.place_active) {
          return 'country_active';
        }
        if (category.id !== userPlace.country_category_id) {
          return 'foreign_country';
        };
      } else {
        if (category.id !== userPlace.id)  {
          return 'foreign_place';
        }
      }
    }

    return false;
  },

  @computed('cantPost')
  cantPostClass(cantPost) {
    if (cantPost && cantPost.length > 1 && cantPost !== true) {
      return cantPost.dasherize();
    } else if (cantPost === true) {
      return 'hide-input';
    } else {
      return '';
    }
  },

  @observes('cantPostClass')
  addHideInputToContainer() {
    const cantPostClass = this.get('cantPostClass');
    $('.discovery-inline-composer').toggleClass('hide-input', Boolean(cantPostClass === 'hide-input'));
  },

  @observes('cantPost')
  showCantPostTip() {
    const cantPost = this.get('cantPost');
    if (typeof cantPost === 'string' && cantPost !== true) {
      this.setProperties({
        'bottomTip': `inline_composer.tip.cant_post_${cantPost}`,
        'showContent': true
      });
    } else {
      this.resetDisplay();
    }
  },

  @computed('currentUser.place_category_id', 'category')
  showInput(userPlaceId, category) {
    const user = this.get('currentUser');
    if (user && user.admin) return true;

    return category &&
      ((userPlaceId && userPlaceId === category.id) ||
       (category.meta && category.permission));
  },

  @observes('cantPost', 'showContent')
  setTimer() {
    const cantPost = this.get('cantPost');
    const showContent = this.get('showContent');
    this.set('timerOn', showContent && !cantPost);
  },

  @observes('timerOn')
  setTimeStart() {
    const timerOn = this.get('timerOn');
    if (timerOn) {
      this.set('timeStart', new Date());
    } else {
      this.set('timeStart', null);
    }
  },

  @computed()
  composerTime() {
    const timeStart = this.get('timeStart');
    return new Date() - timeStart;
  },

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

  @computed('showInput', 'inputDisabled')
  handleClicks(showInput, inputDisabled) {
    return showInput && !inputDisabled;
  },

  click() {
    const handleClicks = this.get('handleClicks');
    if (handleClicks) this.showTitleTips();
  },

  clickOutside() {
    const handleClicks = this.get('handleClicks');
    if (handleClicks) {
      if (this._state === 'destroying') return;
      this.hideTitleTips();
    }
  },

  showTitleTips() {
    this.setProperties({
      'showLength': true,
      'showContent': true
    });
  },

  hideTitleTips() {
    this.setProperties({
      'showLength': false,
      'showContent': false
    });
  },

  @on('init')
  setupComponents() {
    let components = this.siteSettings.compose_inline_components.split('|');

    // For now, editor should always be the last component
    components.push('editor');

    this.set('components', components);
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
  titleValid(titleLength) {
    const min = this.siteSettings.min_topic_title_length;
    const max = this.siteSettings.max_topic_title_length;
    return titleLength >= min && titleLength <= max;
  },

  @observes('titleLength')
  handleTitleChanges() {
    const titleLength = this.get('titleLength');
    const _titleLength = this.get('_titleLength');
    if (_titleLength === titleLength) return;
    this.set('_titleLength', titleLength);

    this.set('postError', null);

    const titleValid = this.get('titleValid');

    if (titleValid) {
      let props = {
        searching: true,
        showContent: true,
        bottomTip: '',
        initialState: false
      }

      this.setProperties(props);
    } else {
      // Go back to the beginning if you're not there already;
      const initialState = this.get('initialState');
      if (!initialState) {
        this.setProperties({
          topTip: '',
          bottomTip: 'inline_composer.tip.title_length',
          showResults: false,
          component: null,
          componentReady: false,
          searching: false,
          initialState: true,
          displayPreview: false,
          step: 0,
        });
      }
    }
  },

  resetDisplay() {
    this.setProperties({
      componentReady: false,
      component: null,
      showResults: false,
      displayPreview: false,
      bottomTip: '',
      topTip: '',
      postError: null
    });
  },

  @computed('component', 'titleValid', 'identicalTitle')
  showComponent(component, titleValid, identicalTitle) {
    return component && titleValid && !identicalTitle;
  },

  showBack: Ember.computed.gt('step', 1),

  @computed('posting')
  backDisabled(posting) {
    return posting;
  },

  @computed('cantPost', 'showPost', 'showContent')
  showNext(cantPost, showPost, showContent) {
    return showContent && !cantPost && !showPost;
  },

  @computed('titleValid', 'componentReady', 'identicalTitle', 'searching')
  nextDisabled(titleValid, componentReady, identicalTitle, searching) {
    return !titleValid || !componentReady || identicalTitle || searching;
  },

  @computed('component')
  showPost(component) {
    return component === 'inline-component-editor';
  },

  @computed('posting', 'componentReady')
  postDisabled(posting, componentReady) {
    return posting || !componentReady;
  },

  showMeta: Ember.computed.alias('showPost'),

  @computed('showPost', 'posting', 'postError')
  showComposer(showPost, posting, postError) {
    return showPost && !posting && !postError;
  },

  @computed('showPost', 'posting', 'postError')
  showPreview(showPost, posting, postError) {
    return showPost && !posting && !postError;
  },

  @computed('displayPreview')
  previewKey(displayPreview) {
    return `inline_composer.${displayPreview ? 'edit' : 'preview'}`;
  },

  @computed('displayPreview')
  previewIcon(displayPreview) {
    return displayPreview ? 'edit' : 'television';
  },

  keyDown(e) {
    const showPost = this.get("showPost");
    const enter = e.which === 13;
    const shift = e.shiftKey;
    const escape = e.which === 27;
    const meta = e.metaKey;

    if (showPost) {
      if (escape) {
        this.hideTitleTips();
        return false;
      } else if (enter && (shift || meta)) {
        this.post();
        return false;
      }
    } else {
      if (e.keyCode === 13) {
        this.send('next');
        return false;
      }
    }
  },

  getCookedHtml() {
    return $(".inline-composer .d-editor-preview").html().replace(/<span class="marker"><\/span>/g, '');
  },

  post() {
    const customProperties = JSON.parse(JSON.stringify(this.get('customProperties')));
    const user = this.get('currentUser');
    const category = this.get('category');
    const type = this.get('currentType');

    const addProperties = Object.keys(customProperties)
      .filter((p) => allowedProperties[type].indexOf(p) > -1)
      .map((p) => customProperties[p]);

    const tags = this.get('tags');
    if (tags) {
      let tags = escapeExpression(tags).split(",").slice(0, Discourse.SiteSettings.max_tags_per_topic);
      tags.forEach(function(tag, index, array) {
        array[index] = tag.substring(0, Discourse.SiteSettings.max_tag_length);
      });
    }

    let imageSizes = {};
    this.$('.d-editor-preview img').each((i, e) => {
      const $img = $(e);
      const src = $img.prop('src');

      if (src && src.length) {
        imageSizes[src] = { width: $img.width(), height: $img.height() };
      }
    });

    let self = this;
    this.set('posting', true);

    const createdPost = this.store.createRecord('post', Object.assign({}, {
      raw: this.get('body'),
      title: escapeExpression(this.get('title')),
      category: category.get('id'),
      subtype: type,
      typing_duration_msecs: this.get('typingTime'),
      composer_open_duration_msecs: this.get('composerTime'),
      tags,
      image_sizes: imageSizes,
      cooked: this.getCookedHtml(),
      reply_count: 0,
      name: user.get('name'),
      display_username: user.get('name'),
      username: user.get('username'),
      user_id: user.get('id'),
      user_title: user.get('title'),
      avatar_template: user.get('avatar_template'),
      user_custom_fields: user.get('custom_fields'),
      post_type: this.site.get('post_types.regular'),
      actions_summary: [],
      moderator: user.get('moderator'),
      admin: user.get('admin'),
      yours: true,
      read: true,
      wiki: false
    }, addProperties));

    createdPost.save().then((result) => {
      if (category) category.incrementProperty('topic_count');

      user.set('topic_count', user.get('topic_count') + 1);

      const post = result.target;

      self.set('customProperties', Ember.Object.create());

      if (post) DiscourseURL.routeTo(post.get('url'));
    }).catch(error => {
      this.set('postError', extractError(error))
    }).finally(() => self.set('posting', false));
  },

  openComposer() {
    const controller = getOwner(this).lookup('controller:composer');
    const draftSequence = controller.get('model.draft_sequence');
    let addProperties = JSON.parse(JSON.stringify(this.get('customProperties')));

    addProperties['title'] = this.get('title');
    addProperties['body'] = this.get('body');
    addProperties['focusTarget'] = 'reply';

    const properties = {
      categoryId: this.get('category.id'),
      action: 'createTopic',
      draftKey: 'new_topic',
      draftSequence,
      addProperties
    }
    controller.open(properties).then(() => {
      controller.set('focusTarget', '');
      Ember.run.scheduleOnce('afterRender', () => {
        $('#reply-control .d-editor-input').focus();
      });
    });

    this.setProperties({
      component: null,
      showLength: false,
      showResults: false,
      step: 0,
      rawTitle: ''
    });
  },

  togglePreview() {
    this.toggleProperty('displayPreview');
    const displayPreview = this.get('displayPreview');
    const $preview = this.$('.d-editor-preview-wrapper');
    const $editor = this.$('.d-editor-textarea-wrapper');
    $editor.toggle(!displayPreview);
    $preview.toggle(displayPreview);
  },

  componentExists(componentName) {
    const component = getOwner(this).lookup(`component:inline-component-${componentName}`);
    return Boolean(component);
  },

  @computed('component')
  componentName(component) {
    return component.split('inline-component-')[1];
  },

  addComponent(params) {
    const component = params.name;
    let step = params.step;

    const current = this.get('componentName');
    let components = this.get('components');

    if (components.indexOf(component) === -1) {
      if (!step) step = components.indexOf(current) + 1;

      components.splice(step, 0, component);
    }

    this.set('components', components);
  },

  removeComponent(params) {
    const component = params.name;

    let components = this.get('components');
    let index = components.indexOf(component);

    if (index > -1) {
      components.splice(index, 1);
    }

    this.set('components', components);
  },

  back() {
    return new Ember.RSVP.Promise(resolve => {
      this.resetDisplay();

      let step = this.get('step');
      step--;

      const components = this.get('components');
      const index = Math.max(0, step - 1);
      let component = null;

      const componentName = components[index];
      if (!this.componentExists(componentName)) return;

      component = "inline-component-" + componentName;

      this.setProperties({
        component,
        step
      });

      resolve();
    });
  },

  next() {
    return new Ember.RSVP.Promise(resolve => {
      if (this.get('nextDisabled')) return;
      this.resetDisplay();

      let step = this.get('step');
      if (step == null) {
        step = 0;
      } else {
        step++;
      }

      const components = this.get('components');
      const componentName = components[step - 1];
      if (!this.componentExists(componentName)) return;

      this.setProperties({
        component: 'inline-component-' + componentName,
        step
      });

      resolve();
    });
  },

  updateTip(tip, location) {
    this.set(`${location}Tip`, tip);
  },

  showSearchIcon: Ember.computed.or('showResults', 'titleValid'),

  @computed('showResults', 'identicalTitle', 'titleValid')
  searchIcon(hasResults, identical) {
    if (hasResults) {
      return identical ? 'times' : 'exclamation';
    } else {
      return 'check';
    }
  },

  actions: {
    addComposerProperty(key, value) {
      const composerProps = this.get('customProperties');
      composerProps.set(key, value);
    },

    addComponents(components) {
      if (components.constructor !== Array) components = [components];
      components.forEach((c) => this.addComponent(c));
    },

    removeComponents(components) {
      if (components.constructor !== Array) components = [components];
      components.forEach((c) => this.removeComponent(c));
    },

    openComposer() {
      this.openComposer();
    },

    post() {
      this.post();
    },

    togglePreview() {
      this.togglePreview();
    },

    updateTip(tip, location) {
      this.updateTip(tip, location);
    },

    ready(ready) {
      this.set('componentReady', ready);
    },

    clearPostError() {
      this.set("postError", null);
    },

    back() {
      this.back();
    },

    next() {
      this.next();
    },

    setTypingTime(time) {
      this.set('typingTime', time);
    },

    afterTitleSearch(result) {
      const component = this.get('component');
      let noComponent = component === null;
      let identicalTitle = false;
      let showResults = false;
      let bottomTip = null;
      let topTip = null;

      if (result.filter(t => t.identical).length > 0) {
        topTip = 'inline_composer.tip.identical_title_top';
        bottomTip = 'inline_composer.tip.identical_title_bottom';
        identicalTitle = true
        showResults = true
      } else {
        if (result.length < 1) {
          if (noComponent) {
            topTip = 'inline_composer.tip.no_similar_titles';
          }
        } else {
          let type = result.length === 1 ? 'singular' : 'plural';
          topTip = `inline_composer.tip.similar_titles_top_${type}`;
          bottomTip = `inline_composer.tip.similar_titles_bottom_${type}`;
          showResults = true;
        }
      }

      let props = {
        identicalTitle,
        showResults,
        searching: false
      }

      // Allow the user to advance if there isn't a component yet.
      if (!identicalTitle && noComponent) {
        props['componentReady'] = true;
      }

      const resolve = (extraProps) => {
        this.updateTip(topTip, 'top');
        this.updateTip(bottomTip, 'bottom');
        this.setProperties(Object.assign({}, extraProps, props));
      }

      if (props.showResults) {
        resolve({
          component: null,
          step: 0
        });
      } else {
        resolve();
      }
    }
  }
});
