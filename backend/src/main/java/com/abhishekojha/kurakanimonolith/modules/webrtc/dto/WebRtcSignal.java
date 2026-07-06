package com.abhishekojha.kurakanimonolith.modules.webrtc.dto;

import lombok.Data;

@Data
public class WebRtcSignal {
    private String type; // "offer", "answer", "ice_candidate", or "call_request"
    private String targetUsername; // The user you are calling/sending data to
    private String senderUsername;
    private Object data; // The SDP payload or ICE candidate JSON
}
