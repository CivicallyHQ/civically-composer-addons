import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const controller = getOwner(this).lookup('controller:application');
    component.set('userPlace', controller.get('userPlace'));
    controller.addObserver('userPlace', () => {
      if (this._state === 'destroying') return;
      component.set('userPlace', controller.get('userPlace'));
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
