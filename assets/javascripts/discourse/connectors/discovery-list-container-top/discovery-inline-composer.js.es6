import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const controller = getOwner(this).lookup('controller:discovery');

    const updateProps = () => {
      component.setProperties({
        showInlineComposer: controller.get('showInlineComposer')
      });
    }

    updateProps();

    controller.addObserver('showInlineComposer', () => {
      if (this._state === 'destroying') return;

      updateProps();
    });

    // inline-composer element has to appear after
    // election-banner-discovery (Discourse Elections) for styles to work
    Ember.run.scheduleOnce('afterRender', () => {
      const $inlineComposer = $('.discovery-inline-composer');
      const $container = $inlineComposer.parent();
      $inlineComposer.appendTo($container);
    });
  },
};
