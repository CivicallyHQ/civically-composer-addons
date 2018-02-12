import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const appController = getOwner(this).lookup('controller:application');
    const discoveryController = getOwner(this).lookup('controller:discovery');

    component.setProperties({
      userPlace: appController.get('userPlace'),
      showTitleComposer: discoveryController.get('showTitleComposer')
    });

    appController.addObserver('userPlace', () => {
      if (this._state === 'destroying') return;
      component.set('userPlace', appController.get('userPlace'));
    });

    discoveryController.addObserver('showTitleComposer', () => {
      if (this._state === 'destroying') return;
      component.set('showTitleComposer', discoveryController.get('showTitleComposer'));
    });

    // title-composer element has to appear after
    // election-banner-discovery (Discourse Elections) for styles to work
    Ember.run.scheduleOnce('afterRender', () => {
      const $titleComposer = $('.discovery-title-composer');
      const $container = $titleComposer.parent();
      $titleComposer.appendTo($container);
    });
  },
};
