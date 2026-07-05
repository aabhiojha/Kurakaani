package com.abhishekojha.kurakanimonolith.modules.room.repository;

import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RecentMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RoomListDto;
import com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.RoomMessageDto;
import com.abhishekojha.kurakanimonolith.modules.room.model.Room;
import com.abhishekojha.kurakanimonolith.modules.room.model.RoomType;
import com.abhishekojha.kurakanimonolith.modules.room_member.model.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByName(String name);

    @Query("""
                SELECT r FROM Room r
                join r.members rm
                where rm.user.id = :userId
                and LOWER(r.name) = LOWER(:name)
            """
    )
    List<Room> findByCreatedByAndNameIgnoreCase(@Param("userId") Long userId, @Param("name") String name);


    @Query("""
             Select new com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RoomListDto(
                 r.id,
                 CASE 
                     WHEN r.type = com.abhishekojha.kurakanimonolith.modules.room.model.RoomType.DM THEN (
                         SELECT u.userName FROM RoomMember rm2 JOIN rm2.user u 
                         WHERE rm2.room.id = r.id AND u.id != :userId
                     )
                     ELSE r.name
                 END,
                 r.description,
                 r.type,
                 SIZE(r.members)
                )
                  FROM Room r
                  join r.members rm
                  where rm.user.id =:userId
            """
    )
    List<RoomListDto> findRoomsForUser(@Param("userId") Long userId);


    @Query("""
            SELECT new com.abhishekojha.kurakanimonolith.modules.room.dto.roomList.RecentMessageDto(
                m.id, m.room.id, m.content, m.messageType, m.createdAt, m.sender.id, m.sender.userName
            )
            FROM Message m
            WHERE m.room.id IN :roomIds
            AND m.createdAt = (
                SELECT MAX(m2.createdAt) FROM Message m2 WHERE m2.room.id = m.room.id
            )
            """)
    List<RecentMessageDto> getRecentMessagesForRooms(@Param("roomIds") List<Long> roomIds);


    @Query("""
                SELECT new com.abhishekojha.kurakanimonolith.modules.room.dto.roomMessage.RoomMessageDto(
                    m.id, m.room.id, m.content, m.messageType, m.mediaKey, m.mediaContentType, m.mediaFileName, m.isEdited,m.isDeleted, m.createdAt, m.updatedAt,
                    m.sender.id, m.sender.userName, m.sender.profileImageUrl
                )
                from Message m
                where m.room.id = :roomId
            """)
    List<RoomMessageDto> getMessagesForRoom(@Param("roomId") Long roomId);

    @Query("""
                SELECT r
                from Room r
                join r.members rm
                where r.type = 'DM'
                and rm.user.id in (:userId1, :userId2)
                group by r
                having count(distinct rm.user.id) = 2
                and count(rm) = 2
            """)
    Optional<Room> findExistingDm(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

}
