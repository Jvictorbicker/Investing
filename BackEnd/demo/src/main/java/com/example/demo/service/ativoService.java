package com.example.demo.service;

import com.example.demo.model.Ativo;
import com.example.demo.repository.AtivoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
public class ativoService {

    @Value("${brapi.token}")
    private String brapiToken;

    private final RestClient restClient = RestClient.create();

    private final AtivoRepository repo;

    public ativoService(AtivoRepository repo) {
        this.repo = repo;
    }

    public Object buscarCotacao(String tickers) {
        return restClient.get()
                .uri("https://brapi.dev/api/quote/{tickers}?token={token}", tickers, brapiToken)
                .retrieve()
                .body(Object.class);
    }

    public List<Ativo> listar() {
        return repo.findAll();
    }

    public Ativo salvar(Ativo a) {
        return repo.save(a);
    }

    public void deletar(Long id) {
        repo.deleteById(id);
    }
}