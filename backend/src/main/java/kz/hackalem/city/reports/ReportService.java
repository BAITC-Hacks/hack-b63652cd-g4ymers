package kz.hackalem.city.reports;

import jakarta.validation.constraints.*;
import java.sql.Timestamp;
import java.util.*;
import kz.hackalem.city.auth.AuthService.User;
import kz.hackalem.city.common.ApiException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {
    public enum Category { TRANSPORT,GREEN_SPACES,SOCIAL_INFRASTRUCTURE,SAFETY,CITY_SERVICES }
    public enum Urgency { NORMAL,IMPORTANT,URGENT }
    public enum Status { NEW,UNDER_REVIEW,PLANNED,IN_PROGRESS,RESOLVED,REJECTED }
    public record NewReport(@Size(max=80) String qrCode,@NotBlank @Size(max=100) String title,
        @NotBlank @Size(max=2000) String description,@NotNull Category category,@NotNull Urgency urgency,
        @Size(max=30) String districtId,@Size(max=200) String locationLabel,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,@DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Null(message="Фотографии пока не поддерживаются API") String photoUrl) {}
    public record CommentInput(@NotBlank @Size(max=1000) String text) {}
    public record StatusInput(@NotNull Status status,@NotNull @Min(0) Integer version,@Size(max=1000) String note) {}
    private final JdbcClient db;
    public ReportService(JdbcClient db) { this.db=db; }
    private final String select="""
        SELECT p.*,d.name district,
        (SELECT count(*) FROM confirmations c WHERE c.problem_id=p.id) confirmations,
        EXISTS(SELECT 1 FROM confirmations c WHERE c.problem_id=p.id AND c.user_id=:viewer) confirmed_by_me
        FROM problems p JOIN districts d ON d.id=p.district_id
        """;
    public Map<String,Object> qr(String code) {
        return db.sql("SELECT q.*,d.name district FROM qr_locations q JOIN districts d ON d.id=q.district_id WHERE code=:code AND active")
            .param("code",code).query((rs,n)->Map.<String,Object>of("code",rs.getString("code"),"district",rs.getString("district"),"districtId",rs.getString("district_id"),"objectName",rs.getString("object_name"),"objectType",rs.getString("object_type"),"latitude",rs.getDouble("latitude"),"longitude",rs.getDouble("longitude"),"active",true)).optional().orElseThrow(ApiException::missing);
    }
    @Transactional
    public Map<String,UUID> create(User user,NewReport input) {
        String district=input.districtId(),label=input.locationLabel();Double lat=input.latitude(),lon=input.longitude();
        if(input.qrCode()!=null) {
            var qr=qr(input.qrCode());district=(String)qr.get("districtId");label=(String)qr.get("objectName");lat=(Double)qr.get("latitude");lon=(Double)qr.get("longitude");
        }
        if(district==null || label==null || label.isBlank() || lat==null || lon==null) throw ApiException.bad("Укажите QR-код либо район, адрес и координаты");
        if(!db.sql("SELECT EXISTS(SELECT 1 FROM districts WHERE id=:id)").param("id",district).query(Boolean.class).single()) throw ApiException.bad("Неизвестный район");
        UUID id=UUID.randomUUID();
        db.sql("""
            INSERT INTO problems(id,reporter_id,title,description,category,urgency,district_id,qr_code,location_label,latitude,longitude)
            VALUES(:id,:user,:title,:description,:category,:urgency,:district,:qr,:label,:lat,:lon)
            """).param("id",id).param("user",user.id()).param("title",input.title().trim()).param("description",input.description().trim())
            .param("category",input.category().name()).param("urgency",input.urgency().name()).param("district",district)
            .param("qr",input.qrCode(),java.sql.Types.VARCHAR).param("label",label.trim()).param("lat",lat).param("lon",lon).update();
        history(user,id,null,Status.NEW,"Обращение зарегистрировано");
        return Map.of("id",id,"problemId",id);
    }
    public List<Map<String,Object>> list(User user,boolean own,String district,Status status,Category category,int page,int size) {
        if(page<0 || page>100000 || size<1 || size>50) throw ApiException.bad("page: 0–100000, size: 1–50");
        String where=" WHERE true";
        if(own) where+=" AND p.reporter_id=:owner";
        if(district!=null) where+=" AND p.district_id=:district";
        if(status!=null) where+=" AND p.status=:status";
        if(category!=null) where+=" AND p.category=:category";
        var query=db.sql(select+where+" ORDER BY p.created_at DESC,p.id LIMIT :limit OFFSET :offset").param("viewer",user.id()).param("limit",size).param("offset",page*size);
        if(own) query=query.param("owner",user.id());
        if(district!=null) query=query.param("district",district);
        if(status!=null) query=query.param("status",status.name());
        if(category!=null) query=query.param("category",category.name());
        return query.query().listOfRows().stream().map(row->view(row,user,false)).toList();
    }
    public Map<String,Object> get(User user,UUID id) {
        var row=db.sql(select+" WHERE p.id=:id").param("viewer",user.id()).param("id",id).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional().orElseThrow(ApiException::missing);
        return view(row,user,true);
    }
    private Map<String,Object> view(Map<String,Object> row,User user,boolean detail) {
        Map<String,Object> out=new LinkedHashMap<>();
        for(String field:List.of("id","title","description","category","urgency","status","district","latitude","longitude","confirmations","version")) out.put(field,row.get(field));
        out.put("districtId",row.get("district_id"));out.put("locationLabel",row.get("location_label"));out.put("photoUrl",row.get("photo_url"));
        out.put("reportCount",1);out.put("confirmedByMe",row.get("confirmed_by_me"));
        out.put("createdAt",instant(row.get("created_at")));out.put("updatedAt",instant(row.get("updated_at")));
        out.put("comments",detail?comments(user,(UUID)row.get("id"),0):List.of());return out;
    }
    private String instant(Object value) { return ((Timestamp)value).toInstant().toString(); }
    public List<Map<String,Object>> comments(User user,UUID id,int page) {
        if(page<0 || page>100000) throw ApiException.bad("Некорректная страница");
        return db.sql("SELECT c.*,u.display_name FROM comments c JOIN app_users u ON u.id=c.author_id WHERE problem_id=:id ORDER BY created_at DESC,c.id LIMIT 50 OFFSET :offset")
            .param("id",id).param("offset",page*50).query((rs,n)->Map.<String,Object>of("id",rs.getObject("id"),"displayName",rs.getString("display_name"),"text",rs.getString("body"),"createdAt",rs.getTimestamp("created_at").toInstant().toString(),"own",user.id().equals(rs.getObject("author_id")))).list();
    }
    @Transactional
    public Map<String,Object> confirm(User user,UUID id) {
        requireOpen(id);
        db.sql("INSERT INTO confirmations(problem_id,user_id) VALUES(:id,:user) ON CONFLICT DO NOTHING").param("id",id).param("user",user.id()).update();
        return get(user,id);
    }
    @Transactional
    public Map<String,Object> comment(User user,UUID id,CommentInput input) {
        requireOpen(id);UUID comment=UUID.randomUUID();
        return db.sql("INSERT INTO comments(id,problem_id,author_id,body) VALUES(:id,:problem,:user,:text) RETURNING created_at")
            .param("id",comment).param("problem",id).param("user",user.id()).param("text",input.text().trim())
            .query((rs,n)->Map.<String,Object>of("id",comment,"displayName",user.displayName(),"text",input.text().trim(),"createdAt",rs.getTimestamp(1).toInstant().toString(),"own",true)).single();
    }
    private Status requireOpen(UUID id) {
        Status status=db.sql("SELECT status FROM problems WHERE id=:id FOR UPDATE").param("id",id).query(String.class).optional().map(Status::valueOf).orElseThrow(ApiException::missing);
        if(status==Status.RESOLVED || status==Status.REJECTED) throw ApiException.conflict("Обращение закрыто");return status;
    }
    @Transactional
    public Map<String,Object> changeStatus(User user,UUID id,StatusInput input) {
        var row=db.sql("SELECT status,version FROM problems WHERE id=:id FOR UPDATE").param("id",id).query(new org.springframework.jdbc.core.ColumnMapRowMapper()).optional().orElseThrow(ApiException::missing);
        Status current=Status.valueOf((String)row.get("status"));
        if(((Number)row.get("version")).intValue()!=input.version()) throw ApiException.conflict("Обращение изменилось. Обновите данные");
        Set<Status> allowed=switch(current) {
            case NEW -> Set.of(Status.UNDER_REVIEW,Status.REJECTED);
            case UNDER_REVIEW -> Set.of(Status.PLANNED,Status.IN_PROGRESS,Status.REJECTED);
            case PLANNED -> Set.of(Status.IN_PROGRESS,Status.REJECTED);
            case IN_PROGRESS -> Set.of(Status.RESOLVED,Status.REJECTED);
            case RESOLVED,REJECTED -> Set.of();
        };
        if(!allowed.contains(input.status())) throw ApiException.conflict("Недопустимый переход статуса");
        String note=input.note()==null?"":input.note().trim();
        if((input.status()==Status.RESOLVED || input.status()==Status.REJECTED) && note.isBlank()) throw ApiException.bad("Укажите результат или причину закрытия");
        db.sql("UPDATE problems SET status=:status,version=version+1,updated_at=now() WHERE id=:id").param("status",input.status().name()).param("id",id).update();
        history(user,id,current,input.status(),note);return get(user,id);
    }
    private void history(User user,UUID id,Status from,Status to,String note) {
        db.sql("INSERT INTO problem_history(id,problem_id,actor_id,from_status,to_status,note) VALUES(:id,:problem,:actor,:from,:to,:note)")
            .param("id",UUID.randomUUID()).param("problem",id).param("actor",user.id()).param("from",from==null?null:from.name(),java.sql.Types.VARCHAR).param("to",to.name()).param("note",note).update();
    }
    public List<Map<String,Object>> history(User user,UUID id) {
        get(user,id);
        return db.sql("SELECT h.*,u.display_name FROM problem_history h JOIN app_users u ON u.id=h.actor_id WHERE problem_id=:id ORDER BY created_at,h.id")
            .param("id",id).query((rs,n)->{
                Map<String,Object> out=new LinkedHashMap<>();out.put("fromStatus",rs.getString("from_status"));out.put("toStatus",rs.getString("to_status"));out.put("note",rs.getString("note"));out.put("displayName",rs.getString("display_name"));out.put("createdAt",rs.getTimestamp("created_at").toInstant().toString());return out;
            }).list();
    }
    public Map<String,Object> profile(User user) {
        long reports=db.sql("SELECT count(*) FROM problems WHERE reporter_id=:id").param("id",user.id()).query(Long.class).single();
        long resolved=db.sql("SELECT count(*) FROM problems WHERE reporter_id=:id AND status='RESOLVED'").param("id",user.id()).query(Long.class).single();
        long confirms=db.sql("SELECT count(*) FROM confirmations WHERE user_id=:id").param("id",user.id()).query(Long.class).single();
        String district=db.sql("SELECT name FROM districts WHERE id=:id").param("id",user.districtId()).query(String.class).single();
        return Map.of("displayName",user.displayName(),"district",district,"reports",reports,"confirmedProblems",confirms,"resolvedReports",resolved,"points",reports*10+confirms*2+resolved*20,"level","Житель");
    }
}
