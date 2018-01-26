import { default as computed, observes, on } from 'ember-addons/ember-computed-decorators';
import { getOwner } from 'discourse-common/lib/get-owner';

export default Ember.Component.extend({
  classNameBindings: [':title-composer', 'showLength:show-length', 'cantPostClass', 'showResults:has-similar-titles'],
  inputDisabled: Ember.computed.bool('cantPost'),
  placeholder: I18n.t('composer.title_or_link_placeholder'),
  hasTopTip: Ember.computed.notEmpty('topTip'),
  hasBottomTip: Ember.computed.notEmpty('bottomTip'),
  showRightInput: Ember.computed.or('showLength', 'searching'),
  showNext: Ember.computed.not('cantPost'),
  component: null,
  showLength: false,
  step: 0,
  composerProperties: {},
  bottomTip: 'composer.tip.title',
  componentReady: true,
  _titleLength: 0,

  @computed('rawTitle')
  title(rawTitle) {
    return rawTitle ? rawTitle.trim() : '';
  },

  @computed('category', 'userPlace')
  cantPost(category, userPlace) {
    const user = this.get('currentUser');

    if (user && user.admin) return false;
    if (!category) return true;
    if (category.meta && !category.permission) return true;
    if (category.meta) return false;
    if (!userPlace) return 'no_place';

    const foreignPlace = this.get('foreignPlace');
    if (foreignPlace) return foreignPlace;

    if (userPlace.category.id === category.id &&
        !userPlace.category.moderators) return 'moderator_place';

    if (category.place_country &&
        !category.place_country_active) return 'country_active';

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
    $('.discovery-title-composer').toggleClass('hide-input', Boolean(cantPostClass === 'hide-input'));
  },

  @on('init')
  @observes('cantPost')
  showCantPostTip() {
    const cantPost = this.get('cantPost');
    if (typeof cantPost === 'string' && cantPost !== true) {
      this.setProperties({
        'bottomTip': `composer.tip.cant_post_${cantPost}`,
        'showContent': true
      });
    } else {
      this.setProperties({
        'bottomTip': '',
        'showContent': false
      });
    }
  },

  @computed('category', 'userPlace')
  foreignPlace(category, userPlace) {
    if (!userPlace || !category) return false;

    if (category.place_country) {
      if (category.id !== userPlace.category.parent_category_id) {
        return 'foreign_country';
      };
    } else {
      if (category.id !== userPlace.category.id)  {
        return 'foreign_place';
      }
    }
    return false;
  },

  @computed('userPlace', 'category')
  showInput(userPlace, category) {
    const user = this.get('currentUser');
    if (user && user.admin) return true;
    return category &&
      ((userPlace && userPlace.category.id === category.id) ||
       (category.meta && category.permission));
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

  @computed
  components() {
    return this.siteSettings.composer_title_components.split('|');
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

    const titleValid = this.get('titleValid');

    if (titleValid) {
      this.clearInitialState();
      this.set('searching', true);
    } else {
      const step = this.get('step');
      if (step !== 0) {
        this.back(0).then(() => {
          this.revertToInitialState();
        });
      } else {
        this.revertToInitialState();
      }
    }
  },

  revertToInitialState() {
    const initialState = this.get('initialState');
    if (!initialState) {
      this.setProperties({
        componentReady: true,
        topTip: '',
        bottomTip: 'composer.tip.title',
        showResults: false,
        initialState: true,
        searching: false,
        identicalTitle: false
      });
    }
  },

  clearInitialState() {
    const initialState = this.get('initialState');
    if (initialState) {
      this.setProperties({
        initialState: false,
        bottomTip: ''
      });
    }
  },

  @computed('component', 'titleValid', 'identicalTitle')
  showComponent(component, titleValid, identicalTitle) {
    return component && titleValid && !identicalTitle;
  },

  @computed('titleValid', 'componentReady', 'identicalTitle', 'searching')
  nextDisabled(titleValid, componentReady, identicalTitle, searching) {
    return !titleValid || !componentReady || identicalTitle || searching;
  },

  keyDown(e) {
    if (e.keyCode === 13) this.send('next');
  },

  openComposer() {
    const controller = getOwner(this).lookup('controller:composer');
    const draftSequence = controller.get('model.draft_sequence');
    let addProperties = this.get('composerProperties');
    addProperties['title'] = this.get('title');
    addProperties['focusTarget'] = 'reply';

    controller.open({
      categoryId: this.get('category.id'),
      action: 'createTopic',
      draftKey: 'new_topic',
      draftSequence,
      addProperties
    }).then(() => {
      controller.set('focusTarget', '');
      Ember.run.scheduleOnce('afterRender', () => {
        $('#reply-control .d-editor-input').focus();
      });
    });

    this.resetProperties();
  },

  resetProperties() {
    this.setProperties({
      component: null,
      showLength: false,
      showResults: false,
      step: 0,
      rawTitle: ''
    });
  },

  resetDisplay() {
    this.setProperties({
      componentReady: false,
      component: null,
      showResults: false,
      bottomTip: '',
      topTip: ''
    });
  },

  back(backTo = null) {
    return new Ember.RSVP.Promise(resolve => {
      this.resetDisplay();

      let step;
      if (backTo) {
        step = backTo;
      } else {
        step = this.get('step');
        if (this.get('isConditionalStep')) {
          this.set('isConditionalStep', false);
        } else {
          step--;
        }
      }

      const components = this.get('components');
      const index = Math.max(0, step - 1);
      let component = null;

      const componentName = components[index];
      component = "title-component-" + componentName;

      this.setProperties({
        component,
        step,
        nextTarget: null
      });

      resolve();
    });
  },

  next() {
    return new Ember.RSVP.Promise(resolve => {
      if (this.get('nextDisabled')) return;
      this.resetDisplay();

      const nextTarget = this.get('nextTarget');
      if (nextTarget) {
        this.setProperties({
          component: 'title-component-' + nextTarget,
          nextTarget: null,
          isConditionalStep: true
        });
        return;
      }

      const components = this.get('components');
      let step = this.get('step');
      if (step === components.length || components.length < 1) {
        return this.openComposer();
      } else if (step == null) {
        step = 0;
      } else {
        step++;
      }

      const componentName = components[step - 1];
      const component = getOwner(this).lookup(`component:title-component-${componentName}`);
      if (!component) {
        return this.openComposer();
      }

      this.setProperties({
        component: 'title-component-' + componentName,
        step,
        nextTarget: null
      });

      resolve();
    });
  },

  updateTip(tip, location) {
    this.set(`${location}Tip`, tip);
  },

  actions: {
    setNextTarget(target) {
      this.set('nextTarget', target);
    },

    addComposerProperty(key, value) {
      let props = this.get('composerProperties');
      props[key] = value;
      this.set("composerProperties", props);
    },

    updateTip(tip, location) {
      this.updateTip(tip, location);
    },

    ready() {
      this.set('componentReady', true);
    },

    back() {
      this.back();
    },

    next() {
      this.next();
    },

    afterTitleSearch(result) {
      if (result.filter(t => t.identical).length > 0) {
        this.updateTip('composer.tip.identical_title', 'top');
        this.setProperties({
          identicalTitle: true,
          showResults: true
        });
      } else {
        this.set('identicalTitle', false);

        const showComponent = this.get('showComponent');
        const initialState = this.get('initialState');
        if (!showComponent && !initialState) {
          if (result.length < 1) {
            this.updateTip('', 'top');
            this.updateTip('', 'bottom');
          } else {
            if (result.length === 1) {
              this.updateTip('composer.tip.similar_titles_top_singular', 'top');
              this.updateTip('composer.tip.similar_titles_bottom_singular', 'bottom');
            } else {
              this.updateTip('composer.tip.similar_titles_top_plural', 'top');
              this.updateTip('composer.tip.similar_titles_bottom_plural', 'bottom');
            }
            this.set('showResults', true);
          }
        }
      }

      this.set('searching', false);
    }
  }
});
