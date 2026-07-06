package com.abhishekojha.kurakanimonolith.modules.room.service;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.BadRequestException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.DuplicateResourceException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.UnauthorizedException;
import com.abhishekojha.kurakanimonolith.common.objectStorage.S3Operations;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.service.FriendRequestService;
import com.abhishekojha.kurakanimonolith.modules.message.model.MessageType;
import com.abhishekojha.kurakanimonolith.common.security.SecurityUtils;
import com.abhishekojha.kurakanimonolith.modules.room.dto.*;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RecentMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RoomListDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.RoomMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.mapper.RoomMapper;
import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import com.abhishekojha.kurakanimonolith.modules.room.repository.RoomRepository;
import com.abhishekojha.kurakanimonolith.modules.room_member.dto.RoomMemberDto;
import com.abhishekojha.kurakanimonolith.modules.room_member.mapper.RoomMemberMapper;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomRole;
import com.abhishekojha.kurakanimonolith.modules.room_member.repository.RoomMemberRepository;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import com.abhishekojha.kurakanimonolith.modules.user.repository.UserRepository;
import com.abhishekojha.kurakanimonolith.modules.message.repository.MessageReactionRepository;
import com.abhishekojha.kurakanimonolith.modules.message.model.MessageReaction;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.ReactionDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomMapper roomMapper;
    private final SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final RoomMemberMapper roomMemberMapper;
    private final S3Operations s3Operations;
    private final FriendRequestService friendRequestService;
    private final MessageReactionRepository messageReactionRepository;

    @Override
    @Transactional
    public List<RoomMemberDto> getAllMembers(Long roomId) {
        log.debug("event=get_all_members_attempt roomId={}", roomId);
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Room not found");
        }

        // Single query with the member's user join-fetched (no per-member N+1).
        List<RoomMemberDto> members = roomMemberMapper.toDto(roomMemberRepository.findByRoomId(roomId));
        log.info("event=get_all_members_done roomId={} count={}", roomId, members.size());
        return members;
    }

    @Override
    @Transactional
    public RoomDto createRoomGroup(CreateRoomRequestDto createRoomRequestDto) {
        User user = securityUtils.getRequestUser();
        log.debug("event=create_group_room_attempt userId={} roomName={}", user.getId(), createRoomRequestDto.getName());

        if (user == null) {
            throw new UnauthorizedException("The user not authenticated.");
        }

        List<Room> roomList = roomRepository.findByCreatedByAndNameIgnoreCase(user.getId(), createRoomRequestDto.getName());
        if (!roomList.isEmpty()) {
            log.warn("event=create_group_room_rejected reason=duplicate_name userId={} roomName={}", user.getId(), createRoomRequestDto.getName());
            throw new DuplicateResourceException("The room with name '%s' already exists".formatted(createRoomRequestDto.getName()));
        }

        Room room = new Room();
        room.setName(createRoomRequestDto.getName());
        room.setDescription(createRoomRequestDto.getDescription());
        room.setType(createRoomRequestDto.getType());
        room.setCreatedBy(user);

        Room savedRoom = roomRepository.save(room);
        log.info("event=group_room_created roomId={} roomName={} userId={}", savedRoom.getId(), savedRoom.getName(), user.getId());

        RoomMember roomMember = RoomMember.builder()
                .room(savedRoom)
                .user(user)
                .roomRole(RoomRole.ADMIN)
                .joinedAt(LocalDateTime.now()).build();

        roomMemberRepository.save(roomMember);
        log.debug("event=room_admin_assigned roomId={} userId={}", savedRoom.getId(), user.getId());

        savedRoom.setMembers(List.of(roomMember));
        return roomMapper.toDto(savedRoom);
    }

    @Override
    @Transactional
    public RoomDto createRoomDm(Long userId) {
        User user1 = securityUtils.getRequestUser();
        log.debug("event=create_dm_attempt requesterId={} targetUserId={}", user1.getId(), userId);

        User user2 = userRepository.findById(userId).orElseThrow(
                () -> new ResourceNotFoundException("User not found")
        );

        Optional<Room> existingDm = roomRepository.findExistingDm(user1.getId(), user2.getId());
        if (existingDm.isPresent()) {
            log.info("event=create_dm_skipped reason=already_exists roomId={} user1Id={} user2Id={}", existingDm.get().getId(), user1.getId(), user2.getId());
            RoomDto dto = roomMapper.toDto(existingDm.get());
            dto.setName(user2.getUsername());
            return dto;
        }

        Room room = new Room();
        room.setType(RoomType.DM);
        room.setCreatedBy(user1);
        room.setName("dm_" + Math.min(user1.getId(), user2.getId()) + "_"
                + Math.max(user1.getId(), user2.getId()));

        Room savedRoom = roomRepository.save(room);
        log.info("event=dm_room_created roomId={} user1Id={} user2Id={}", savedRoom.getId(), user1.getId(), user2.getId());

        RoomMember member1 = RoomMember.builder()
                .room(savedRoom).user(user1).roomRole(RoomRole.MEMBER).joinedAt(LocalDateTime.now()).build();

        RoomMember member2 = RoomMember.builder()
                .room(savedRoom).user(user2).roomRole(RoomRole.MEMBER).joinedAt(LocalDateTime.now()).build();

        List<RoomMember> members = roomMemberRepository.saveAll(List.of(member1, member2));
        savedRoom.setMembers(members);

        return roomMapper.toDto(savedRoom);
    }

    @Override
    @Transactional
    public RoomDto dmToRoom(Long roomId, AddUsersToRoomDto addUsersToRoomDto) {
        // get request user
        User user = securityUtils.getRequestUser();

        List<Long> userIds = addUsersToRoomDto.getUserIds();

        // find the room
        Room room = roomRepository.findById(roomId).orElseThrow(
                () -> new ResourceNotFoundException("Room not found with id: " + roomId));

        // get existing DM members
        List<RoomMember> existingDmMembers = roomMemberRepository.findByRoom(room);

        log.debug("event=dm_to_group_attempt roomId={} userId={} newUserCount={}", roomId, user.getId(), userIds.size());

        if (room.getType().equals(RoomType.DM) && !userIds.isEmpty()) {

            // check if the users actually exist
            List<User> newUsers = userRepository.findAllById(userIds);

            // all the user ids from db
            List<Long> fetchedUserIds = newUsers.stream()
                    .map(User::getId)
                    .toList();

            // missing entries in db
            List<Long> missingUserIds = userIds.stream()
                    .filter(id -> !fetchedUserIds.contains(id))
                    .toList();

            // check if there are any users that do not exist in the db
            if (!missingUserIds.isEmpty()) {
                log.warn("event=dm_to_group_rejected reason=users_not_found missingIds={}", missingUserIds);
                throw new ResourceNotFoundException("User with id '%s' not found".formatted(missingUserIds));
            }

            // merge existing DM member IDs + new user IDs, deduplicated
            List<Long> allUserIds = Stream.concat(
                    existingDmMembers.stream().map(rm -> rm.getUser().getId()),
                    userIds.stream()
            ).distinct().toList();

            // fetch all users at once
            List<User> allUsers = userRepository.findAllById(allUserIds);

            // use fetchedUserIds to create RoomMember entry and
            // create a new room with all the members including that of dm
            Room savedRoom = roomRepository.save(
                    Room.builder().name("Group from " + room.getName())
                            .type(RoomType.GROUP)
                            .createdBy(user)
                            .build()
            );

            log.info("event=group_room_created_from_dm roomId={} sourceDmRoomId={} userId={} memberCount={}",
                    savedRoom.getId(), roomId, user.getId(), allUsers.size());

//          create a new room member entry for each user
            List<RoomMember> allRoomMembers = allUsers.stream()
                    .map(u ->
                            RoomMember.builder()
                                    .room(savedRoom)
                                    .user(u)
                                    .roomRole(u.getId().equals(user.getId()) ? RoomRole.ADMIN : RoomRole.MEMBER)
                                    .joinedAt(LocalDateTime.now())
                                    .build())
                    .collect(Collectors.toList());
            roomMemberRepository.saveAll(allRoomMembers);

            savedRoom.setMembers(allRoomMembers);
            return roomMapper.toDto(savedRoom);
        } else {
            log.warn("event=dm_to_group_rejected reason=not_dm_or_empty_users roomId={} userId={}", roomId, user.getId());
            throw new BadRequestException("Room is not a DM or no users provided.");
        }

    }

    @Override
    @Transactional
    public RoomDto updateGroup(Long roomId, UpdateRoomDetails updateRoomDetails) {
        log.debug("event=update_group_attempt roomId={}", roomId);
        // check if the room exists
        Room room = roomRepository.findById(roomId).orElseThrow(
                () -> new ResourceNotFoundException("The room with id:" + roomId));

        if (updateRoomDetails.getName() != null && !updateRoomDetails.getName().isEmpty()) {
            room.setName(updateRoomDetails.getName());
            log.debug("event=update_group_name roomId={} newName={}", roomId, updateRoomDetails.getName());
        }

        if (updateRoomDetails.getDescription() != null && !updateRoomDetails.getDescription().isEmpty()) {
            room.setDescription(updateRoomDetails.getDescription());
            log.debug("event=update_group_description roomId={}", roomId);
        }

        if (updateRoomDetails.getUserId() != null) {
            List<Long> userId = updateRoomDetails.getUserId();
            addUserToRoomGroup(AddUsersToRoomDto.builder()
                    .userIds(userId).build(), roomId
            );
        }
        log.info("event=update_group_success roomId={}", roomId);
        return roomMapper.toDto(room);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomListDto> getRooms() {
        User user = securityUtils.getRequestUser();
        log.debug("event=get_rooms_attempt userId={}", user.getId());
        List<RoomListDto> rooms = roomRepository.findRoomsForUser(user.getId());

        List<Long> roomIds = rooms.stream()
                .map(RoomListDto::getId)
                .toList();

        Map<Long, RecentMessageDto> recentMessagesByRoomId = roomRepository.getRecentMessagesForRooms(roomIds)
                .stream()
                .collect(Collectors.toMap(recentMessageDto -> recentMessageDto.getRoomId(), msg -> msg));

        rooms.forEach(
                room -> {
                    RecentMessageDto recentMessage = recentMessagesByRoomId.get(room.getId());
                    if (recentMessage != null
                            && (recentMessage.getContent() == null || recentMessage.getContent().isBlank())
                            && recentMessage.getMessageType() != null
                            && recentMessage.getMessageType() != MessageType.TEXT) {
                        recentMessage.setContent(recentMessage.getMessageType() == MessageType.IMAGE ? "Sent an image" : "Sent a video");
                    }
                    room.setRecentMessage(recentMessage);
                });

        log.info("event=get_rooms_done userId={} count={}", user.getId(), rooms.size());
        return rooms;
    }

    @Override
    public List<RoomMessageDto> getAllMessagesForRoom(Long roomId) {
        log.debug("event=get_messages_for_room_attempt roomId={}", roomId);
        
        List<RoomMessageDto> messages = roomRepository.getMessagesForRoom(roomId);
        if (messages.isEmpty()) {
            return messages;
        }
        
        List<Long> messageIds = messages.stream().map(RoomMessageDto::getId).collect(Collectors.toList());
        List<MessageReaction> reactions = messageReactionRepository.findByMessageIdIn(messageIds);
        
        Map<Long, List<ReactionDto>> reactionsByMessage = reactions.stream()
            .collect(Collectors.groupingBy(
                r -> r.getMessage().getId(),
                Collectors.mapping(r -> new ReactionDto(r.getEmoji(), r.getUser().getId(), r.getUser().getUsername()), Collectors.toList())
            ));
            
        return messages.stream()
                .peek(message -> {
                    if (message.getUserInfo() != null) {
                        message.getUserInfo().setProfileImageUrl(
                                s3Operations.getProfileImageAccessUrl(message.getUserInfo().getProfileImageUrl())
                        );
                    }
                    message.setMediaUrl(s3Operations.getMediaAccessUrl(message.getMediaUrl()));
                    message.setReactions(reactionsByMessage.getOrDefault(message.getId(), new ArrayList<>()));
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void addUserToRoomGroup(AddUsersToRoomDto request, Long roomId) {
        List<Long> userIds = request.getUserIds();
        log.debug("event=add_users_to_group_attempt roomId={} userCount={}", roomId, userIds.size());

        // check if the room exists
        Room room = roomRepository.findById(roomId).orElseThrow(
                () -> new ResourceNotFoundException("Room not found"));

        if (userIds.isEmpty()) {
            log.warn("event=add_users_to_group_rejected reason=empty_user_list roomId={}", roomId);
            throw new BadRequestException("The list of users is empty.");
        }

        // check if the users actually exist
        List<User> usersList = userRepository.findAllById(userIds);
        log.debug("event=add_users_to_group_users_fetched roomId={} fetchedCount={}", roomId, usersList.size());

        // all the user ids from db
        List<Long> fetchedUserIds = usersList.stream()
                .map(User::getId)
                .toList();

        // missing entries in db
        List<Long> missingUserIds = userIds.stream()
                .filter(id -> !fetchedUserIds.contains(id))
                .toList();

        // check if there are any users that do not exist in the db
        if (!missingUserIds.isEmpty()) {
            log.warn("event=add_users_to_group_rejected reason=users_not_found roomId={} missingIds={}", roomId, missingUserIds);
            throw new ResourceNotFoundException("User with id '%s' not found".formatted(missingUserIds));
        }

        List<RoomMember> newMembers = usersList.stream()
                .map(user -> RoomMember.builder()
                        .room(room)
                        .user(user)
                        .roomRole(RoomRole.MEMBER)
                        .joinedAt(LocalDateTime.now())
                        .build())
                .toList();
        log.debug("event=add_users_to_group_members_built roomId={} count={}", roomId, newMembers.size());

        List<RoomMember> roomMembers = roomMemberRepository.saveAll(newMembers);
        log.info("event=add_users_to_group_success roomId={} addedCount={}", roomId, roomMembers.size());
    }

    @Override
    @Transactional
    public void removeUserFromRoom(RemoveMembersDto request, Long roomId) {
        List<Long> deleteIds = request.getMembersId();
        log.debug("event=remove_users_from_room_attempt roomId={} memberCount={}", roomId, deleteIds.size());
        // check if the users actually exist
        roomRepository.deleteAllById(deleteIds);
        log.info("event=remove_users_from_room_success roomId={} removedCount={}", roomId, deleteIds.size());
    }

    @Override
    @Transactional
    public void deleteRoom() {

    }

    @Override
    @Transactional
    public List<FriendsDto> getAllAddableFriends(Long roomId) {
        log.debug("event=get_addable_friends_attempt roomId={}", roomId);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found, id: " + roomId));

        securityUtils.getRequestUser(); // still validates auth

        List<FriendsDto> friends = friendRequestService.getFriends();

        // collect userIds already in the room
        Set<Long> memberUserIds = room.getMembers().stream()
                .map(member -> member.getUser().getId())
                .collect(Collectors.toSet());

        // return friends who are NOT already in the room
        List<FriendsDto> addableFriends = friends.stream()
                .filter(friend -> !memberUserIds.contains(friend.getUserId()))
                .toList();
        log.info("event=get_addable_friends_done roomId={} count={}", roomId, addableFriends.size());
        return addableFriends;
    }
}
