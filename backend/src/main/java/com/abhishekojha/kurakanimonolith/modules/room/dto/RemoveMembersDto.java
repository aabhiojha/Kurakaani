package com.abhishekojha.kurakanimonolith.modules.room.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RemoveMembersDto {
    private List<Long> membersId = new ArrayList<>();

}
