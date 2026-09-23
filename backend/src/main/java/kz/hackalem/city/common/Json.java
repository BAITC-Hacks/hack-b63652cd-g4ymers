package kz.hackalem.city.common;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class Json {
    private final ObjectMapper mapper;
    public Json(ObjectMapper mapper) { this.mapper = mapper; }
    public String write(Object value) { return mapper.writeValueAsString(value); }
    public <T> T read(String value, Class<T> type) { return mapper.readValue(value, type); }
}
