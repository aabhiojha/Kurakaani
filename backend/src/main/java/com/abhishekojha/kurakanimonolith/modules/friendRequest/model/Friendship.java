package com.abhishekojha.kurakanimonolith.modules.friendRequest.model;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.FriendRequestStatus;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "friendships",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_friendship",
                        columnNames = {"requester_id", "recipient_id"}
                )
        }
)
@Check(constraints = "requester_id != recipient_id")
public class Friendship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    private FriendRequestStatus status = FriendRequestStatus.PENDING;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

}
