package kz.hackalem.city.simulation;

import jakarta.validation.constraints.*;
import java.util.*;
import kz.hackalem.city.common.ApiException;
import org.springframework.stereotype.Component;

@Component
public class Simulator {
    public record Selection(@NotBlank String id,String district) {}
    public record DistrictResult(String id,String name,double population,List<Double> values,double score) {}
    public record Result(List<DistrictResult> districts,double average,double minimum,int critical,double score,int spent,int remaining,List<String> explanations) {}
    public Result calculate(Catalog.Data data,List<Selection> plan,boolean complete) {
        if(plan==null || plan.size()>5 || (complete && plan.size()!=5)) throw ApiException.bad("Выберите ровно 5 мероприятий для завершения сценария");
        Map<String,Catalog.Measure> measures=new HashMap<>();data.measures().forEach(m->measures.put(m.id(),m));
        Map<String,Selection> selected=new HashMap<>();Map<String,Integer> counts=new HashMap<>();int spent=0;
        for(Selection s:plan) {
            if(s==null || !measures.containsKey(s.id())) throw ApiException.bad("Неизвестная мера");
            if(selected.put(s.id(),s)!=null) throw ApiException.bad("Меры не должны повторяться");
            var m=measures.get(s.id());
            if(m.city()?s.district()!=null:data.districts().stream().noneMatch(d->d.id().equals(s.district()))) throw ApiException.bad("Укажите район для локальной меры; общегородская мера не принимает район");
            if(counts.merge(m.category(),1,Integer::sum)>2) throw ApiException.bad("Максимум 2 меры одного направления");
            spent+=m.cost();
        }
        if(spent>100) throw ApiException.bad("Бюджет превышает 100");
        if(selected.containsKey("M1")&&selected.containsKey("M3")) throw ApiException.bad("Меры M1 и M3 несовместимы");
        for(var pair:List.of(List.of("M4","M7"),List.of("M5","M13"))) {
            var a=selected.get(pair.get(0));var b=selected.get(pair.get(1));
            if(a!=null && b!=null && Objects.equals(a.district(),b.district())) throw ApiException.bad("Меры "+a.id()+" и "+b.id()+" конфликтуют в одном районе");
        }
        List<DistrictResult> results=new ArrayList<>();List<String> explanations=new ArrayList<>();
        for(var d:data.districts()) {
            var values=new ArrayList<>(d.values());
            for(var s:plan) {
                var m=measures.get(s.id());if(!m.city()&&!d.id().equals(s.district())) continue;
                for(int i=0;i<data.metrics().size();i++) values.set(i,values.get(i)+m.effects().getOrDefault(data.metrics().get(i).code(),0d)*(8-m.lag())/8d);
            }
            for(var synergy:List.of(List.of("M1","M2","T1"),List.of("M10","M12","B1"),List.of("M5","M6","E2"))) {
                var a=selected.get(synergy.get(0));
                if(a!=null&&d.id().equals(a.district())&&selected.containsKey(synergy.get(1))) {
                    for(int i=0;i<data.metrics().size();i++) if(data.metrics().get(i).code().equals(synergy.get(2))) values.set(i,values.get(i)+2);
                    explanations.add(d.name()+": синергия "+synergy.get(0)+" + "+synergy.get(1)+", "+synergy.get(2)+" +2");
                }
            }
            double score=0;
            for(int i=0;i<values.size();i++) { values.set(i,Math.clamp(values.get(i),0,100));score+=values.get(i)*data.metrics().get(i).weight(); }
            results.add(new DistrictResult(d.id(),d.name(),d.population(),List.copyOf(values),score));
        }
        double average=results.stream().mapToDouble(d->d.score()*d.population()).sum();
        double minimum=results.stream().mapToDouble(DistrictResult::score).min().orElseThrow();
        int critical=(int)results.stream().flatMap(d->d.values().stream()).filter(v->v<40).count();
        explanations.add("Горизонт: 8 кварталов. Эффект меры умножен на (8 − лаг) / 8.");
        explanations.add("Score = 0.7 × среднее + 0.3 × худший район − число показателей ниже 40.");
        return new Result(results,average,minimum,critical,.7*average+.3*minimum-critical,spent,100-spent,explanations);
    }
}
