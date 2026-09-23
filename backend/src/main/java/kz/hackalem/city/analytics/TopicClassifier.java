package kz.hackalem.city.analytics;

import java.util.*;

/** Multinomial naive Bayes with additive smoothing; trained on labelled DB samples. */
public final class TopicClassifier {
    public record Sample(String topic,String body) {}
    public record Prediction(String topic,double confidence) {}
    private final Map<String,Map<String,Integer>> counts=new TreeMap<>();
    private final Map<String,Integer> documents=new HashMap<>(),totals=new HashMap<>();
    private final Set<String> vocabulary=new HashSet<>();
    private final int sampleCount;
    public TopicClassifier(List<Sample> samples) {
        sampleCount=samples.size();
        for(var sample:samples) {
            documents.merge(sample.topic(),1,Integer::sum);
            var words=counts.computeIfAbsent(sample.topic(),t->new HashMap<>());
            for(var token:tokens(sample.body())) {
                vocabulary.add(token);words.merge(token,1,Integer::sum);totals.merge(sample.topic(),1,Integer::sum);
            }
        }
    }
    public int sampleCount() { return sampleCount; }
    private static List<String> tokens(String text) {
        return Arrays.stream(text.toLowerCase(Locale.ROOT).replace('ё','е').split("[^\\p{L}]+"))
            // Normalize common Russian noun endings before truncation (урн / урны,
            // бак / баки / баков). The topic itself is learned from DB labels.
            .map(s->s.length()>3?s.replaceFirst("(ами|ями|ов|ев|ах|ях|ам|ям|ом|ем|а|я|ы|и|у|ю|е|о)$",""):s)
            .filter(s->s.length()>2).map(s->s.substring(0,Math.min(5,s.length()))).toList();
    }
    public Prediction predict(String text) {
        var known=tokens(text).stream().filter(vocabulary::contains).toList();
        if(known.isEmpty() || counts.isEmpty()) return new Prediction("OTHER",0);
        Map<String,Double> scores=new TreeMap<>();
        counts.forEach((topic,words)->{
            double score=Math.log((double)documents.get(topic)/sampleCount);
            for(String token:known) score+=Math.log((words.getOrDefault(token,0)+1.0)/(totals.get(topic)+vocabulary.size()));
            scores.put(topic,score);
        });
        var best=scores.entrySet().stream().max(Map.Entry.comparingByValue()).orElseThrow();
        double sum=scores.values().stream().mapToDouble(s->Math.exp(s-best.getValue())).sum();
        double confidence=1/sum;
        return new Prediction(confidence<0.55?"OTHER":best.getKey(),confidence);
    }
}
