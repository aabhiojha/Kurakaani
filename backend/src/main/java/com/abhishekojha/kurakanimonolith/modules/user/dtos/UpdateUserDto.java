package com.abhishekojha.kurakanimonolith.modules.user.dtos;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserDto {
    private String userName;
    private String email;
}
