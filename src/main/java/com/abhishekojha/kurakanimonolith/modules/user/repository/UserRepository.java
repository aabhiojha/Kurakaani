package com.abhishekojha.kurakanimonolith.modules.user.repository;

import com.abhishekojha.kurakanimonolith.modules.user.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserName(String userName);

    boolean existsByUserName(String userName);

    Optional<User> findByEmailIgnoreCase(String email);

    // Roles are LAZY; these variants join-fetch them for callers that need
    // authorities/roles outside an open session (authentication path).
    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByUserName(String userName);

    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByEmailIgnoreCase(String email);

}
