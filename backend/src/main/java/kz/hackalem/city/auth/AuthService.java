package kz.hackalem.city.auth;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import kz.hackalem.city.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    public record User(UUID id, String email, String displayName, String districtId, String role) {}
    public record Registration(@NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(min=10,max=64) String password, @NotBlank @Size(max=80) String displayName,
        @NotBlank String districtId) {}
    public record Login(@NotBlank @Email String email, @NotBlank @Size(max=64) String password) {}
    public record Session(String token, Instant expiresAt, User user) {}
    private final JdbcClient db;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
    private final SecureRandom random = new SecureRandom();
    private final int hours;
    private final String dummyHash = encoder.encode("invalid-account-comparison");
    public AuthService(JdbcClient db, @Value("${app.token-hours}") int hours) { this.db=db; this.hours=hours; }
    @Transactional
    public Session register(Registration r) {
        validatePassword(r.password());
        if (!db.sql("SELECT EXISTS(SELECT 1 FROM districts WHERE id=:id)").param("id",r.districtId()).query(Boolean.class).single())
            throw ApiException.bad("Неизвестный район");
        UUID id=UUID.randomUUID();
        db.sql("INSERT INTO app_users(id,email,password_hash,display_name,district_id,role) VALUES(:id,:email,:hash,:name,:district,'CITIZEN')")
            .param("id",id).param("email",email(r.email())).param("hash",encoder.encode(r.password()))
            .param("name",r.displayName().trim()).param("district",r.districtId()).update();
        return issue(user(id));
    }
    public Session login(Login r) {
        if(r.password().getBytes(StandardCharsets.UTF_8).length>72) throw new ApiException(HttpStatus.UNAUTHORIZED,"Неверный email или пароль");
        var rows=db.sql("SELECT id,password_hash FROM app_users WHERE email=:email").param("email",email(r.email())).query().listOfRows();
        String hash=rows.isEmpty()?dummyHash:(String)rows.getFirst().get("password_hash");
        if (!encoder.matches(r.password(),hash) || rows.isEmpty()) throw new ApiException(HttpStatus.UNAUTHORIZED,"Неверный email или пароль");
        return issue(user((UUID)rows.getFirst().get("id")));
    }
    private Session issue(User user) {
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires=Instant.now().plusSeconds(hours*3600L);
        db.sql("DELETE FROM access_tokens WHERE expires_at<now()").update();
        db.sql("INSERT INTO access_tokens(token_hash,user_id,expires_at) VALUES(:hash,:user,:expires)")
            .param("hash",hash(token)).param("user",user.id()).param("expires",java.sql.Timestamp.from(expires)).update();
        return new Session(token,expires,user);
    }
    public Optional<User> authenticate(String token) {
        if(token.length()>128) return Optional.empty();
        return db.sql("SELECT u.id,u.email,u.display_name,u.district_id,u.role FROM access_tokens t JOIN app_users u ON u.id=t.user_id WHERE token_hash=:hash AND expires_at>now()")
            .param("hash",hash(token)).query(User.class).optional();
    }
    public void logout(String token) { db.sql("DELETE FROM access_tokens WHERE token_hash=:hash").param("hash",hash(token)).update(); }
    public User user(UUID id) { return db.sql("SELECT id,email,display_name,district_id,role FROM app_users WHERE id=:id").param("id",id).query(User.class).single(); }
    private String email(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    private void validatePassword(String password) {
        if(password.getBytes(StandardCharsets.UTF_8).length>72) throw ApiException.bad("Пароль слишком длинный: максимум 72 байта UTF-8");
    }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    @Bean
    ApplicationRunner bootstrap(@Value("${app.bootstrap.email}") String email, @Value("${app.bootstrap.password}") String password) {
        return args -> {
            if(email.isBlank() && password.isBlank()) return;
            if(email.isBlank() || password.length()<12) throw new IllegalStateException("AKIM_EMAIL and AKIM_PASSWORD (12+ chars) required together");
            validatePassword(password);
            var existing=db.sql("SELECT role FROM app_users WHERE email=:email").param("email",email(email)).query(String.class).optional();
            if(existing.isPresent()) {
                if(!existing.get().equals("AKIM")) throw new IllegalStateException("Bootstrap email belongs to a citizen; choose another email");
                return;
            }
            db.sql("INSERT INTO app_users(id,email,password_hash,display_name,district_id,role) VALUES(:id,:email,:hash,'Аким','nura','AKIM')")
                .param("id",UUID.randomUUID()).param("email",email(email)).param("hash",encoder.encode(password)).update();
        };
    }
}
