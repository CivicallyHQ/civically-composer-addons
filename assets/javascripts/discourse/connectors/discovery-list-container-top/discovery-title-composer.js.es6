import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const controller = getOwner(this).lookup('controller:discovery');

    const updateProps = () => {
      component.setProperties({
        showTitleComposer: controller.get('showTitleComposer')
      });
    }

    updateProps();

    controller.addObserver('showTitleComposer', () => {
      if (this._state === 'destroying') return;

      updateProps();
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
