package kz.hackalem.city.simulation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import kz.hackalem.city.auth.AuthService.User;
import kz.hackalem.city.common.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/akim/scenarios")
public class ScenarioController {
    public record Create(@NotBlank @Size(max=120) String name,@NotNull @Size(max=5) @Valid List<Simulator.Selection> selections) {}
    public record Input(@NotBlank @Size(max=120) String name,@NotNull @Size(max=5) @Valid List<Simulator.Selection> selections,@NotNull @Min(0) Integer version) {}
    public record Version(@NotNull @Min(0) Integer version) {}
    private final JdbcClient db;private final Json json;private final Catalog catalog;private final Simulator simulator;
    public ScenarioController(JdbcClient db,Json json,Catalog catalog,Simulator simulator) { this.db=db;this.json=json;this.catalog=catalog;this.simulator=simulator; }
    @GetMapping List<Map<String,Object>> list(@AuthenticationPrincipal User user,@RequestParam(defaultValue="0") @Min(0) int page) {
        if(page<0 || page>100000) throw ApiException.bad("Некорректная страница");
        return db.sql("SELECT * FROM scenarios WHERE owner_id=:user ORDER BY created_at DESC,id LIMIT 20 OFFSET :offset")
            .param("user",user.id()).param("offset",page*20).query().listOfRows().stream().map(this::view).toList();
    }
    @GetMapping("/{id}") Map<String,Object> get(@AuthenticationPrincipal User user,@PathVariable UUID id) { return view(owned(user,id)); }
    @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    Map<String,Object> create(@AuthenticationPrincipal User user,@Valid @RequestBody Create input) {
        var result=simulator.calculate(catalog.load(),input.selections(),false);UUID id=UUID.randomUUID();
        db.sql("INSERT INTO scenarios(id,owner_id,name,selections,result,budget,status) VALUES(:id,:user,:name,CAST(:selections AS jsonb),CAST(:result AS jsonb),:budget,'DRAFT')")
            .param("id",id).param("user",user.id()).param("name",input.name().trim()).param("selections",json.write(input.selections())).param("result",json.write(result)).param("budget",result.spent()).update();
        return get(user,id);
    }
    @PutMapping("/{id}") @Transactional
    Map<String,Object> update(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Input input) {
        owned(user,id);var result=simulator.calculate(catalog.load(),input.selections(),false);
        int changed=db.sql("UPDATE scenarios SET name=:name,selections=CAST(:selections AS jsonb),result=CAST(:result AS jsonb),budget=:budget,version=version+1,updated_at=now() WHERE id=:id AND owner_id=:user AND status='DRAFT' AND version=:version")
            .param("name",input.name().trim()).param("selections",json.write(input.selections())).param("result",json.write(result)).param("budget",result.spent())
            .param("id",id).param("user",user.id()).param("version",input.version()).update();
        if(changed==0) throw ApiException.conflict("Сценарий уже завершён или изменён. Обновите данные");return get(user,id);
    }
    @PostMapping("/{id}/finalize") @Transactional
    Map<String,Object> finish(@AuthenticationPrincipal User user,@PathVariable UUID id,@Valid @RequestBody Version input) {
        var row=owned(user,id);
        var result=simulator.calculate(catalog.load(),Arrays.asList(json.read(row.get("selections").toString(),Simulator.Selection[].class)),true);
        int changed=db.sql("UPDATE scenarios SET status='FINAL',result=CAST(:result AS jsonb),version=version+1,updated_at=now() WHERE id=:id AND owner_id=:user AND version=:version AND status='DRAFT'")
            .param("result",json.write(result)).param("id",id).param("user",user.id()).param("version",input.version()).update();
        if(changed==0) throw ApiException.conflict("Сценарий уже завершён или изменён. Обновите данные");return get(user,id);
    }
    private Map<String,Object> owned(User user,UUID id) {
        return db.sql("SELECT * FROM scenarios WHERE id=:id AND owner_id=:user").param("id",id).param("user",user.id()).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional().orElseThrow(ApiException::missing);
    }
    private Map<String,Object> view(Map<String,Object> row) {
        Map<String,Object> out=new LinkedHashMap<>();
        for(String key:List.of("id","name","budget","status","version")) out.put(key,row.get(key));
        for(String key:List.of("selections","result")) out.put(key,json.read(row.get(key).toString(),Object.class));
        out.put("createdAt",row.get("created_at").toString());out.put("updatedAt",row.get("updated_at").toString());return out;
    }
}
