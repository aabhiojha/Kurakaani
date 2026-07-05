package com.abhishekojha.kurakanimonolith.modules.message.controller;

import com.abhishekojha.kurakanimonolith.modules.message.TypingEvent;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageDto;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageRequest;
import com.abhishekojha.kurakanimonolith.modules.message.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
@Tag(name = "Messages", description = "Message sending and search endpoints.")
public class MessageController {

    private final MessageService messageService;
    private final org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate;

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessageToRoom(
            @DestinationVariable Long roomId,
            @Payload MessageRequest request,
            Principal principal
    ) {
        messageService.sendMessageToRoom(roomId, request, principal);
    }

    @PostMapping("/api/rooms/room/{roomId}/message/media")
    @ResponseBody
    public ResponseEntity<MessageDto> uploadMediaToRoom(
            @PathVariable Long roomId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "content", required = false) String content,
            Principal principal
    ) {
        return new ResponseEntity<>(messageService.sendMediaMessageToRoom(roomId, file, content, principal), HttpStatus.CREATED);
    }

    @MessageMapping("/chat.typing/{roomId}")
    public void handleTyping(@DestinationVariable Long roomId,
                             @Payload TypingEvent event,
                             Principal principal) {
        redisTemplate.convertAndSend("chat.typing." + roomId, event);
    }

    @Operation(summary = "Search messages in a room", description = "Full-text search for messages within a specific room. Only accessible to members of that room. Results are ranked by relevance.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching messages returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "User is not a member of the room"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @GetMapping("/api/rooms/{roomId}/messages/search")
    public ResponseEntity<List<MessageDto>> searchMessagesFromRoom(
            @Parameter(description = "ID of the room to search in") @PathVariable Long roomId,
            @Parameter(description = "Search query text") @RequestParam String text,
            @PageableDefault(size = 50) Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(messageService.searchMessagesInRoom(roomId, text, pageable, principal));
    }

    @Operation(summary = "Search messages across all rooms", description = "Full-text search for messages across all rooms the authenticated user belongs to. Messages from rooms the user is not a member of are excluded. Results are ranked by relevance.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching messages returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/api/rooms/messages/search")
    public ResponseEntity<List<MessageDto>> searchMessagesFromRooms(
            @Parameter(description = "Search query text") @RequestParam String text,
            @PageableDefault(size = 50) Pageable pageable,
            Principal principal) {
        return ResponseEntity.ok(messageService.searchMessagesAcrossRooms(principal, text, pageable));
    }

}
