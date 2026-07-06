package com.abhishekojha.kurakanimonolith.modules.message.service;

import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageRequest;
import com.abhishekojha.kurakanimonolith.modules.message.dto.MessageDto;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

public interface MessageService {
    void sendMessageToRoom(
            Long roomId,
            MessageRequest request,
            Principal principal
    );

    MessageDto sendMediaMessageToRoom(
            Long roomId,
            MultipartFile file,
            String content,
            Principal principal
    );


    List<MessageDto> searchMessagesInRoom(Long roomId, String searchText, Pageable pageable, Principal principal);

    List<MessageDto> searchMessagesAcrossRooms(Principal principal, String searchText, Pageable pageable);

    void handleReaction(Long roomId, com.abhishekojha.kurakanimonolith.modules.message.dto.ReactionRequest request, Principal principal);
}
