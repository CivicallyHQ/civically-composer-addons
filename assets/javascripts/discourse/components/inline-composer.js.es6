import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import { escapeExpression } from 'discourse/lib/utilities';
import { getOwner } from 'discourse-common/lib/get-owner';
import { extractError } from 'discourse/lib/ajax-error';
import Draft from 'discourse/models/draft';
import DiscourseURL from 'discourse/lib/url';

const allowedProperties = {
  'event': ['event', 'location'],
  'rating': ['rating'],
  'general': [],
  'question': [],
  'content': []
};

export default Ember.Component.extend({
  router: Ember.inject.service('-routing'),
  classNameBindings: [':inline-composer', 'showContent', 'focus', 'cantPostClass', 'hasSimilarTitles', 'currentType'],
  inputDisabled: Ember.computed.bool('cantPost'),
  hasTopTip: Ember.computed.notEmpty('topTip'),
  hasBottomTip: Ember.computed.notEmpty('bottomTip'),
  currentType: 'general',
  isEvent: Ember.computed.equal('currentType', 'event'),
  isRating: Ember.computed.equal('currentType', 'rating'),
  displayPreview: false,
  step: 0,
  postError: null,
  showResults: false,
  components: ['editor'],
  component: 'inline-component-editor',
  hasProperties: true,
  rawTitle: '',

  @computed('currentUser.town_category_id', 'currentUser.neighbourhood_category_id', 'category')
  showTitle(townId, neighbourhoodId, category) {
    const user = this.get('currentUser');
    if (user && user.admin) return true;

    return category &&
      ((category.meta && category.permission) ||
      (townId &&
      (category.place_type === 'international' ||
       townId === category.id ||
       neighbourhoodId === category.id)));
  },

  @computed('category', 'currentUser.town', 'currentUser.neighbourhood')
  cantPost(category, town, neighbourhood) {
    const user = this.get('currentUser');

    if (user && user.admin) return false;
    if (!category) return true;
    if (category.meta && !category.permission) return true;
    if (category.meta) return false;
    if (!town) return 'no_town';

    if (category.is_place) {
      if (category.place_type === 'international') {
        return false;
      }

      if (category.place_type === 'country') {
        if (!category.place_active) {
          return 'country_active';
        }
        if (category.id !== town.parent_category_id) {
          return 'foreign_country';
        };
      } else if (category.place_type === 'town') {
        if (category.id !== town.id) return 'foreign_town';
      } else if (category.place_type === 'neighbourhood') {
        if (category.id !== neighbourhood.id) return 'foreign_neighbourhood';
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

  @on('init')
  @observes('cantPost')
  setup() {
    const cantPost = this.get('cantPost');
    let bottomTip;
    let showContent;

    if (typeof cantPost === 'string' && cantPost !== true) {
      bottomTip = `place.create.not_permitted.${cantPost}`;
      showContent = true;
    } else {
      showContent = false;
    }

    let props = {
      showContent,
      hasSimilarTitles: false,
      displayPreview: false,
      topTip: '',
      postError: null,
      customProperties: Ember.Object.create(),
      step: null
    };

    if (bottomTip) props['bottomTip'] = bottomTip;

    const params = this.get('router.router.currentState.routerJsState.fullQueryParams');
    if (params['match_tags'] && params['match_tags'].length) {
      props['tags'] = params['match_tags'].split(',');
    }

    this.setProperties(props);
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

  @computed('showTitle', 'cantPost')
  handleClicks(showTitle, cantPost) {
    return showTitle && !cantPost;
  },

  click() {
    const handleClicks = this.get('handleClicks');
    if (handleClicks) {
      this.set('focus', true);

      if (this.get('titleValid')) {
        this.set('showContent', true);
      }
    }
  },

  clickOutside() {
    const handleClicks = this.get('handleClicks');
    if (handleClicks) {
      if (this._state === 'destroying') return;
      this.setProperties({
        showContent: false,
        focus: false
      });
    }
  },

  addTextToBody(text) {
    let body = this.get('body');

    if (!body || body.indexOf(text) === -1) {
      if (body && body.length) {
        body += ' ';
      } else {
        body = '';
      }
      body += text;

      Ember.run.scheduleOnce('afterRender', () => {
        this.$('.d-editor-input').focus();
      });

      this.set('body', body);
    }
  },

  resetDisplay() {
    this.setProperties({
      componentReady: false,
      displayPreview: false,
      bottomTip: '',
      topTip: '',
      postError: null,
      componentShowAddMessage: false
    });
  },

  resetAll() {
    this.resetDisplay();
    this.setProperties({
      hasSimilarTitles: false,
      showContent: false,
      customProperties: Ember.Object.create(),
      hasProperties: true,
      step: null,
      body: '',
      rawTitle: '',
      featuredLink: '',
      step: 0,
      tags: null
    });
  },

  @computed('isRating', 'isEvent')
  showProperties(isRating, isEvent) {
    return isRating || isEvent;
  },

  @computed('component', 'titleValid')
  showComponent(component, titleValid) {
    return component && titleValid;
  },

  showBack: Ember.computed.gt('step', 1),

  @computed('step', 'component')
  showClear(step, component) {
    return (step > 0 || component === 'inline-component-editor') &&
           component !== 'inline-component-content';
  },

  @computed('posting')
  backDisabled(posting) {
    return posting;
  },

  @computed('postError')
  desktopPostError(postError) {
    return !this.site.mobileView && postError;
  },

  @computed('postError')
  mobilePostError(postError) {
    return this.site.mobileView && postError;
  },

  @computed('cantPost', 'showPost', 'showContent', 'componentDisabledNext', 'components')
  showNext(cantPost, showPost, showContent, componentDisabledNext, components) {
    return showContent && !cantPost && !showPost && !componentDisabledNext && components.length > 1;
  },

  @computed('titleValid', 'component', 'componentReady')
  nextDisabled(titleValid, component, componentReady) {
    return !titleValid || (component !== null && !componentReady);
  },

  @computed('component', 'components.[]', 'showComponent')
  showPost(component, components, showComponent) {
    return showComponent &&
           (components.length === 1 ||
           (component &&
           (components[components.length - 1] === component.split('-')[2])));
  },

  @observes('currentType', 'customProperties.event', 'customProperties.rating')
  checkForRequiredProperties() {
    const currentType = this.get('currentType');
    let hasRequiredProperties;

    switch(currentType) {
      case 'event':
      case 'rating':
        const property = this.get(`customProperties.${currentType}`);
        hasRequiredProperties = Boolean(property);
        break;
      default:
        hasRequiredProperties = true;
    }

    this.set('hasRequiredProperties', hasRequiredProperties);
  },

  @computed('posting', 'componentReady', 'titleValid', 'hasRequiredProperties')
  postDisabled(posting, componentReady, titleValid, hasRequiredProperties) {
    return posting || !componentReady || !titleValid || !hasRequiredProperties;
  },

  @computed('componentShowAddMessage')
  showAddMessage(componentShowAddMessage) {
    return componentShowAddMessage;
  },

  @computed('titleInvalid', 'cantPost', 'identicalTitle')
  addMessageDisabled(titleInvalid, cantPost, identicalTitle) {
    return titleInvalid || cantPost || identicalTitle;
  },

  @computed()
  backBtnLabel() {
    return this.site.mobileView ? '' : 'inline_composer.back';
  },

  @computed()
  nextBtnLabel() {
    return this.site.mobileView ? '' : 'inline_composer.next';
  },

  @computed()
  postBtnLabel() {
    return 'composer.create_topic';
  },

  @computed('showPost', 'titleValid')
  showMeta(showPost, titleValid) {
    return showPost && titleValid;
  },

  keyDown(e) {
    const showPost = this.get("showPost");
    const enter = e.which === 13;
    const shift = e.shiftKey;
    const escape = e.which === 27;
    const meta = e.metaKey;
    const focus = this.get('focus');

    if (!focus) this.set('focus', true);

    if (escape) {
      if (this.get('showResults')) {
        this.set('showResults', false);
      } else {
        this.set('showContent', false);
      }
      return false;
    }

    if (showPost) {
      if (enter && (shift || meta)) {
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

  @observes('body', 'title', 'step')
  shouldSaveDraft() {
    const titleValid = this.get('titleValid');
    if (titleValid) {
      Ember.run.debounce(this, this.saveDraft, 2000);
    }
  },

  @on('didInsertElement')
  setupDraft() {
    const controller = getOwner(this).lookup('controller:discovery/topics');

    let draftSequence = controller.get('model.draft_sequence');;
    let draft = controller.get('model.draft');
    let draftKey = 'new_topic';

    try {
      if (draft && typeof draft === 'string') {
        draft = JSON.parse(draft);
      }
    } catch (error) {
      draft = null;
      Draft.clear(draftKey, draftSequence);
    }

    if (draft && (draft.title && draft.title !== '')) {
      let step = draft.step;

      this.setProperties({
        draftSequence,
        rawTitle: draft.title,
        body: draft.reply,
        currentType: draft.currentType,
        step,
        components: draft.components,
        component: draft.component,
        customProperties: draft.customProperties,
        composerTime: draft.composerTime,
        typingTime: draft.typingTime,
        tags: draft.tags,
        featuredLink: draft.featuredLink
      });

      const cantPost = this.get('cantPost');
      if (step > 0 && !cantPost) {
        Ember.run.scheduleOnce('afterRender', () => this.set('showContent', true));
      }
    } else {
      this.set('draftSequence', draftSequence);
    }
  },

  saveDraft() {
    if (this._state === 'destroying') return;

    const draftSequence = this.get('draftSequence');

    const data = {
      reply: this.get('body'),
      action: 'createTopic',
      title: this.get('title'),
      currentType: this.get('currentType'),
      step: this.get('step'),
      component: this.get('component'),
      components: this.get('components'),
      customProperties: this.get('customProperties'),
      composerTime: this.get('composerTime'),
      typingTime: this.get('typingTime'),
      tags: this.get('tags'),
      featuredLink: this.get('featuredLink')
    };

    this.set('draftStatus', I18n.t('composer.saving_draft_tip'));

    const composer = this;

    if (this._clearingStatus) {
      Em.run.cancel(this._clearingStatus);
      this._clearingStatus = null;
    }

    return Draft.save('new_topic', draftSequence, data)
      .then(function() {
        if (composer._state !== 'destroying') {
          composer.set('draftStatus', I18n.t('composer.saved_draft_tip'));
        }
      }).catch(function() {
        if (composer._state !== 'destroying') {
          composer.set('draftStatus', I18n.t('composer.drafts_offline'));
        }
      });
  },

  @observes('title', 'body')
  dataChanged: function(){
    const draftStatus = this.get('draftStatus');
    const self = this;

    if (draftStatus && !this._clearingStatus) {

      this._clearingStatus = Em.run.later(this, function(){
        if (self._state !== 'destroying') {
          self.set('draftStatus', null);
          self._clearingStatus = null;
        }
      }, 1000);
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
    const component = this.get('component');

    let addProperties = Object.keys(customProperties)
      .reduce((result, k) => {
        if (allowedProperties[type].indexOf(k) > -1) {
          result[k] = customProperties[k];
        }
        return result;
      }, {});

    if (category) {
      addProperties['category'] = category.get('id');
    }

    let tags = this.get('tags');
    if (tags && tags.length) {
      const maxTagCount = Discourse.SiteSettings.max_tags_per_topic;
      const maxTagLength = Discourse.SiteSettings.max_tag_length;

      tags = tags.slice(0, maxTagCount);

      tags.forEach(function(tag, index, array) {
        if (tag) {
          array[index] = tag.substring(0, maxTagLength);
        }
      });

      addProperties['tags'] = tags;
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

    let post = {
      raw: this.get('body'),
      title: escapeExpression(this.get('title')),
      subtype: type,
      typing_duration_msecs: this.get('typingTime'),
      composer_open_duration_msecs: this.get('composerTime'),
      image_sizes: imageSizes,
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
    };

    if (addProperties) {
      Object.keys(addProperties).forEach((k) => {
        post[k] = addProperties[k];
      });
    }

    if (type === 'content') {
      post['featured_link'] = this.get('featuredLink');
    }

    if (component === 'inline-component-editor') {
      post['cooked'] = this.getCookedHtml();
    }

    const createdPost = this.store.createRecord('post', post);

    createdPost.save().then((result) => {
      if (category) category.incrementProperty('topic_count');

      user.set('topic_count', user.get('topic_count') + 1);
      self.set('posting', false);

      let newPost = result.target;
      if (newPost) {
        self.resetAll();
        DiscourseURL.routeTo(newPost.get('url'));
      }
    }).catch(error => {
      this.setProperties({
        postError: extractError(error),
        posting: false
      });
    });
  },

  openComposer() {
    const controller = getOwner(this).lookup('controller:composer');
    const currentType = this.get('currentType');

    let addProperties = JSON.parse(JSON.stringify(this.get('customProperties')));

    addProperties['title'] = this.get('title');
    addProperties['reply'] = this.get('body');
    addProperties['tags'] = this.get('tags');
    addProperties['focusTarget'] = 'reply';
    addProperties['subtype'] = currentType;

    if (currentType === 'content') {
      addProperties['featuredLink'] = this.get('featuredLink');
    }

    const properties = {
      categoryId: this.get('category.id'),
      action: 'createTopic',
      draftKey: 'new_topic',
      draftSequence: this.get('draftSequence'),
      addProperties
    };

    controller.open(properties).then(() => {
      controller.set('focusTarget', '');
      Ember.run.scheduleOnce('afterRender', () => {
        $('#reply-control .d-editor-input').focus();
      });
    });

    this.resetAll();
  },

  componentExists(componentName) {
    const component = getOwner(this).lookup(`component:inline-component-${componentName}`);
    return Boolean(component);
  },

  @computed('component')
  componentName(component) {
    return component ? component.split('inline-component-')[1] : null;
  },

  addComponent(params) {
    const component = params.name;
    let step = params.step;

    const current = this.get('component');
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

  clear() {
    const draftSequence = this.get('draftSequence');

    Draft.clear('new_topic', draftSequence);

    this.setProperties({
      rawTitle: '',
      body: '',
      featuredLink: '',
      currentType: 'general'
    });

    this.setup();
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
      this.resetDisplay();

      let step = this.get('step');
      if (step == null) {
        step = 1;
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

    disableNext() {
      this.set('componentDisabledNext', true);
    },

    showAddMessage() {
      this.set('componentShowAddMessage', true);
    },

    addMessage() {
      this.addComponent({ name: 'editor' });
      this.next();
    },

    openComposer() {
      this.openComposer();
    },

    post() {
      this.post();
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

    clear() {
      this.clear();
    },

    next() {
      this.next();
    },

    setTypingTime(time) {
      this.set('typingTime', time);
    },

    changeType(type) {
      this.set('currentType', type);
    },

    addTextToBody(url) {
      this.addTextToBody(url);
    },

    resetDisplay() {
      this.resetDisplay();
    },

    titleChanged(opts) {
      this.set('title', opts.title);

      let props = {};

      if (opts.titleValid !== undefined) {
        props['titleValid'] = opts.titleValid;
        props['showContent'] = opts.titleValid;
      }

      if (opts.displayPreview !== undefined) {
        props['displayPreview'] = opts.displayPreview;
      }

      if (opts.currentType !== undefined) {
        props['currentType'] = opts.currentType;
      }

      this.setProperties(props);
    }
  }
});
