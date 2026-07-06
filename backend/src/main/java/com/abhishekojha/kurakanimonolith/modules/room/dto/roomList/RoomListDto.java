package com.abhishekojha.kurakanimonolith.modules.room.dto.roomList;

import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class RoomListDto {
    private Long id;
    private String name;
    private String description;
    private RoomType type;
    private int memberCount;
    private RecentMessageDto recentMessage;
    private int unreadCount;

    public RoomListDto(Long id, String name, String description, RoomType type, int memberCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type;
        this.memberCount = memberCount;
    }

}

//    {
//        "id": 1,
//        "name": "Gufff gaffff",
//        "description": "Chatting place",
//        "type": "GROUP",
//        "memberCount": 1,
//        "recentMessage": {
//        "content": "this still is in the same way.",
//            "sentAt": "2026-03-23T21:30:09.744491",
//            "sender": {
//                "id": 2,
//                "username": "ram"
//              }
//          },
//        "unreadCount": 0
//    }
