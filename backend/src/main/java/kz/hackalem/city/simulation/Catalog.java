package kz.hackalem.city.simulation;

import java.util.*;
import kz.hackalem.city.common.Json;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class Catalog {
    public record District(String id,String name,double population,List<Double> values,String note) {}
    public record Measure(String id,String name,String description,String category,int cost,int lag,boolean city,Map<String,Double> effects) {}
    public record Metric(String code,String name,double weight) {}
    public record Data(List<District> districts,List<Measure> measures,List<Metric> metrics) {}
    private final JdbcClient db; private final Json json;
    public Catalog(JdbcClient db,Json json) { this.db=db;this.json=json; }
    public Data load() {
        var districts=db.sql("SELECT * FROM districts ORDER BY ordinal").query((rs,n)->new District(rs.getString("id"),rs.getString("name"),rs.getDouble("population"),Arrays.asList(json.read(rs.getString("metric_values"),Double[].class)),rs.getString("note"))).list();
        var measures=db.sql("SELECT * FROM measures ORDER BY ordinal").query((rs,n)->new Measure(rs.getString("id"),rs.getString("name"),rs.getString("description"),rs.getString("category"),rs.getInt("cost"),rs.getInt("lag"),rs.getBoolean("city"),effects(rs.getString("effects")))).list();
        return new Data(districts,measures,db.sql("SELECT code,name,weight FROM metrics ORDER BY ordinal").query(Metric.class).list());
    }
    private Map<String,Double> effects(String raw) {
        Map<?,?> data=json.read(raw,Map.class); Map<String,Double> result=new LinkedHashMap<>();
        data.forEach((k,v)->result.put((String)k,((Number)v).doubleValue())); return result;
    }
}
