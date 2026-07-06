package com.abhishekojha.kurakanimonolith.modules.room_member.model;

import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "room_members",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_room",
                columnNames = {"roomId", "userId"}
        )
)
@Builder
public class RoomMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_member_id")
    private Long roomMemberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_role")
    private RoomRole roomRole;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

}
