package com.example.demo.controller;

import com.example.demo.model.Ativo;
import com.example.demo.service.ativoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ativos")
@CrossOrigin(origins = "*")
public class AtivoController {

    private final ativoService service;

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

    @GetMapping("/cotacao/{ticker}")
    public ResponseEntity<?> getCotacao(@PathVariable String ticker) {
        return ResponseEntity.ok(service.buscarCotacao(ticker));
    }
}