package com.abhishekojha.kurakanimonolith.modules.message.repository;

import com.abhishekojha.kurakanimonolith.modules.message.model.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {
    Optional<MessageReaction> findByMessageIdAndUserId(Long messageId, Long userId);
    List<MessageReaction> findByMessageIdIn(List<Long> messageIds);
}
