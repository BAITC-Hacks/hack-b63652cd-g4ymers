package kz.hackalem.city.reports;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import kz.hackalem.city.common.ApiException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/akim/qr")
public class QrController {
    public record Location(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{1,80}") String code,
        @NotBlank String districtId,@NotBlank @Size(max=160) String objectName,@NotBlank @Size(max=100) String objectType,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,@NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
    private final JdbcClient db; private final ReportService reports;
    public QrController(JdbcClient db,ReportService reports) { this.db=db;this.reports=reports; }
    @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    Map<String,Object> create(@Valid @RequestBody Location input) {
        if(!db.sql("SELECT EXISTS(SELECT 1 FROM districts WHERE id=:id)").param("id",input.districtId()).query(Boolean.class).single()) throw ApiException.bad("Неизвестный район");
        db.sql("INSERT INTO qr_locations(code,district_id,object_name,object_type,latitude,longitude) VALUES(:code,:district,:name,:type,:lat,:lon)")
            .param("code",input.code()).param("district",input.districtId()).param("name",input.objectName().trim()).param("type",input.objectType().trim())
            .param("lat",input.latitude()).param("lon",input.longitude()).update();return reports.qr(input.code());
    }
}
