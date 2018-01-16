export default {
  setupComponent(attrs, component) {
    const siteTypes = Discourse.SiteSettings.composer_topic_types;
    const category = attrs.model.get('category');
    const types = category && category.topic_types ? category.topic_types.split('|') : siteTypes.split('|');

    let topicTypes = [];
    types.forEach((type) => {
      topicTypes.push({
        value: type,
        name: I18n.t(`topic.type.${type}.label`)
      });
    });

    component.set('topicTypes', topicTypes);
  }
};
