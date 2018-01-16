import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  setupComponent(attrs, component) {
    const controller = getOwner(this).lookup('controller:application');
    component.set('userPlace', controller.get('userPlace'));
    controller.addObserver('userPlace', () => {
      if (this._state === 'destroying') return;
      component.set('userPlace', controller.get('userPlace'));
    });
  },
};
