package com.abhishekojha.kurakanimonolith.modules.message.repository;

import com.abhishekojha.kurakanimonolith.modules.message.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
//    @Query(value = """
//            SELECT * FROM messages
//            WHERE room_id = :roomId
//            AND is_deleted = false
//            AND content_tsv @@ plainto_tsquery('english', :searchText)
//            ORDER BY ts_rank(content_tsv, plainto_tsquery('english', :searchText)) Desc
//            """, nativeQuery = true)

    @Query(value = """
            SELECT *
            FROM messages
            WHERE room_id = :roomId
              AND is_deleted = false
              AND (
                  content_tsv @@ plainto_tsquery('english', :searchText)
                  OR similarity(coalesce(content, ''), :searchText) > 0.2
              )
            ORDER BY
              CASE
                  WHEN content_tsv @@ plainto_tsquery('english', :searchText) THEN 0
                  ELSE 1
              END,
              ts_rank(content_tsv, plainto_tsquery('english', :searchText)) DESC,
              similarity(coalesce(content, ''), :searchText) DESC,
              created_at DESC
            """, nativeQuery = true)
    List<Message> fullTextSearchByRoom(@Param("roomId") Long roomId, @Param("searchText") String searchText, Pageable pageable);


    //    @Query(value = """
//                SELECT m.* from messages m
//                join room_members rm on rm.room_id = m.room_id
//                            where rm.user_id = :userId
//                            and m.is_deleted = false
//                            and m.content_tsv @@ plainto_tsquery('english', :searchText)
//                            order by ts_rank(m.content_tsv, plainto_tsquery('english', :searchText)) DESC
//            """, nativeQuery = true)
    @Query(value = """
            SELECT DISTINCT m.*
            FROM messages m
            JOIN room_members rm ON rm.room_id = m.room_id
            WHERE rm.user_id = :userId
              AND m.is_deleted = false
              AND (
                  m.content_tsv @@ plainto_tsquery('english', :searchText)
                  OR similarity(coalesce(m.content, ''), :searchText) > 0.25
              )
            ORDER BY
              CASE
                  WHEN m.content_tsv @@ plainto_tsquery('english', :searchText) THEN 0
                  ELSE 1
              END,
              ts_rank(m.content_tsv, plainto_tsquery('english', :searchText)) DESC,
              similarity(coalesce(m.content, ''), :searchText) DESC,
              m.created_at DESC
            """, nativeQuery = true)
    List<Message> fullTextSearchAcrossRooms(@Param("searchText") String searchText, @Param("userId") Long userId, Pageable pageable);
}
