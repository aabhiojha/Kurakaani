package com.abhishekojha.kurakanimonolith.modules.friendRequest.controller;


import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendShipDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.dto.FriendsDto;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestResponse;
import com.abhishekojha.kurakanimonolith.modules.friendRequest.service.FriendRequestServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friend")
@RequiredArgsConstructor
@CrossOrigin("*")
@Tag(name = "Friendship", description = "Manage friend requests and friendships")
@SecurityRequirement(name = "bearerAuth")
public class FriendShipController {

    private final FriendRequestServiceImpl friendRequestService;

    @Operation(summary = "Send a friend request", description = "Send a friend request to a user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friend request sent successfully"),
            @ApiResponse(responseCode = "404", description = "Recipient user not found"),
            @ApiResponse(responseCode = "409", description = "Friend request already exists")
    })
    @PostMapping("/request/{userId}")
    public ResponseEntity<Void> sendFriendRequest(
            @Parameter(description = "ID of the user to send a friend request to", required = true)
            @PathVariable Long userId
    ) {
        friendRequestService.sendFriendRequest(userId);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Respond to a friend request", description = "Accept or reject a pending friend request from a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Response recorded successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to respond to this request"),
            @ApiResponse(responseCode = "404", description = "Friendship not found")
    })
    @PostMapping("/respond/{userId}/{response}")
    public ResponseEntity<Void> respondToRequest(
            @Parameter(description = "ID of the user whose friend request you are responding to", required = true)
            @PathVariable Long userId,
            @Parameter(description = "Response: ACCEPTED or REJECTED", required = true)
            @PathVariable FriendRequestResponse response
    ) {
        friendRequestService.respondToFriendRequest(userId, response);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Cancel a sent friend request", description = "Cancel a pending friend request that the current user sent")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friend request cancelled successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to cancel this request"),
            @ApiResponse(responseCode = "404", description = "Friend request not found")
    })
    @PostMapping("/{userId}/cancel")
    public ResponseEntity<Void> cancelRequest(
            @Parameter(description = "ID of the user you sent the friend request to", required = true)
            @PathVariable Long userId
    ) {
        friendRequestService.cancelFriendRequest(userId);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Unfriend a user", description = "Remove an existing friendship with a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Unfriended successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to remove this friendship"),
            @ApiResponse(responseCode = "404", description = "Friendship not found")
    })
    @PostMapping("/{userId}/unfriend")
    public ResponseEntity<Void> unfriendUser(
            @Parameter(description = "ID of the user to unfriend", required = true)
            @PathVariable Long userId
    ) {
        friendRequestService.unfriend(userId);
        return new ResponseEntity<>(HttpStatus.OK);
    }

    @Operation(summary = "Get sent friend requests", description = "Returns all pending friend requests sent by the current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of sent friend requests"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/requests/sent")
    public ResponseEntity<List<FriendShipDto>> getSentRequests() {
        List<FriendShipDto> sentRequests = friendRequestService.getSentRequests();
        return new ResponseEntity<>(sentRequests, HttpStatus.OK);
    }

    @Operation(summary = "Get incoming friend requests", description = "Returns all pending friend requests received by the current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of incoming friend requests"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/requests")
    public ResponseEntity<List<FriendShipDto>> getIncomingRequests() {
        List<FriendShipDto> incomingRequests = friendRequestService.getIncomingRequests();
        return new ResponseEntity<>(incomingRequests, HttpStatus.OK);
    }

    @Operation(summary = "Get all friends", description = "Returns all accepted friends of the current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of friends"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/friends")
    public ResponseEntity<List<FriendsDto>> getAllFriends() {
        List<FriendsDto> friends = friendRequestService.getFriends();
        return new ResponseEntity<>(friends, HttpStatus.OK);
    }
}
