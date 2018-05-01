export default {
  setupComponent(attrs, component) {
    if (!attrs.category.custom_fields) {
      attrs.category.custom_fields = {};
    }

    if (typeof attrs.category.custom_fields.topic_types !== 'string') {
      attrs.category.custom_fields['topic_types'] = '';
    }

    const siteTypes = Discourse.SiteSettings.compose_topic_types.split('|');
    component.set('choices', siteTypes);
  }
};
