package kz.hackalem.city.auth;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
    @Bean org.springframework.security.core.userdetails.UserDetailsService noPasswordLogin() {
        return username -> { throw new org.springframework.security.core.userdetails.UsernameNotFoundException("Use bearer authentication"); };
    }
    @Bean SecurityFilterChain security(HttpSecurity http, AuthService auth, @Value("${app.cors-origins}") String origins) throws Exception {
        CorsConfiguration cors=new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        cors.setAllowedMethods(List.of("GET","POST","PATCH","PUT","DELETE","OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization","Content-Type"));
        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",cors);
        return http.csrf(c->c.disable()).cors(c->c.configurationSource(source))
            .sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(c->c.disable()).formLogin(c->c.disable()).httpBasic(c->c.disable())
            .exceptionHandling(c->c.authenticationEntryPoint((r,s,e)->error(s,401,"Требуется авторизация"))
                .accessDeniedHandler((r,s,e)->error(s,403,"Недостаточно прав")))
            .authorizeHttpRequests(c->c.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll().requestMatchers("/api/health","/api/auth/register","/api/auth/login","/api/auth/citizen/register","/api/auth/citizen/login","/api/public/**").permitAll()
                .requestMatchers("/api/akim/**").hasRole("AKIM").requestMatchers("/api/**").authenticated().anyRequest().denyAll())
            .addFilterBefore(new OncePerRequestFilter() {
                @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
                    String header=req.getHeader("Authorization");
                    if(header!=null && header.startsWith("Bearer ")) auth.authenticate(header.substring(7)).ifPresent(user ->
                        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,null,List.of(new SimpleGrantedAuthority("ROLE_"+user.role())))));
                    chain.doFilter(req,res);
                }
            },UsernamePasswordAuthenticationFilter.class).build();
    }
    private static void error(HttpServletResponse response,int status,String message) throws IOException {
        response.setStatus(status);response.setContentType("application/problem+json;charset=UTF-8");
        response.getWriter().write("{\"status\":"+status+",\"detail\":\""+message+"\"}");
    }
}
