package com.abhishekojha.kurakanimonolith.common.config;

import com.abhishekojha.kurakanimonolith.common.redis.RedisSubscriber;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@RequiredArgsConstructor
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer listenerContainer(
            RedisConnectionFactory factory,
            MessageListenerAdapter listenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // Chat rooms
        container.addMessageListener(listenerAdapter, new PatternTopic("chat.group.*"));
        // Direct messages
        container.addMessageListener(listenerAdapter, new PatternTopic("chat.dm.*"));
        // Typing events
        container.addMessageListener(listenerAdapter, new PatternTopic("chat.typing.*"));
        // Reactions
        container.addMessageListener(listenerAdapter, new PatternTopic("chat.reaction.*"));
        // Friend requests
        container.addMessageListener(listenerAdapter, new PatternTopic("friend.request.*"));
        // Notifications
        container.addMessageListener(listenerAdapter, new PatternTopic("notification.*"));
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(RedisSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "onMessage");
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Build ObjectMapper with Java 8 date/time support
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());                    // ← fix
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); // ← ISO string format\

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        // Key serializer
        template.setKeySerializer(serializer);
        template.setHashKeySerializer(serializer);

        // Value serializer
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }

}
