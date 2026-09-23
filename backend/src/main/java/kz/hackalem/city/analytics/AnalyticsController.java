package kz.hackalem.city.analytics;

import java.time.Instant;
import java.util.*;
import kz.hackalem.city.common.ApiException;
import kz.hackalem.city.simulation.Catalog;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/akim/districts")
public class AnalyticsController {
    private final JdbcClient db;private final Catalog catalog;
    public AnalyticsController(JdbcClient db,Catalog catalog) { this.db=db;this.catalog=catalog; }
    public record Recommendation(String topic,String address,double latitude,double longitude,int activeReports,int residents,
        double confidence,List<String> actions,List<String> measureIds) {}
    public record Insights(String districtId,String districtName,DistrictRating.Rating rating,List<Recommendation> recommendations,
        String modelVersion,int trainingSamples,String trainingSource,String ratingMethod,String generatedAt) {}
    @GetMapping("/{id}/insights") @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Insights insights(@PathVariable String id) {
        var data=catalog.load();
        var district=data.districts().stream().filter(d->d.id().equals(id)).findFirst().orElseThrow(ApiException::missing);
        var rows=db.sql("""
            SELECT title,description,category,urgency,status,location_label,latitude,longitude,qr_code,reporter_id
            FROM problems WHERE district_id=:district AND (status NOT IN ('RESOLVED','REJECTED') OR updated_at>=now()-interval '90 days')
            ORDER BY created_at,id
            """).param("district",id).query().listOfRows();
        var work=rows.stream().map(r->new DistrictRating.Work((String)r.get("category"),(String)r.get("urgency"),(String)r.get("status"))).toList();
        var classifier=new TopicClassifier(db.sql("SELECT topic,body FROM ml_training_samples ORDER BY id").query(TopicClassifier.Sample.class).list());
        record Evidence(Map<String,Object> row,TopicClassifier.Prediction prediction) {}
        Map<String,List<Evidence>> groups=new LinkedHashMap<>();
        for(var row:rows) {
            if(Set.of("RESOLVED","REJECTED").contains(row.get("status"))) continue;
            var prediction=classifier.predict(row.get("title")+" "+row.get("description"));
            double lat=((Number)row.get("latitude")).doubleValue(),lon=((Number)row.get("longitude")).doubleValue();
            String address=((String)row.get("location_label")).trim().toLowerCase(Locale.ROOT).replaceAll("\\s+"," ");
            // Keep similarly named but geographically distant sites separate (~100 m grid).
            String key=prediction.topic()+"|"+address+"|"+Math.round(lat*1000)+"|"+Math.round(lon*1000);
            groups.computeIfAbsent(key,k->new ArrayList<>()).add(new Evidence(row,prediction));
        }
        var recommendations=groups.values().stream().map(group->{
            var first=group.getFirst();var row=first.row();String topic=first.prediction().topic();
            return new Recommendation(topic,(String)row.get("location_label"),((Number)row.get("latitude")).doubleValue(),((Number)row.get("longitude")).doubleValue(),
                group.size(),(int)group.stream().map(e->e.row().get("reporter_id")).distinct().count(),group.stream().mapToDouble(e->e.prediction().confidence()).average().orElse(0),actions(topic),measures(topic));
        }).sorted(Comparator.comparingInt(Recommendation::residents).reversed().thenComparing(Comparator.comparingInt(Recommendation::activeReports).reversed()).thenComparing(Recommendation::address)).limit(10).toList();
        return new Insights(id,district.name(),DistrictRating.calculate(district,data.metrics(),work),recommendations,"naive-bayes-v1",classifier.sampleCount(),
            "Синтетические размеченные примеры; требуется проверка на реальных обращениях",
            "База: сумма 10 показателей × веса PDF. Штраф: 12×ln(1+нагрузка×0.20/доля населения/10). Нагрузка учитывает направление и срочность. Бонус: 5×(1−exp(−решено за 90 дней/20)). Отклонённые не дают бонус. Итог ограничен 0–100. Коэффициенты — стартовая настройка, не обученная оценка.",Instant.now().toString());
    }
    static List<String> actions(String topic) {
        return switch(topic) {
            case "WASTE_CAPACITY" -> List.of("Проверить вместимость и установить дополнительные мусорные баки или урны по этому адресу", "После установки проверить повторные жалобы на участке");
            case "WASTE_COLLECTION" -> List.of("Увеличить частоту вывоза мусора по этому адресу и проверить соблюдение графика", "Проверить заполнение контейнеров; при нехватке вместимости добавить баки");
            case "LIGHTING" -> List.of("Провести вечерний осмотр и восстановить светильники по этому адресу");
            case "ROADS" -> List.of("Проверить покрытие и безопасность перехода на месте; включить участок в план ремонта");
            case "GREEN" -> List.of("Проверить полив и состояние деревьев на участке; запланировать уход и посадки");
            case "UTILITIES" -> List.of("Направить аварийную бригаду для проверки сетей по этому адресу");
            case "TRANSPORT" -> List.of("Проверить интервал транспорта и доступность остановки по указанному адресу");
            case "SOCIAL" -> List.of("Проверить обеспеченность школами, детсадами и поликлиниками в этой локации");
            default -> List.of("Недостаточно уверенности для автоматического совета: провести проверку обращения на месте");
        };
    }
    static List<String> measures(String topic) {
        return switch(topic) { case "LIGHTING"->List.of("M10");case "ROADS"->List.of("M11");case "GREEN"->List.of("M4");case "UTILITIES"->List.of("M14","M13");case "TRANSPORT"->List.of("M1");case "SOCIAL"->List.of("M7","M8");default->List.of(); };
    }
}
