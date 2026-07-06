package com.abhishekojha.kurakanimonolith.modules.friendRequest.service;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendShipDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestResponse;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;

import java.util.List;

public interface FriendRequestService {
    void sendFriendRequest(Long userId);
    void respondToFriendRequest(Long userId, FriendRequestResponse response);
    void cancelFriendRequest(Long userId);
    void unfriend(Long userId);
    List<FriendShipDto> getSentRequests();
    List<FriendShipDto> getIncomingRequests();
    List<FriendsDto> getFriends();
}
