package kz.hackalem.city.simulation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

@RestController
public class SimulationController {
    public record Preview(@NotNull @Size(max=5) @Valid List<Simulator.Selection> selections,Boolean complete) {}
    private final Catalog catalog; private final Simulator simulator; private final JdbcClient db;
    public SimulationController(Catalog catalog,Simulator simulator,JdbcClient db) { this.catalog=catalog;this.simulator=simulator;this.db=db; }
    @GetMapping("/api/health") Map<String,String> health() { db.sql("SELECT 1").query(Integer.class).single();return Map.of("status","UP"); }
    @GetMapping("/api/public/catalog") Catalog.Data catalog() { return catalog.load(); }
    @GetMapping("/api/public/baseline") Simulator.Result baseline() { return simulator.calculate(catalog.load(),List.of(),false); }
    @PostMapping("/api/akim/simulation/preview") Simulator.Result preview(@Valid @RequestBody Preview input) { return simulator.calculate(catalog.load(),input.selections(),Boolean.TRUE.equals(input.complete())); }
}
