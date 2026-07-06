package com.abhishekojha.kurakanimonolith.modules.friendRequest.repository;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.Friendship;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestStatus;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendShipRepository extends JpaRepository<Friendship, Long> {

    List<Friendship> findByRequester(User requester);

    List<Friendship> findByRecipient(User recipient);

    Friendship findByRequesterAndRecipient(User requester, User recipient);

    List<Friendship> findByRequesterOrRecipientAndStatus(User requester, User recipient, FriendRequestStatus status);
}
