package kz.hackalem.city;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;
import kz.hackalem.city.analytics.*;
import kz.hackalem.city.simulation.Catalog;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AnalyticsTest {
    final Catalog.Data data=new JsonMapper().readValue(getClass().getResourceAsStream("/dataset.json"),Catalog.Data.class);
    DistrictRating.Rating rating(List<DistrictRating.Work> work) { return DistrictRating.calculate(data.districts().get(4),data.metrics(),work); }
    @Test void pdfBaselinesAndMonotonicity() {
        double[] baseline={62.99,57.06,54.65,56.63,49.18};
        for(int i=0;i<5;i++) assertEquals(baseline[i],DistrictRating.calculate(data.districts().get(i),data.metrics(),List.of()).score(),.00001);
        var rows=new ArrayList<DistrictRating.Work>();double previous=rating(rows).score();
        for(int i=0;i<200;i++) {
            rows.add(new DistrictRating.Work("CITY_SERVICES","NORMAL","NEW"));double score=rating(rows).score();
            assertTrue(score<=previous);assertTrue(score>=0 && score<=100);previous=score;
        }
        double withActive=rating(rows).score();rows.set(0,new DistrictRating.Work("CITY_SERVICES","NORMAL","RESOLVED"));
        assertTrue(rating(rows).score()>withActive);
    }
    @Test void rejectedIsNotRewardedAndUrgencyMatters() {
        assertEquals(rating(List.of()).score(),rating(List.of(new DistrictRating.Work("SAFETY","URGENT","REJECTED"))).score());
        assertTrue(rating(List.of(new DistrictRating.Work("SAFETY","URGENT","NEW"))).score()<rating(List.of(new DistrictRating.Work("SAFETY","NORMAL","NEW"))).score());
    }
    @Test void modelGeneralizesToUnseenWasteAndLightingPhrasesAndAbstains() throws Exception {
        String sql=Files.readString(Path.of("src/main/resources/db/migration/V3__citizen_identity_and_analytics.sql"));
        var matcher=Pattern.compile("\\('([A-Z_]+)','([^']+)'\\)").matcher(sql);
        List<TopicClassifier.Sample> samples=new ArrayList<>();
        while(matcher.find()) samples.add(new TopicClassifier.Sample(matcher.group(1),matcher.group(2)));
        var model=new TopicClassifier(samples);
        assertEquals(32,model.sampleCount());
        assertEquals("WASTE_COLLECTION",model.predict("У дома переполнены баки, отходы не вывозят").topic());
        assertEquals("WASTE_CAPACITY",model.predict("Установите дополнительные урны на улице").topic());
        assertEquals("LIGHTING",model.predict("Фонарь возле дома погас, темно вечером").topic());
        assertEquals("OTHER",model.predict("абракадабра").topic());
    }
}
