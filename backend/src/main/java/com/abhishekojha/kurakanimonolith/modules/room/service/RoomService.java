package com.abhishekojha.kurakanimonolith.modules.room.service;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.*;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RoomListDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.RoomMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room_member.dto.RoomMemberDto;

import java.util.List;

public interface RoomService {
    List<RoomMemberDto> getAllMembers(Long roomId);

    RoomDto createRoomGroup(CreateRoomRequestDto createRoomRequestDto);

    RoomDto createRoomDm(Long userId);

    RoomDto dmToRoom(Long roomId, AddUsersToRoomDto addUsersToRoomDto);

    RoomDto updateGroup(Long roomId, UpdateRoomDetails updateRoomDetails);

    List<RoomListDto> getRooms();

    List<RoomMessageDto> getAllMessagesForRoom(Long roomId);

    void addUserToRoomGroup(AddUsersToRoomDto addUsersToRoomDto,Long room_id);

    void removeUserFromRoom(RemoveMembersDto removeMembersDto, Long room_id);

    void deleteRoom();

    List<FriendsDto> getAllAddableFriends(Long roomId);
}
