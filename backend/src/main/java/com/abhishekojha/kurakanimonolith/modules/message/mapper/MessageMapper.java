package com.abhishekojha.kurakanimonolith.modules.message.mapper;

import com.abhishekojha.kurakanimonolith.common.objectStorage.S3Operations;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageDto;
import com.abhishekojha.kurakanimonolith.modules.message.model.Message;
import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public abstract class MessageMapper {

    @Autowired
    protected S3Operations s3Operations;

    @Mapping(source = "sender", target = "senderId")
    @Mapping(source = "room", target = "roomId")
    @Mapping(source = "mediaKey", target = "mediaUrl")
    public abstract MessageDto toDto(Message message);

    public abstract List<MessageDto> toDtoList(List<Message> messages);

    protected Long mapToSenderId(User sender){
        return sender.getId();
    }

    protected Long mapToRoomId(Room room){
        return room.getId();
    }

    @AfterMapping
    protected void mapMediaUrl(Message message, @MappingTarget MessageDto messageDto) {
        messageDto.setMediaUrl(s3Operations.getMediaAccessUrl(message.getMediaKey()));
    }
}
