package com.abhishekojha.kurakanimonolith.modules.room.controller;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.*;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RoomListDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.RoomMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.service.RoomServiceImpl;
import com.abhishekojha.kurakanimonolith.modules.room_member.dto.RoomMemberDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin({
        "http://localhost:5173/",
        "http://192.168.1.19:5173"
})
@Tag(name = "Rooms", description = "Room and membership management endpoints.")
public class RoomController {

    private final RoomServiceImpl roomService;

    @Operation(summary = "Get rooms for current user", description = "Returns all chat rooms the authenticated user is a member of.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of rooms returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping
    public ResponseEntity<List<RoomListDto>> getAllRooms() {
        List<RoomListDto> rooms = roomService.getRooms();
        return new ResponseEntity<>(rooms, HttpStatus.OK);
    }

    @Operation(summary = "Get messages for a room", description = "Returns all messages in the specified room.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of messages returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @GetMapping("room/{roomId}/message")
    public ResponseEntity<List<RoomMessageDto>> getMessagesForRoom(
            @Parameter(description = "ID of the room") @PathVariable Long roomId
    ) {
        List<RoomMessageDto> messages = roomService.getAllMessagesForRoom(roomId);
        return new ResponseEntity<>(messages, HttpStatus.OK);
    }

    @Operation(summary = "Get room members", description = "Returns all members of the specified room.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of room members returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<RoomMemberDto>> getAllRoomMembers(
            @Parameter(description = "ID of the room") @PathVariable Long roomId
    ) {
        List<RoomMemberDto> allMembers = roomService.getAllMembers(roomId);
        return new ResponseEntity<>(allMembers, HttpStatus.OK);
    }

    @Operation(
            summary = "Get addable friends for a room",
            description = "Returns friends of the authenticated user who are not already members of the specified room."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of addable friends returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @GetMapping("/room/{roomId}/add/friends")
    public ResponseEntity<List<FriendsDto>> getAllAddableFriends(
            @Parameter(description = "ID of the room to check membership against") @PathVariable Long roomId
    ) {
        List<FriendsDto> allAddableFriends = roomService.getAllAddableFriends(roomId);
        return new ResponseEntity<>(allAddableFriends, HttpStatus.OK);
    }


    @Operation(summary = "Create a group room", description = "Creates a new group chat room. The authenticated user is automatically added as admin.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Room created, new room returned"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "409", description = "A room with this name already exists for this user")
    })
    @PostMapping("/group")
    public ResponseEntity<RoomDto> createNewGroup(
            @Valid @RequestBody CreateRoomRequestDto createRoomRequestDto
    ) {
        RoomDto room = roomService.createRoomGroup(createRoomRequestDto);
        return new ResponseEntity<>(room, HttpStatus.CREATED);
    }

    @Operation(summary = "Create or retrieve a DM room", description = "Creates a direct message room between the authenticated user and the specified user. Returns the existing DM if one already exists.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "DM room created or existing DM returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Target user not found")
    })
    @PostMapping("/dm")
    public ResponseEntity<RoomDto> createNewDm(
            @Parameter(description = "ID of the user to start a DM with") @RequestParam Long userId
    ) {
        RoomDto roomDm = roomService.createRoomDm(userId);
        return new ResponseEntity<>(roomDm, HttpStatus.CREATED);
    }

    @Operation(summary = "Add users to a room", description = "Adds one or more users to an existing room by their IDs.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Users added successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request body or empty user list"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room or one or more users not found")
    })
    @PostMapping("/room/{room_id}/add")
    public ResponseEntity<Void> addUsersToRoom(
            @Valid @RequestBody AddUsersToRoomDto addUsersToRoomDto,
            @Parameter(description = "ID of the room to add users to") @PathVariable Long room_id
    ) {
        roomService.addUserToRoomGroup(addUsersToRoomDto, room_id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @Operation(summary = "Upgrade a DM to a group room", description = "Converts an existing DM room into a group by adding more users to it.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Room updated, updated room returned"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @PostMapping("/room/{roomId}/group/create")
    public ResponseEntity<RoomDto> createGroupFromDm(
            @Parameter(description = "ID of the DM room to upgrade") @PathVariable Long roomId,
            @RequestBody AddUsersToRoomDto userIds
    ) {
        RoomDto updatedRoom = roomService.dmToRoom(roomId, userIds);
        return new ResponseEntity<>(updatedRoom, HttpStatus.OK);
    }

    @Operation(
            summary = "Update room details",
            description = "Updates the name and description of an existing room. Optionally adds new members. Requires ADMIN role in the room."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Room updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request body or empty user list"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "403", description = "Not authorized to update this room"),
            @ApiResponse(responseCode = "404", description = "Room or one or more users not found"),
            @ApiResponse(responseCode = "409", description = "Conflict - duplicate members or room name")
    })
    @PatchMapping("/room/{roomId}")
    public ResponseEntity<RoomDto> updateRoomDetails(
            @RequestBody UpdateRoomDetails request,
            @Parameter(description = "ID of the room to update") @PathVariable Long roomId
    ) {
        RoomDto roomDto = roomService.updateGroup(roomId, request);
        return ResponseEntity.ok(roomDto);
    }


    @Operation(summary = "Remove users from a room", description = "Removes one or more members from a room by their member IDs.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Users removed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "401", description = "Not authenticated"),
            @ApiResponse(responseCode = "404", description = "Room or one or more members not found")
    })
    @PostMapping("/room/{room_id}/remove")
    public ResponseEntity<Void> deleteUsersFromRoom(
            @Valid @RequestBody RemoveMembersDto removeMembersDto,
            @Parameter(description = "ID of the room to remove members from") @PathVariable Long room_id
    ) {
        roomService.removeUserFromRoom(removeMembersDto, room_id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

}
