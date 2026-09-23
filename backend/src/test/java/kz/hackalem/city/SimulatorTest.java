package kz.hackalem.city;

import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import kz.hackalem.city.simulation.*;
import kz.hackalem.city.common.ApiException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SimulatorTest {
    final Catalog.Data data=new JsonMapper().readValue(getClass().getResourceAsStream("/dataset.json"),Catalog.Data.class);
    final Simulator simulator=new Simulator();
    Simulator.Selection s(String id,String district) { return new Simulator.Selection(id,district); }
    @Test void baselineMatchesDataset() {
        var result=simulator.calculate(data,List.of(),false);
        assertEquals(52.55768,result.score(),.000001);assertEquals(2,result.critical());
        assertEquals(49.18,result.minimum(),.000001);
    }
    @Test void examplePlanMatchesSpecification() {
        var result=simulator.calculate(data,List.of(s("M7","nura"),s("M8","nura"),s("M10","nura"),s("M12",null),s("M5","saryarka")),true);
        assertEquals(95,result.spent());assertEquals(56.54307,result.score(),.000001);assertEquals(0,result.critical());
    }
    @Test void cityEffectsAndSynergyHaveDifferentLagRules() {
        var result=simulator.calculate(data,List.of(s("M1","nura"),s("M2",null)),false);
        assertEquals(64.5,result.districts().get(4).values().get(0),.000001);
        assertEquals(48,result.districts().getFirst().values().getFirst(),.000001);
        assertEquals(40+9*.75,result.districts().get(4).values().get(1),.000001);
    }
    @Test void invalidPlansRejected() {
        for(var plan:List.of(
            List.of(s("M1","nura"),s("M3","esil")),List.of(s("M4","nura"),s("M7","nura")),
            List.of(s("M5","almaty"),s("M13","almaty")),List.of(s("M1","esil"),s("M1","nura")),
            List.of(s("M2","nura")),List.of(s("M7",null)),List.of(s("M99","nura")),
            List.of(s("M7","nura"),s("M8","esil"),s("M9","almaty")),
            List.of(s("M3","nura"),s("M13","almaty"),s("M7","nura"),s("M8","nura")))) {
            assertThrows(ApiException.class,()->simulator.calculate(data,plan,false));
        }
        assertThrows(ApiException.class,()->simulator.calculate(data,List.of(),true));
        assertDoesNotThrow(()->simulator.calculate(data,List.of(s("M4","esil"),s("M7","nura")),false));
    }
    @Test void criticalBoundaryIsStrictAndScoresAreClamped() {
        var edge=new Catalog.Data(List.of(new Catalog.District("test","Test",1,List.of(40d,99d,40d,40d,40d,40d,40d,40d,40d,40d),"")),data.measures(),data.metrics());
        var result=simulator.calculate(edge,List.of(s("M1","test")),false);
        assertEquals(100d,result.districts().getFirst().values().get(1));assertEquals(0,result.critical());
    }
}
