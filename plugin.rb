# name: civically-composer-addons
# about: Additional functionality to the Discourse composer
# version: 0.1
# authors: Angus McLeod
# url: https://github.com/civicallyhq/civically-composer-addons

register_asset 'stylesheets/common/composer-addons.scss'
register_asset 'stylesheets/mobile/composer-addons.scss', :mobile

after_initialize do
  add_to_serializer(:basic_category, :topic_types) { object.topic_types }

  require_dependency 'topic_subtype'
  class ::TopicSubtype
    def initialize(id, options)
      super
      added_types = SiteSetting.compose_topic_types.split('|') +
                    SiteSetting.compose_restricted_topic_types.split('|')
      added_types.each do |type|
        define_method "self.#{type}" do
          type
        end
        register type
      end
    end
  end

  require_dependency 'topic_view_serializer'
  class ::TopicViewSerializer
    attributes_from_topic :subtype
  end

  require_dependency 'category'
  class ::Category
    def topic_types
      if self.custom_fields['topic_types']
        [*self.custom_fields['topic_types']]
      else
        []
      end
    end
  end

  PostRevisor.track_topic_field(:subtype)

  DiscourseEvent.on(:post_created) do |post, opts, user|
    if post.is_first_post? && subtype = opts[:subtype]
      topic = Topic.find(post.topic_id)
      topic.subtype = subtype
      topic.save!
    end
  end

  module GuardianTopicTypeExtension
    def can_create_post?(parent)
      return false unless super(parent)
      return true if is_staff? || !parent

      type = parent[:subtype]
      type_trust_setting = "compose_#{type}_min_trust".freeze

      if SiteSetting.respond_to?(type_trust_setting)
        @user.has_trust_level?(TrustLevel[SiteSetting.send(type_trust_setting)])
      else
        true
      end
    end

    def can_create_topic?(parent)
      return false unless super(parent)
      return true if is_staff? || !parent

      return false if SiteSetting.compose_restricted_topic_types.split('|').include?(parent.subtype)

      ## meta categories are restricted to specific topic types
      parent.category.topic_types.include?(parent.subtype) if parent.category.meta

      true
    end
  end

  require_dependency 'guardian'
  class ::Guardian
    prepend GuardianTopicTypeExtension
  end
end
