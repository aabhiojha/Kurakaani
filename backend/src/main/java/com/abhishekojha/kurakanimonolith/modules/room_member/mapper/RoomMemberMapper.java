package com.abhishekojha.kurakanimonolith.modules.room_member.mapper;

import com.abhishekojha.kurakanimonolith.modules.room.dto.RoomDto;
import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.room_member.dto.RoomMemberDto;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RoomMemberMapper {

    @Mapping(source = "room", target="roomId")
    @Mapping(source = "user", target="userId")
    @Mapping(source = "user", target = "username", qualifiedByName = "mapToUsername")
    @Mapping(source = "user", target = "profileImageUrl",qualifiedByName = "mapToProfileImageUrl")
    RoomMemberDto toDto(RoomMember room);

    List<RoomMemberDto> toDto(List<RoomMember> rooms);

    default Long mapRoomToRoomId(Room room){
        return room.getId();
    }

    default Long mapUserToUserId(User user){
        return user.getId();
    }

    @Named("mapToUsername")
    default String mapUserToUserName(User user){
        return user.getUsername();
    }

    @Named("mapToProfileImageUrl")
    default String mapUserToProfileImageUrl(User user){
        return user.getProfileImageUrl();
    }

}
