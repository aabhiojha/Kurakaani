package com.abhishekojha.kurakanimonolith.modules.auth.repository;

import com.abhishekojha.kurakanimonolith.modules.auth.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByNameIgnoreCase(String name);

    boolean existsByName(String name);

    Optional<Role> findByName(String name);
}
