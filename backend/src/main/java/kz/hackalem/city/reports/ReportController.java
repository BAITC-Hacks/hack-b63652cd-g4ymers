package kz.hackalem.city.reports;

import jakarta.validation.Valid;
import java.util.*;
import kz.hackalem.city.auth.AuthService.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class ReportController {
    private final ReportService reports;
    public ReportController(ReportService reports) { this.reports=reports; }
    @GetMapping("/api/public/qr/{code}") Map<String,Object> qr(@PathVariable String code) { return reports.qr(code); }
    @GetMapping("/api/public/problems") List<Map<String,Object>> journal(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return reports.list(null,false,null,ReportService.Status.RESOLVED,null,page,size);
    }
    @GetMapping("/api/public/problems/{id}") Map<String,Object> publicDetail(@PathVariable UUID id) { return reports.get(null,id); }
    @GetMapping("/api/citizen/my-reports/{id}") Map<String,Object> own(@AuthenticationPrincipal User user,@PathVariable UUID id) { return reports.own(user,id); }
    @PostMapping("/api/citizen/reports") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    Map<String,UUID> create(@AuthenticationPrincipal User user,@Valid @RequestBody ReportService.NewReport input) { return reports.create(user,input); }
    @GetMapping({"/api/citizen/problems","/api/akim/problems"})
    List<Map<String,Object>> list(@AuthenticationPrincipal User user,@RequestParam(required=false) String district,
        @RequestParam(required=false) ReportService.Status status,@RequestParam(required=false) ReportService.Category category,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return reports.list(user,false,district,status,category,page,size); }
    @GetMapping("/api/citizen/my-reports") List<Map<String,Object>> mine(@AuthenticationPrincipal User user,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return reports.list(user,true,null,null,null,page,size); }
    @GetMapping({"/api/citizen/problems/{id}","/api/akim/problems/{id}"}) Map<String,Object> get(@AuthenticationPrincipal User user,@PathVariable UUID id) { return reports.get(user,id); }
    @PostMapping("/api/citizen/problems/{id}/confirm") Map<String,Object> confirm(@AuthenticationPrincipal User user,@PathVariable UUID id) { return reports.confirm(user,id); }
    @GetMapping("/api/citizen/problems/{id}/comments") List<Map<String,Object>> comments(@AuthenticationPrincipal User user,@PathVariable UUID id,@RequestParam(defaultValue="0") int page) { return reports.comments(user,id,page); }
    @PostMapping("/api/citizen/problems/{id}/comments") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    Map<String,Object> comment(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody ReportService.CommentInput input) { return reports.comment(user,id,input); }
    @GetMapping({"/api/citizen/problems/{id}/history","/api/akim/problems/{id}/history"}) List<Map<String,Object>> history(@AuthenticationPrincipal User user,@PathVariable UUID id) { return reports.history(user,id); }
    @PatchMapping("/api/akim/problems/{id}/status") Map<String,Object> status(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody ReportService.StatusInput input) { return reports.changeStatus(user,id,input); }
    @GetMapping("/api/citizen/profile") Map<String,Object> profile(@AuthenticationPrincipal User user) { return reports.profile(user); }
}
