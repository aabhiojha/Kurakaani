package com.abhishekojha.kurakanimonolith.common.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Kurakani API",
                version = "v1",
                description = "OpenAPI definition for the Kurakani monolith backend.",
                contact = @Contact(
                        name = "Abhishek Ojha",
                        url = "https://abhishekojha.com.np"
                )
        )
)
@SecurityScheme(
        name = OpenApiConfig.BEARER_SCHEME,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER
)
public class OpenApiConfig {

    static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI kurakaniOpenApi() {
        return new OpenAPI()
                .info(new io.swagger.v3.oas.models.info.Info()
                        .title("Kurakani API")
                        .version("v1")
                        .description("REST API documentation for the Kurakani monolith backend.")
                        .contact(new io.swagger.v3.oas.models.info.Contact()
                                .name("Abhishek Ojha")
                                .url("https://abhishekojha.com.np"))
                        .license(new License().name("Proprietary")))
                .tags(List.of(
                        new Tag().name("Authentication").description("Authentication and password recovery endpoints."),
                        new Tag().name("Users").description("User profile and user administration endpoints."),
                        new Tag().name("Rooms").description("Room and membership management endpoints.")
                ))
                .schemaRequirement(
                        BEARER_SCHEME,
                        new io.swagger.v3.oas.models.security.SecurityScheme()
                                .type(io.swagger.v3.oas.models.security.SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                );
    }

    @Bean
    public OpenApiCustomizer secureProtectedOperations() {
        return openApi -> {
            Paths paths = openApi.getPaths();
            if (paths == null) {
                return;
            }

            paths.forEach((path, pathItem) -> {
                if (pathItem == null) {
                    return;
                }

                for (Map.Entry<PathItem.HttpMethod, io.swagger.v3.oas.models.Operation> entry : pathItem.readOperationsMap().entrySet()) {
                    if (isProtected(path)) {
                        entry.getValue().addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
                    }
                }
            });
        };
    }

    private boolean isProtected(String path) {
        if (!path.startsWith("/api/")) {
            return false;
        }

        return !path.startsWith("/api/auth/");
    }
}
