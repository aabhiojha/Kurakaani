package com.abhishekojha.kurakanimonolith.modules.webrtc.controller;

import com.abhishekojha.kurakanimonolith.modules.webrtc.dto.WebRtcSignal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class WebRtcSignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/webrtc/signal")
    public void handleSignaling(WebRtcSignal signal, Principal principal) {
        signal.setSenderUsername(principal.getName());
        
        // Forward the signal to the target user's private queue
        messagingTemplate.convertAndSendToUser(
            signal.getTargetUsername(), 
            "/queue/webrtc", 
            signal
        );
    }
}
