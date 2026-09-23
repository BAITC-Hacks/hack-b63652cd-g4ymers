package kz.hackalem.city.auth;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth=auth; }
    @PostMapping("/register") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AuthService.Session register(@Valid @RequestBody AuthService.Registration input) { return auth.register(input); }
    @PostMapping("/login") AuthService.Session login(@Valid @RequestBody AuthService.Login input) { return auth.login(input); }
    @GetMapping("/me") AuthService.User me(@AuthenticationPrincipal AuthService.User user) { return user; }
    @PostMapping("/logout") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void logout(@RequestHeader("Authorization") String header) { auth.logout(header.substring(7)); }
}
