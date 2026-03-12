package com.example.demo.controller;

import com.example.demo.model.Ativo;
import com.example.demo.service.ativoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/ativos")
@CrossOrigin(origins = "*")
public class AtivoController {

    @Value("${brapi.token}")
    private String token;

    private final ativoService service;

    private final RestTemplate restTemplate = new RestTemplate();

    public AtivoController(ativoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Ativo> listar() {
        return service.listar(); }

    @PostMapping
    public Ativo salvar(@RequestBody Ativo ativo) {
        return service.salvar(ativo); }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id); }

    @PutMapping("/{id}")
    public Ativo atualizar(@PathVariable Long id, @RequestBody Ativo ativo) {
        ativo.setId(id);
        return service.salvar(ativo);
    }

    @GetMapping("/cotacoes")
    public List<Object> cotacoes(@RequestParam String tickers) {
        List<Object> resultados = new ArrayList<>();

        for (String ticker : tickers.split(",")) {
            try {
                String url = "https://brapi.dev/api/quote/" + ticker.trim() + "?token=" + token;
                Object resultado = restTemplate.getForObject(url, Object.class);
                resultados.add(resultado);
            } catch (Exception e) {
                // Se um ticker falhar, continua para o próximo
            }
        }

        return resultados;
    }
}