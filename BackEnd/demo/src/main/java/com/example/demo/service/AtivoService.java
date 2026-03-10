package com.example.demo.service;

import com.example.demo.model.Ativo;
import com.example.demo.repository.AtivoRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AtivoService {

    private final AtivoRepository repo;

    public AtivoService(AtivoRepository repo) {
        this.repo = repo;
    }

    public List<Ativo> listar() { return repo.findAll(); }
    public Ativo salvar(Ativo a) { return repo.save(a); }
    public void deletar(Long id) { repo.deleteById(id); }
}