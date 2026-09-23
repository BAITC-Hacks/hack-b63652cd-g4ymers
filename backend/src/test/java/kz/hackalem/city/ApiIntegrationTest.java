package kz.hackalem.city;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import kz.hackalem.city.common.Json;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

@EnabledIfEnvironmentVariable(named="INTEGRATION_TESTS",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiIntegrationTest {
    @Value("${local.server.port}") int port;
    @Value("${app.bootstrap.email}") String akimEmail;
    @Value("${app.bootstrap.password}") String akimPassword;
    @Autowired Json json;
    @Autowired JdbcClient db;
    final HttpClient http=HttpClient.newHttpClient();
    HttpResponse<String> call(String method,String path,String token,Object body) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+path)).header("Content-Type","application/json");
        if(token!=null) request.header("Authorization","Bearer "+token);
        return http.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.write(body))).build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<?,?> object(HttpResponse<String> response,int status) {
        assertEquals(status,response.statusCode(),response.body());return json.read(response.body(),Map.class);
    }
    String citizen(String prefix) throws Exception {
        String iin=String.format(Locale.ROOT,"98%010d",java.util.concurrent.ThreadLocalRandom.current().nextLong(10_000_000_000L));
        var registration=Map.of("iin",iin,"password","Long-test-password-123","displayName","Тестовый житель","districtId","nura");
        object(call("POST","/api/auth/citizen/register",null,registration),201);
        assertEquals(409,call("POST","/api/auth/citizen/register",null,registration).statusCode());
        assertEquals(401,call("POST","/api/auth/citizen/login",null,Map.of("iin",iin,"password","wrong-password")).statusCode());
        var login=object(call("POST","/api/auth/citizen/login",null,Map.of("iin",iin,"password","Long-test-password-123")),200);
        assertFalse(((Map<?,?>)login.get("user")).containsKey("iin"));
        return (String)login.get("token");
    }
    @Test void seededDatasetRolesReportsAndScenarios() throws Exception {
        assertEquals(5,db.sql("SELECT count(*) FROM districts").query(Integer.class).single());
        assertEquals(14,db.sql("SELECT count(*) FROM measures").query(Integer.class).single());
        assertEquals(10,db.sql("SELECT count(*) FROM metrics").query(Integer.class).single());
        assertEquals(52.55768,((Number)object(call("GET","/api/public/baseline",null,null),200).get("score")).doubleValue(),.000001);
        assertEquals(401,call("GET","/api/citizen/my-reports",null,null).statusCode());
        String resident=citizen("resident"),other=citizen("other");
        String akim=(String)object(call("POST","/api/auth/login",null,Map.of("email",akimEmail,"password",akimPassword)),200).get("token");
        assertEquals(403,call("GET","/api/akim/problems",resident,null).statusCode());
        assertEquals(400,call("POST","/api/auth/register",null,Map.of("email","bad@example.kz","password","longpassword123","displayName","Test","districtId","nura","role","AKIM")).statusCode());
        var body=Map.of("title","Не горит фонарь","description","Освещение отсутствует у перехода","category","SAFETY","urgency","IMPORTANT","districtId","nura","locationLabel","Тестовая точка","latitude",51.1,"longitude",71.4);
        String id=object(call("POST","/api/citizen/reports",resident,body),201).get("id").toString();
        assertEquals(1,json.read(call("GET","/api/citizen/my-reports",resident,null).body(),List.class).size());
        assertEquals(0,json.read(call("GET","/api/citizen/my-reports",other,null).body(),List.class).size());
        for(String path:List.of("/api/public/problems/","/api/citizen/problems/","/api/citizen/my-reports/")) assertEquals(404,call("GET",path+id,other,null).statusCode());
        assertEquals(404,call("GET","/api/citizen/problems/"+id+"/comments",other,null).statusCode());
        assertEquals(404,call("GET","/api/citizen/problems/"+id+"/history",other,null).statusCode());
        assertEquals(404,call("POST","/api/citizen/problems/"+id+"/confirm",other,Map.of()).statusCode());
        assertEquals(404,call("POST","/api/citizen/problems/"+id+"/comments",other,Map.of("text","test")).statusCode());
        object(call("POST","/api/citizen/problems/"+id+"/confirm",resident,Map.of()),200);
        assertEquals(1,((Number)object(call("POST","/api/citizen/problems/"+id+"/confirm",resident,Map.of()),200).get("confirmations")).intValue());
        object(call("POST","/api/citizen/problems/"+id+"/comments",resident,Map.of("text","Уточнение к моему обращению")),201);
        String statusPath="/api/akim/problems/"+id+"/status";
        assertEquals(403,call("PATCH",statusPath,resident,Map.of("status","RESOLVED","version",0,"note","test")).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","UNDER_REVIEW","version",0)),200);
        assertEquals(409,call("PATCH",statusPath,akim,Map.of("status","IN_PROGRESS","version",0)).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","IN_PROGRESS","version",1)),200);
        assertEquals(400,call("PATCH",statusPath,akim,Map.of("status","RESOLVED","version",2)).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","RESOLVED","version",2,"note","Лампа заменена")),200);
        assertEquals(List.of(),object(call("GET","/api/public/problems/"+id,null,null),200).get("comments"));
        assertTrue(json.read(call("GET","/api/public/problems",null,null).body(),List.class).stream().allMatch(row->"RESOLVED".equals(((Map<?,?>)row).get("status"))));
        assertEquals(4,json.read(call("GET","/api/citizen/problems/"+id+"/history",resident,null).body(),List.class).size());
        assertEquals(409,call("POST","/api/citizen/problems/"+id+"/confirm",resident,Map.of()).statusCode());
        assertEquals(1,((Number)object(call("GET","/api/citizen/profile",resident,null),200).get("resolvedReports")).intValue());
        var selections=List.of(Map.of("id","M7","district","nura"),Map.of("id","M8","district","nura"),Map.of("id","M10","district","nura"),Map.of("id","M12"),Map.of("id","M5","district","saryarka"));
        var preview=object(call("POST","/api/akim/simulation/preview",akim,Map.of("selections",selections,"complete",true)),200);
        assertEquals(56.54307,((Number)preview.get("score")).doubleValue(),.000001);
        String scenario=object(call("POST","/api/akim/scenarios",akim,Map.of("name","Тестовый сценарий","selections",selections)),201).get("id").toString();
        assertEquals("FINAL",object(call("POST","/api/akim/scenarios/"+scenario+"/finalize",akim,Map.of("version",0)),200).get("status"));
        assertEquals(409,call("PUT","/api/akim/scenarios/"+scenario,akim,Map.of("name","Changed","selections",selections,"version",1)).statusCode());
        String qr="TEST-"+UUID.randomUUID();
        object(call("POST","/api/akim/qr",akim,Map.of("code",qr,"districtId","nura","objectName","Тестовый фонарь","objectType","Освещение","latitude",51.1,"longitude",71.4)),201);
        object(call("GET","/api/public/qr/"+qr,null,null),200);
        object(call("POST","/api/citizen/reports",resident,Map.of("qrCode",qr,"title","Повреждение","description","Описание повреждения","category","SAFETY","urgency","NORMAL")),201);
        assertEquals(204,call("POST","/api/auth/logout",resident,Map.of()).statusCode());
        assertEquals(401,call("GET","/api/auth/me",resident,null).statusCode());
    }
    @Test void liveAnalyticsRespondsToNewReportsAndCompletion() throws Exception {
        String resident=citizen("analytics"),other=citizen("analytics-other");
        String akim=(String)object(call("POST","/api/auth/login",null,Map.of("email",akimEmail,"password",akimPassword)),200).get("token");
        String url="/api/akim/districts/esil/insights";
        assertEquals(403,call("GET",url,resident,null).statusCode());
        double before=((Number)((Map<?,?>)object(call("GET",url,akim,null),200).get("rating")).get("score")).doubleValue();
        String address="Тестовый адрес "+UUID.randomUUID();
        var body=Map.of("title","Переполненные баки","description","Отходы не вывозят неделю, мусоровоз не приезжает","category","CITY_SERVICES","urgency","IMPORTANT","districtId","esil","locationLabel",address,"latitude",51.128,"longitude",71.415);
        String id=object(call("POST","/api/citizen/reports",resident,body),201).get("id").toString();
        object(call("POST","/api/citizen/reports",other,body),201);
        var insights=object(call("GET",url,akim,null),200);
        double activeScore=((Number)((Map<?,?>)insights.get("rating")).get("score")).doubleValue();assertTrue(activeScore<before);
        var suggestion=((List<?>)insights.get("recommendations")).stream().map(r->(Map<?,?>)r).filter(r->address.equals(r.get("address"))).findFirst().orElseThrow();
        assertEquals(2,((Number)suggestion.get("activeReports")).intValue());assertEquals(2,((Number)suggestion.get("residents")).intValue());
        assertEquals("WASTE_COLLECTION",suggestion.get("topic"));assertTrue(suggestion.get("actions").toString().contains("вывоза"));
        object(call("PATCH","/api/akim/problems/"+id+"/status",akim,Map.of("status","UNDER_REVIEW","version",0)),200);
        object(call("PATCH","/api/akim/problems/"+id+"/status",akim,Map.of("status","IN_PROGRESS","version",1)),200);
        object(call("PATCH","/api/akim/problems/"+id+"/status",akim,Map.of("status","RESOLVED","version",2,"note","Мусор вывезен")),200);
        double after=((Number)((Map<?,?>)object(call("GET",url,akim,null),200).get("rating")).get("score")).doubleValue();assertTrue(after>activeScore);
    }
    @Test void syntheticResidentsAreIdempotentAndLoginByIin() throws Exception {
        var seed=new kz.hackalem.city.auth.DemoResidents(db,"Synthetic-test-password-123");
        var args=new org.springframework.boot.DefaultApplicationArguments();
        seed.run(args);
        int before=db.sql("SELECT count(*) FROM problems").query(Integer.class).single();
        seed.run(args);
        assertEquals(before,db.sql("SELECT count(*) FROM problems").query(Integer.class).single());
        assertEquals(25,db.sql("SELECT count(*) FROM app_users WHERE iin LIKE '990000%'").query(Integer.class).single());
        assertEquals(75,db.sql("SELECT count(*) FROM problems p JOIN app_users u ON u.id=p.reporter_id WHERE u.iin LIKE '990000%'").query(Integer.class).single());
        String token=(String)object(call("POST","/api/auth/citizen/login",null,Map.of("iin","990000000001","password","Synthetic-test-password-123")),200).get("token");
        var profile=object(call("GET","/api/citizen/profile",token,null),200);
        assertEquals(3,((Number)profile.get("reports")).intValue());
        assertEquals(50,((Number)profile.get("points")).intValue());
    }
    @Test void qrProofChecksDistanceFreshnessAndPublicHistory() throws Exception {
        String resident=citizen("geo");
        String akim=(String)object(call("POST","/api/auth/login",null,Map.of("email",akimEmail,"password",akimPassword)),200).get("token");
        String qr="GEO-"+UUID.randomUUID();
        object(call("POST","/api/akim/qr",akim,Map.of("code",qr,"districtId","nura","objectName","Тестовый адрес","objectType","Тест","latitude",51.1,"longitude",71.4)),201);
        var body=new HashMap<String,Object>(Map.of("qrCode",qr,"title","Не хватает урн","description","Установите больше мусорных баков","category","CITY_SERVICES","urgency","NORMAL"));
        body.put("location",Map.of("latitude",50.0,"longitude",71.4,"accuracy",10,"capturedAt",java.time.Instant.now().toString()));
        assertEquals(400,call("POST","/api/citizen/reports",resident,body).statusCode());
        body.put("location",Map.of("latitude",51.1,"longitude",71.4,"accuracy",10,"capturedAt",java.time.Instant.now().minusSeconds(600).toString()));
        assertEquals(400,call("POST","/api/citizen/reports",resident,body).statusCode());
        body.put("location",Map.of("latitude",51.1,"longitude",71.4,"accuracy",10,"capturedAt",java.time.Instant.now().toString()));
        String id=object(call("POST","/api/citizen/reports",resident,body),201).get("id").toString();
        assertTrue(((List<?>)object(call("GET","/api/public/qr/"+qr,null,null),200).get("recentChanges")).isEmpty());
        int version=0;
        for(String status:List.of("UNDER_REVIEW","IN_PROGRESS","RESOLVED")) object(call("PATCH","/api/akim/problems/"+id+"/status",akim,Map.of("status",status,"version",version++,"note","Установлены урны")),200);
        var changes=(List<?>)object(call("GET","/api/public/qr/"+qr,null,null),200).get("recentChanges");
        assertEquals(1,changes.size());assertEquals("Установлены урны",((Map<?,?>)changes.getFirst()).get("description"));
        assertEquals(404,call("GET","/api/public/qr/UNKNOWN-"+UUID.randomUUID(),null,null).statusCode());
        assertEquals(400,call("POST","/api/auth/citizen/register",null,Map.of("iin","123","password","Long-test-password-123","displayName","Test","districtId","nura")).statusCode());
        assertEquals(400,call("POST","/api/auth/citizen/register",null,Map.of("iin","990000000999","password","Long-test-password-123","displayName","Test","districtId","nura","role","AKIM")).statusCode());
    }
}
