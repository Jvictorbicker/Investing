package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ativos")
public class Ativo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ticker;   // ex: PETR4
    private int quantidade;  // ex: 2

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public int getQuantidade() {
        return quantidade; }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }
}