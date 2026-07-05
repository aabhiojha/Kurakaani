package com.abhishekojha.kurakanimonolith.modules.message.service;

import com.abhishekojha.kurakanimonolith.common.exception.exceptions.BadRequestException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.FileStorageException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.ResourceNotFoundException;
import com.abhishekojha.kurakanimonolith.common.exception.exceptions.UnauthorizedException;
import com.abhishekojha.kurakanimonolith.common.objectStorage.S3Operations;
import com.abhishekojha.kurakanimonolith.common.security.SecurityUtils;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageDto;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageRequest;
import com.abhishekojha.kurakanimonolith.modules.message.mapper.MessageMapper;
import com.abhishekojha.kurakanimonolith.modules.message.model.Message;
import com.abhishekojha.kurakanimonolith.modules.message.model.MessageType;
import com.abhishekojha.kurakanimonolith.modules.message.repository.MessageRepository;
import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import com.abhishekojha.kurakanimonolith.modules.room.repository.RoomRepository;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import com.abhishekojha.kurakanimonolith.modules.room_member.repository.RoomMemberRepository;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageServiceImpl implements MessageService {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final MessageMapper messageMapper;
    private final S3Operations s3Operations;
    private final SecurityUtils securityUtils;
    private final RedisTemplate<String, Object> redisTemplate;

    /** Upper bound on search page size to protect the DB from unbounded result sets. */
    private static final int MAX_SEARCH_PAGE_SIZE = 100;

    @Override
    @Transactional
    public void sendMessageToRoom(Long roomId, MessageRequest request, Principal principal) {
        log.debug("event=send_text_message_attempt roomId={} user={}", roomId, principal.getName());

        if (request.getContent() == null || request.getContent().isBlank()) {
            log.warn("event=send_text_message_rejected reason=empty_content roomId={} user={}", roomId, principal.getName());
            throw new BadRequestException("Message content is required.");
        }

        User sender = getSender(principal);
        Room room = getAuthorizedRoom(roomId, sender);

        Message savedMessage = saveMessage(
                room,
                sender,
                request.getContent(),
                MessageType.TEXT,
                null,
                null,
                null
        );
        log.info("event=message_saved message Id={} roomId={} userId={}", savedMessage.getId(), savedMessage.getRoom().getId(), savedMessage.getSender().getId());

        publishMessage(room, sender, savedMessage);
    }

    @Override
    @Transactional
    public MessageDto sendMediaMessageToRoom(Long roomId, MultipartFile file, String content, Principal principal) {
        log.debug("event=send_media_message_attempt roomId={} user={} contentType={} fileSize={}",
                roomId, principal.getName(), file != null ? file.getContentType() : "null", file != null ? file.getSize() : 0);

        if (file == null || file.isEmpty()) {
            log.warn("event=send_media_message_rejected reason=missing_file roomId={} user={}", roomId, principal.getName());
            throw new BadRequestException("Image or video file is required.");
        }

        MessageType messageType = resolveMessageType(file);
        log.debug("event=media_type_resolved roomId={} messageType={}", roomId, messageType);

        User sender = getSender(principal);
        Room room = getAuthorizedRoom(roomId, sender);

        String folder = switch (messageType) {
            case IMAGE -> "chat/group/" + roomId + "/images";
            case VIDEO -> "chat/group/" + roomId + "/videos";
            default -> throw new BadRequestException("Unsupported message type.");
        };

        String mediaKey;
        try {
            mediaKey = s3Operations.uploadFile(file, folder);
            log.info("event=media_uploaded roomId={} userId={} mediaKey={}", roomId, sender.getId(), mediaKey);
        } catch (Exception e) {
            log.error("event=media_upload_failed roomId={} userId={} folder={} error={}", roomId, sender.getId(), folder, e.getMessage(), e);
            throw new FileStorageException("Failed to upload media file", e);
        }

        Message savedMessage;
        try {
            savedMessage = saveMessage(room, sender, content, messageType, mediaKey, file.getContentType(), file.getOriginalFilename());
            log.info("event=media_message_saved messageId={} roomId={} userId={} mediaKey={}", savedMessage.getId(), roomId, sender.getId(), mediaKey);
        } catch (RuntimeException e) {
            log.error("event=media_message_save_failed roomId={} userId={} mediaKey={} error={} — rolling back upload", roomId, sender.getId(), mediaKey, e.getMessage());
            s3Operations.deleteFile(mediaKey);
            throw e;
        }

        return publishMessage(room, sender, savedMessage);
    }

    /**
     * Fan a saved message out over Redis pub/sub. For a DM it is delivered to both
     * participants' personal channels; for a group it goes to the room channel.
     *
     * @return the DTO that was published
     */
    private MessageDto publishMessage(Room room, User sender, Message savedMessage) {
        MessageDto dto = messageMapper.toDto(savedMessage);

        if (room.getType() == RoomType.DM) {
            String senderUsername = sender.getUsername();
            String receiverUsername = room.getMembers().stream()
                    .map(RoomMember::getUser)
                    .filter(user -> !user.getId().equals(sender.getId()))
                    .map(User::getUsername)
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("DM recipient not found in room " + room.getId()));

            String receiverChannel = "chat.dm.user." + receiverUsername;
            String senderChannel = "chat.dm.user." + senderUsername;
            redisTemplate.convertAndSend(receiverChannel, dto);
            redisTemplate.convertAndSend(senderChannel, dto);
            log.info("event=dm_message_published messageId={} senderChannel={} receiverChannel={}", savedMessage.getId(), senderChannel, receiverChannel);
        } else {
            String groupChannel = "chat.group." + room.getId();
            redisTemplate.convertAndSend(groupChannel, dto);
            log.info("event=group_message_published messageId={} channel={} userId={}", savedMessage.getId(), groupChannel, dto.getSenderId());
        }
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageDto> searchMessagesInRoom(Long roomId, String searchText, Pageable pageable, Principal principal) {
        log.debug("event=search_messages_in_room roomId={} user={} query=\"{}\"", roomId, principal.getName(), searchText);
        getAuthorizedRoom(roomId, getSender(principal));
        List<MessageDto> results = messageRepository.fullTextSearchByRoom(roomId, searchText, capPageSize(pageable))
                .stream()
                .map(messageMapper::toDto)
                .toList();
        log.info("event=search_messages_in_room_done roomId={} user={} resultCount={}", roomId, principal.getName(), results.size());
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageDto> searchMessagesAcrossRooms(Principal principal, String searchText, Pageable pageable) {
        User user = getSender(principal);
        log.debug("event=search_messages_across_rooms userId={} query=\"{}\"", user.getId(), searchText);
        List<MessageDto> results = messageRepository.fullTextSearchAcrossRooms(searchText, user.getId(), capPageSize(pageable))
                .stream()
                .map(messageMapper::toDto)
                .toList();
        log.info("event=search_messages_across_rooms_done userId={} resultCount={}", user.getId(), results.size());
        return results;
    }

    /** Clamp the requested page size so a client cannot ask for an unbounded result set. */
    private Pageable capPageSize(Pageable pageable) {
        if (pageable.getPageSize() <= MAX_SEARCH_PAGE_SIZE) {
            return pageable;
        }
        return org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), MAX_SEARCH_PAGE_SIZE);
    }


    private Message saveMessage(Room room, User sender, String content, MessageType messageType, String mediaKey, String mediaContentType, String mediaFileName) {
        return messageRepository.save(Message.builder()
                .sender(sender)
                .room(room)
                .content(content)
                .messageType(messageType)
                .mediaKey(mediaKey)
                .mediaContentType(mediaContentType)
                .mediaFileName(mediaFileName)
                .isEdited(Boolean.FALSE)
                .isDeleted(Boolean.FALSE)
                .build());
    }

    /** Loads the room and verifies the already-resolved user is a member (no extra user lookup). */
    private Room getAuthorizedRoom(Long roomId, User sender) {
        Room room = roomRepository.findById(roomId).orElseThrow(
                () -> new ResourceNotFoundException("Room not found")
        );

        boolean isMember = roomMemberRepository.existsByRoomIdAndUserId(roomId, sender.getId());
        if (!isMember) {
            log.warn("event=unauthorized_room_access roomId={} userId={}", roomId, sender.getId());
            throw new UnauthorizedException("You are not a member of this room");
        }
        return room;
    }

    private User getSender(Principal principal) {
        return securityUtils.getRequestUser(principal);
    }

    /**
     * Resolve the message type from the uploaded file. The declared content-type is
     * client-supplied and easily spoofed, so we also sniff the leading "magic bytes"
     * and require the actual bytes to agree with an allowed image/video type.
     */
    private MessageType resolveMessageType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            throw new BadRequestException("Unsupported file type.");
        }

        MessageType declaredType;
        if (contentType.startsWith("image/")) {
            declaredType = MessageType.IMAGE;
        } else if (contentType.startsWith("video/")) {
            declaredType = MessageType.VIDEO;
        } else if (contentType.startsWith("audio/")) {
            declaredType = MessageType.AUDIO;
        } else {
            throw new BadRequestException("Only image, video, and audio files are supported.");
        }

        MessageType sniffedType = sniffMediaType(file);
        if (sniffedType == null || sniffedType != declaredType) {
            log.warn("event=media_type_mismatch declared={} sniffed={} contentType={}", declaredType, sniffedType, contentType);
            throw new BadRequestException("File content does not match a supported image or video format.");
        }
        return declaredType;
    }

    /** Detect image/video from magic bytes; returns {@code null} if unrecognised. */
    private MessageType sniffMediaType(MultipartFile file) {
        byte[] header = new byte[12];
        try (var in = file.getInputStream()) {
            int read = in.read(header);
            if (read < 4) {
                return null;
            }
        } catch (IOException e) {
            throw new FileStorageException("Could not read uploaded file", e);
        }

        // Images
        if (startsWith(header, 0xFF, 0xD8, 0xFF)) return MessageType.IMAGE;                       // JPEG
        if (startsWith(header, 0x89, 0x50, 0x4E, 0x47)) return MessageType.IMAGE;                 // PNG
        if (startsWith(header, 0x47, 0x49, 0x46, 0x38)) return MessageType.IMAGE;                 // GIF
        if (startsWith(header, 0x52, 0x49, 0x46, 0x46) && matchesAt(header, 8, 0x57, 0x45, 0x42, 0x50)) return MessageType.IMAGE; // RIFF....WEBP

        // Videos
        if (matchesAt(header, 4, 0x66, 0x74, 0x79, 0x70)) return MessageType.VIDEO;               // ISO-BMFF (MP4/MOV): '....ftyp'
        if (startsWith(header, 0x1A, 0x45, 0xDF, 0xA3)) return (file.getContentType() != null && file.getContentType().startsWith("audio/")) ? MessageType.AUDIO : MessageType.VIDEO;                 // Matroska/WebM (EBML)

        return null;
    }

    private boolean startsWith(byte[] data, int... expected) {
        return matchesAt(data, 0, expected);
    }

    private boolean matchesAt(byte[] data, int offset, int... expected) {
        if (data.length < offset + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((data[offset + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
