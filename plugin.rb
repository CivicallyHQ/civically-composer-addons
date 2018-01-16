# name: civically-composer-addons
# about: Additional functionality to the Discourse composer
# version: 0.1
# authors: Angus McLeod
# url: https://github.com/civicallyhq/civically-composer-addons

register_asset 'stylesheets/common/composer-addons.scss'
register_asset 'stylesheets/mobile/composer-addons.scss', :mobile

after_initialize do
  add_to_serializer(:basic_category, :topic_types) { object.custom_fields['topic_types'] }

  require_dependency 'topic_subtype'
  class ::TopicSubtype
    def initialize(id, options)
      super
      SiteSetting.topic_types.each do |type|
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

  PostRevisor.track_topic_field(:topic_type)

  DiscourseEvent.on(:post_created) do |post, opts, user|
    topic_type = opts[:topic_type]
    if post.is_first_post? && topic_type
      topic = Topic.find(post.topic_id)
      topic.subtype = topic_type
      topic.save!
    end
  end
end
