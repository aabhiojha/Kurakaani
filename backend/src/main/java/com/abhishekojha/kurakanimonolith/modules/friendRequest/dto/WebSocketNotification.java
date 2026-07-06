package com.abhishekojha.kurakanimonolith.modules.friendRequest.dto;

import com.abhishekojha.kurakanimonolith.modules.friendRequest.model.enums.WsResponseType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class WebSocketNotification {
    private WsResponseType type;
    private Object payload;
}
