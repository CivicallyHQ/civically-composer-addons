const statuses = [
  { badge: 'Resident', badgeId: 1 },
  { badge: 'Citizen', badgeId: 2 },
  { badge: 'Local', badgeId: 3 },
  { badge: 'Leader', badgeId: 4 }
]

const statusForType = function(type) {
  return statuses[Discourse.SiteSettings[`compose_${type}_min_trust`]];
}

const statusLink = function(status) {
  let badgeLink = `/badges/${status.badgeId}/${status.badge}`;
  return `<a href='${badgeLink}' target='_blank'>${status.badge}</a>`;
}

const topicTypes = function(category = null) {
  const siteTypes = Discourse.SiteSettings.compose_topic_types.split('|');

  if (category) {
    if (category.is_place) {
      return siteTypes;
    } else {
      return category.topic_types;
    }
  } else {
    return siteTypes;
  }
}

const canPostType = function(user, type, category = null) {
  if (user.admin) return true;

  if (category) {
    if (category.is_place) {
      return user.trust_level >= Discourse.SiteSettings[`compose_${type}_min_trust`];
    } else {
      return category.topic_types.indexOf(type) > -1;
    }
  } else {
    return Discourse.SiteSettings.compose_topic_types.split('|').indexOf(type) > -1;
  }
}

const allowedTypes = function(user, category) {
  return topicTypes(category).reduce((types, t) => {
    if (canPostType(user, t, category)) {
      types.push(t);
    }
    return types;
  }, []);
}

const typeText = function(type, text, opts = {}) {
  let nameKey = `topic.type.${type.underscore()}.${text}`;
  let args = {};

  const category = opts.category;
  if (category) {
    if (category.meta) {
      nameKey = `${category.slug.underscore()}.${nameKey}`;
    }
    if (category.is_place) {
      if (text === 'description') nameKey += '_place';
      args['placeName'] = category.place_name;
    }
  }

  if (opts.keyOnly) return nameKey;

  let result = I18n.t(nameKey, args);

  if (opts.lowercase) {
    result = result.toLowerCase();
  }

  return result;
}

export { statuses, statusForType, statusLink, topicTypes, canPostType, allowedTypes, typeText };
