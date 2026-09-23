package kz.hackalem.city.analytics;

import java.util.*;
import kz.hackalem.city.simulation.Catalog;

/** Explicit policy adjustment to the PDF baseline, not a learned/official quality label. */
public final class DistrictRating {
    public record Work(String category,String urgency,String status) {}
    public record Rating(double baseline,double score,double activePenalty,double resolutionBonus,int active,int resolved,int rejected) {}
    public static Rating calculate(Catalog.District district,List<Catalog.Metric> metrics,List<Work> work) {
        double baseline=0;
        for(int i=0;i<metrics.size();i++) baseline+=metrics.get(i).weight()*district.values().get(i);
        Map<String,Double> weights=new HashMap<>();
        String[] categories={"TRANSPORT","TRANSPORT","GREEN_SPACES","GREEN_SPACES","SOCIAL_INFRASTRUCTURE","SOCIAL_INFRASTRUCTURE","SAFETY","SAFETY","CITY_SERVICES","CITY_SERVICES"};
        for(int i=0;i<metrics.size();i++) weights.merge(categories[i],metrics.get(i).weight(),Double::sum);
        int active=0,resolved=0,rejected=0;double burden=0;
        for(var row:work) {
            if(row.status().equals("RESOLVED")) { resolved++;continue; }
            if(row.status().equals("REJECTED")) { rejected++;continue; }
            active++;
            double urgency=switch(row.urgency()) { case "URGENT"->2;case "IMPORTANT"->1.5;default->1; };
            burden+=urgency*weights.getOrDefault(row.category(),0.2)/0.2;
        }
        // Population is a share, not an absolute resident count. 20% is the average of 5 districts.
        double penalty=12*Math.log1p(burden*0.20/district.population()/10);
        double bonus=5*(1-Math.exp(-resolved/20.0));
        return new Rating(baseline,Math.max(0,Math.min(100,baseline-penalty+bonus)),penalty,bonus,active,resolved,rejected);
    }
}
