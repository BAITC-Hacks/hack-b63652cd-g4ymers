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
        return (String)object(call("POST","/api/auth/register",null,Map.of("email",prefix+UUID.randomUUID()+"@example.kz","password","Long-test-password-123","displayName","Тестовый житель","districtId","nura")),201).get("token");
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
        object(call("POST","/api/citizen/problems/"+id+"/confirm",other,Map.of()),200);
        assertEquals(1,((Number)object(call("POST","/api/citizen/problems/"+id+"/confirm",other,Map.of()),200).get("confirmations")).intValue());
        object(call("POST","/api/citizen/problems/"+id+"/comments",other,Map.of("text","Подтверждаю проблему")),201);
        String statusPath="/api/akim/problems/"+id+"/status";
        assertEquals(403,call("PATCH",statusPath,resident,Map.of("status","RESOLVED","version",0,"note","test")).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","UNDER_REVIEW","version",0)),200);
        assertEquals(409,call("PATCH",statusPath,akim,Map.of("status","IN_PROGRESS","version",0)).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","IN_PROGRESS","version",1)),200);
        assertEquals(400,call("PATCH",statusPath,akim,Map.of("status","RESOLVED","version",2)).statusCode());
        object(call("PATCH",statusPath,akim,Map.of("status","RESOLVED","version",2,"note","Лампа заменена")),200);
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
}
