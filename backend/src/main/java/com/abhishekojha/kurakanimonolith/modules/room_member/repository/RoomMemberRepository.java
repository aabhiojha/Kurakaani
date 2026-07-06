package com.abhishekojha.kurakanimonolith.modules.room_member.repository;

import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomMemberRepository extends JpaRepository<RoomMember, Long> {
    boolean existsByRoomIdAndUserId(Long roomId, Long userId);

    List<RoomMember> findByUser(User user);

    List<RoomMember> findByRoom(Room room);

    /** Members of a room with their user join-fetched in a single query (avoids N+1). */
    @EntityGraph(attributePaths = "user")
    List<RoomMember> findByRoomId(Long roomId);
}
