package com.abhishekojha.kurakanimonolith.modules.friendRequest.service;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.BadRequestException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.security.SecurityUtils;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendShipDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.mapper.FriendShipMapper;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.Friendship;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestResponse;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestStatus;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.repository.FriendShipRepository;
import com.abhishekojha.kurakanimonolith.modules.notification.enums.FriendRequestEvent;
import com.abhishekojha.kurakanimonolith.modules.notification.enums.NotificationType;
import com.abhishekojha.kurakanimonolith.modules.notification.payloads.FriendRequestPayload;
import com.abhishekojha.kurakanimonolith.modules.notification.service.NotificationService;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class FriendRequestServiceImpl implements FriendRequestService {

    private final FriendShipRepository friendShipRepository;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final FriendShipMapper friendShipMapper;

    @Override
    public void sendFriendRequest(Long userId) {
        User user = securityUtils.getRequestUser();
        log.debug("event=send_friend_request_attempt requesterId={} recipientId={}", user.getId(), userId);

        if (userId.equals(user.getId())) {
            log.warn("event=send_friend_request_rejected reason=self_request userId={}", user.getId());
            throw new BadRequestException("User cannot send friend request to themselves");
        }

        User recipient = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Friendship friendship = Friendship.builder().requester(user).status(FriendRequestStatus.PENDING).recipient(recipient).build();

        Friendship save = friendShipRepository.save(friendship);
        log.info("event=friend_request_sent friendshipId={} requesterId={} recipientId={}", save.getId(), user.getId(), recipient.getId());

        notificationService.notify(
                recipient.getUsername(),
                NotificationType.FRIEND_REQUEST,
                FriendRequestPayload.builder()
                        .requestId(String.valueOf(save.getId()))
                        .event(FriendRequestEvent.RECEIVED)
                        .senderName(user.getUsername())
                        .senderAvatar(user.getProfileImageUrl())
                        .build());
        log.debug("event=friend_request_notification_sent friendshipId={} recipientId={}", save.getId(), recipient.getId());
    }

    @Override
    public void respondToFriendRequest(Long userId, FriendRequestResponse response) {
        User responder = securityUtils.getRequestUser();
        log.debug("event=respond_friend_request_attempt responderId={} requesterId={} response={}", responder.getId(), userId, response);

        User requester = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Friendship friendship = friendShipRepository.findByRequesterAndRecipient(requester, responder);

        FriendRequestStatus newStatus = response == FriendRequestResponse.ACCEPT
                ? FriendRequestStatus.ACCEPTED
                : FriendRequestStatus.REJECTED;
        friendship.setStatus(newStatus);

        Friendship save = friendShipRepository.save(friendship);
        log.info("event=friend_request_responded friendshipId={} requesterId={} responderId={} status={}", save.getId(), requester.getId(), responder.getId(), newStatus);

        FriendRequestEvent event = response == FriendRequestResponse.ACCEPT
                ? FriendRequestEvent.ACCEPTED
                : FriendRequestEvent.DECLINED;

        notificationService.notify(requester.getUsername(), NotificationType.FRIEND_REQUEST,
                FriendRequestPayload.builder()
                        .requestId(String.valueOf(save.getId()))
                        .event(event)
                        .senderName(responder.getUsername())
                        .senderAvatar(responder.getProfileImageUrl())
                        .build());
        log.debug("event=friend_request_response_notification_sent friendshipId={} requesterId={}", save.getId(), requester.getId());
    }

    @Override
    public void cancelFriendRequest(Long userId) {
        User user = securityUtils.getRequestUser();
        log.debug("event=cancel_friend_request_attempt requesterId={} recipientId={}", user.getId(), userId);

        User recipient = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Friendship friendship = friendShipRepository.findByRequesterAndRecipient(user, recipient);
        friendShipRepository.delete(friendship);
        log.info("event=friend_request_cancelled requesterId={} recipientId={}", user.getId(), userId);
    }

    @Override
    public void unfriend(Long userId) {
        User user = securityUtils.getRequestUser();
        log.debug("event=unfriend_attempt userId={} targetUserId={}", user.getId(), userId);

        User recipient = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Friendship friendship = friendShipRepository.findByRequesterAndRecipient(user, recipient);
        friendShipRepository.delete(friendship);
        log.info("event=unfriend_success userId={} targetUserId={}", user.getId(), userId);
    }

    @Override
    @Transactional
    public List<FriendShipDto> getSentRequests() {
        User user = securityUtils.getRequestUser();
        log.debug("event=get_sent_requests_attempt userId={}", user.getId());

        List<Friendship> sentRequests = friendShipRepository.findByRequester(user).stream()
                .filter(friendship -> friendship.getStatus() == FriendRequestStatus.PENDING)
                .toList();

        log.info("event=get_sent_requests_done userId={} count={}", user.getId(), sentRequests.size());
        return friendShipMapper.toListDto(sentRequests);
    }

    @Override
    @Transactional
    public List<FriendShipDto> getIncomingRequests() {
        User user = securityUtils.getRequestUser();
        log.debug("event=get_incoming_requests_attempt userId={}", user.getId());

        List<Friendship> incomingRequests = friendShipRepository.findByRecipient(user).stream()
                .filter(friendship -> friendship.getStatus() == FriendRequestStatus.PENDING)
                .toList();

        log.info("event=get_incoming_requests_done userId={} count={}", user.getId(), incomingRequests.size());
        return friendShipMapper.toListDto(incomingRequests);
    }

    @Override
    @Transactional
    public List<FriendsDto> getFriends() {
        User user = securityUtils.getRequestUser();
        log.debug("event=get_friends_attempt userId={}", user.getId());

        List<Friendship> allFriendshipObjs = friendShipRepository.findByRequesterOrRecipientAndStatus(user, user, FriendRequestStatus.ACCEPTED);

        List<FriendsDto> allFriends = new ArrayList<>();
        // check if requester was the request user then build a new Friends dto object and append to the list
        allFriendshipObjs.stream()
                .filter(friendship -> friendship.getStatus() == FriendRequestStatus.ACCEPTED)
                .forEach(friend -> {
                    if (Objects.equals(friend.getRequester().getId(), user.getId())) {
                        allFriends.add(
                                FriendsDto.builder()
                                        .userId(friend.getRecipient().getId())
                                        .username(friend.getRecipient().getUsername())
                                        .profilePicUrl(friend.getRecipient().getProfileImageUrl())
                                        .build());
                    } else if (Objects.equals(friend.getRecipient().getId(), user.getId())) {
                        allFriends.add(
                                FriendsDto.builder()
                                        .userId(friend.getRequester().getId())
                                        .username(friend.getRequester().getUsername())
                                        .profilePicUrl(friend.getRequester().getProfileImageUrl())
                                        .build());
                    }
                });

        log.info("event=get_friends_done userId={} count={}", user.getId(), allFriends.size());
        return allFriends;
    }
}
