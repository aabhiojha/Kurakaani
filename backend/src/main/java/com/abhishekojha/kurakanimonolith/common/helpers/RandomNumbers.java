package com.abhishekojha.kurakanimonolith.common.helpers;

import jakarta.validation.constraints.NotNull;

import java.security.SecureRandom;

public class RandomNumbers {

    public static @NotNull Integer generateRandomNumbers(){
        SecureRandom rand = new SecureRandom();
        return rand.nextInt(100000);
    }

}
