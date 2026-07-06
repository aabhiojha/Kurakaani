package com.abhishekojha.kurakanimonolith.common.helpers;

import java.text.Normalizer;
import java.util.UUID;

public class FileNameUtils {

    public static String normalize(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return UUID.randomUUID().toString();
        }

        // remove path info
        String fileName = originalFilename.replaceAll("\\\\", "/");
        fileName = fileName.substring(fileName.lastIndexOf("/") + 1);

        // normalize unicode (é → e)
        fileName = Normalizer.normalize(fileName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        // lowercase
        fileName = fileName.toLowerCase();

        // replace spaces with hyphen
        fileName = fileName.replaceAll("\\s+", "-");

        // remove unsafe characters
        fileName = fileName.replaceAll("[^a-z0-9._-]", "");

        return fileName;
    }
}