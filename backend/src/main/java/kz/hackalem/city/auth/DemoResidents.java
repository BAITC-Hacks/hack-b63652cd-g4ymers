package kz.hackalem.city.auth;

import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Opt-in, idempotent fixtures. Identifiers with month 00 are intentionally not real IINs. */
@Component @ConditionalOnProperty(name="app.demo.enabled",havingValue="true")
public class DemoResidents implements ApplicationRunner {
    private final JdbcClient db;private final String password;
    public DemoResidents(JdbcClient db,@Value("${app.demo.password:}") String password) { this.db=db;this.password=password; }
    private static UUID id(String key) { return UUID.nameUUIDFromBytes(("hackalem-demo-v1:"+key).getBytes(StandardCharsets.UTF_8)); }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(password.length()<12 || password.getBytes(StandardCharsets.UTF_8).length>72) throw new IllegalStateException("DEMO_RESIDENT_PASSWORD must be 12+ characters, max 72 UTF-8 bytes");
        String hash=new BCryptPasswordEncoder(12).encode(password);
        var districts=List.of("esil","almaty","saryarka","baikonur","nura");
        var streets=List.of("ул. Достык, 12","пр. Абылай хана, 44","ул. Бейбитшилик, 31","ул. Кенесары, 50","ул. Сыганак, 20");
        double[] lat={51.128,51.151,51.174,51.19,51.1034},lon={71.415,71.39,71.425,71.36,71.4302};
        var random=new Random(63652);
        for(int d=0;d<districts.size();d++) {
            String district=districts.get(d),qr=d==4?"ASTANA-NURA-LIGHT-001":"DEMO-"+district.toUpperCase(Locale.ROOT);
            db.sql("INSERT INTO qr_locations(code,district_id,object_name,object_type,street_name,latitude,longitude) VALUES(:code,:district,:name,'Демо-объект',:street,:lat,:lon) ON CONFLICT DO NOTHING")
                .param("code",qr).param("district",district).param("name","Демо: "+streets.get(d)).param("street",streets.get(d)).param("lat",lat[d]).param("lon",lon[d]).update();
            for(int r=0;r<5;r++) {
                int number=d*5+r+1;String iin=String.format(Locale.ROOT,"990000%06d",number);UUID user=id("user:"+number);
                db.sql("INSERT INTO app_users(id,iin,password_hash,display_name,district_id,role) VALUES(:id,:iin,:hash,:name,:district,'CITIZEN') ON CONFLICT DO NOTHING")
                    .param("id",user).param("iin",iin).param("hash",hash).param("name","Демо-житель "+number).param("district",district).update();
                if(!db.sql("SELECT EXISTS(SELECT 1 FROM app_users WHERE id=:id)").param("id",user).query(Boolean.class).single()) continue;
                for(int p=0;p<3;p++) {
                    UUID problem=id("problem:"+number+":"+p);
                    String status=p==2?"RESOLVED":(random.nextBoolean()?"NEW":"IN_PROGRESS");
                    String title=p==0?"Переполнены мусорные контейнеры":p==1?"Не хватает мусорных баков":"Восстановлено освещение";
                    String description=p==0?"Мусор не вывозят неделю, баки переполнены, нужен частый вывоз":p==1?"Во дворе мало урн, нужны дополнительные мусорные контейнеры":"Фонари восстановлены, вечером стало светлее";
                    int changed=db.sql("""
                        INSERT INTO problems(id,reporter_id,title,description,category,urgency,status,district_id,qr_code,location_label,latitude,longitude)
                        VALUES(:id,:user,:title,:text,:category,:urgency,:status,:district,:qr,:address,:lat,:lon) ON CONFLICT DO NOTHING
                        """).param("id",problem).param("user",user).param("title",title).param("text",description)
                        .param("category",p==2?"SAFETY":"CITY_SERVICES").param("urgency",random.nextBoolean()?"IMPORTANT":"NORMAL").param("status",status)
                        .param("district",district).param("qr",qr).param("address",streets.get(d)).param("lat",lat[d]).param("lon",lon[d]).update();
                    if(changed>0) db.sql("INSERT INTO problem_history(id,problem_id,actor_id,to_status,note) VALUES(:id,:problem,:user,:status,:note)")
                        .param("id",id("history:"+problem)).param("problem",problem).param("user",user).param("status",status)
                        .param("note",p==2?"Синтетический пример: светильники заменены":"Синтетическое обращение для демонстрации").update();
                }
            }
        }
    }
}
